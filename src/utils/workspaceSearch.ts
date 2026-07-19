import type * as monaco from "monaco-editor"
import type { EditorFile } from "../components/WorkspaceCodeEditor"
import { isHiddenFile } from "./isHiddenFile"

export const DEFAULT_WORD_SEPARATORS = "`~!@#$%^&*()-=+[{]}\\|;:'\",.<>/?"

export type WorkspaceSearchOptions = {
  query: string
  matchCase: boolean
  wholeWord: boolean
  useRegex: boolean
}

export type WorkspaceSearchMatch = {
  path: string
  range: monaco.IRange
  matchText: string
  captures: readonly string[] | null
  linePreview: string
}

export type WorkspaceSearchFileResult = {
  file: EditorFile
  matches: WorkspaceSearchMatch[]
}

export type WorkspaceSearchResult = {
  files: WorkspaceSearchFileResult[]
  totalMatches: number
  limitReached: boolean
  error: string | null
}

export type WorkspaceSearchModel = Pick<
  monaco.editor.ITextModel,
  "findMatches" | "getLineContent" | "getValueInRange"
>

const emptyResult = (error: string | null = null): WorkspaceSearchResult => ({
  files: [],
  totalMatches: 0,
  limitReached: false,
  error,
})

export function validateWorkspaceSearch(options: WorkspaceSearchOptions) {
  if (!options.query || !options.useRegex) return null

  try {
    new RegExp(options.query, options.matchCase ? "" : "i")
    return null
  } catch (error) {
    return error instanceof Error ? error.message : "Invalid regular expression"
  }
}

export function searchWorkspaceModels({
  files,
  getModel,
  options,
  limit = 10_000,
}: {
  files: EditorFile[]
  getModel: (path: string) => WorkspaceSearchModel | undefined
  options: WorkspaceSearchOptions
  limit?: number
}): WorkspaceSearchResult {
  if (!options.query) return emptyResult()

  const error = validateWorkspaceSearch(options)
  if (error) return emptyResult(error)

  const results: WorkspaceSearchFileResult[] = []
  let totalMatches = 0
  let limitReached = false

  for (const file of files) {
    if (file.isBinary || isHiddenFile(file.path)) continue

    const model = getModel(file.path)
    if (!model) continue

    const remaining = Math.max(0, limit - totalMatches)
    if (remaining === 0) {
      limitReached = true
      break
    }

    const modelMatches = model.findMatches(
      options.query,
      false,
      options.useRegex,
      options.matchCase,
      options.wholeWord ? DEFAULT_WORD_SEPARATORS : null,
      true,
      remaining + 1,
    )

    if (modelMatches.length > remaining) {
      limitReached = true
      modelMatches.length = remaining
    }

    if (modelMatches.length === 0) continue

    const matches = modelMatches.map((match) => ({
      path: file.path,
      range: match.range,
      matchText: model.getValueInRange(match.range),
      captures: match.matches,
      linePreview: model.getLineContent(match.range.startLineNumber),
    }))

    totalMatches += matches.length
    results.push({ file, matches })
  }

  return { files: results, totalMatches, limitReached, error: null }
}

function getCapture(
  captures: readonly string[],
  captureReference: string,
): string | null {
  const captureIndex = Number(captureReference)
  if (captureIndex > 0 && captureIndex < captures.length) {
    return captures[captureIndex] ?? ""
  }

  if (captureReference.length === 2) {
    const firstDigit = Number(captureReference[0])
    if (firstDigit > 0 && firstDigit < captures.length) {
      return `${captures[firstDigit] ?? ""}${captureReference[1]}`
    }
  }

  return null
}

/** Expand JavaScript-style replacement tokens using Monaco's captured groups. */
export function expandWorkspaceReplacement({
  replacement,
  match,
  beforeMatch = "",
  afterMatch = "",
}: {
  replacement: string
  match: Pick<WorkspaceSearchMatch, "matchText" | "captures">
  beforeMatch?: string
  afterMatch?: string
}) {
  const captures = match.captures ?? [match.matchText]

  return replacement.replace(/\$(\$|&|`|'|\d{1,2})/g, (token, reference) => {
    if (reference === "$") return "$"
    if (reference === "&") return match.matchText
    if (reference === "`") return beforeMatch
    if (reference === "'") return afterMatch

    return getCapture(captures, reference) ?? token
  })
}

export type WorkspaceReplacementModel = Pick<
  monaco.editor.ITextModel,
  | "getOffsetAt"
  | "getValue"
  | "getValueInRange"
  | "pushStackElement"
  | "pushEditOperations"
>

/**
 * Apply replacement matches across workspace models as one undoable edit per
 * file. The mounted editor reports active-model changes through its onChange;
 * inactive models notify the controlled host through onHiddenModelEdit.
 */
export function applyWorkspaceReplacements({
  matches,
  replacement,
  useRegex,
  getModel,
  isActiveModel,
  onHiddenModelEdit,
}: {
  matches: WorkspaceSearchMatch[]
  replacement: string
  useRegex: boolean
  getModel: (path: string) => WorkspaceReplacementModel | undefined
  isActiveModel: (model: WorkspaceReplacementModel) => boolean
  onHiddenModelEdit: (path: string, content: string) => void
}) {
  const matchesByPath = new Map<string, WorkspaceSearchMatch[]>()
  for (const match of matches) {
    const pathMatches = matchesByPath.get(match.path) ?? []
    pathMatches.push(match)
    matchesByPath.set(match.path, pathMatches)
  }

  for (const [path, pathMatches] of matchesByPath) {
    const model = getModel(path)
    if (!model) continue

    const edits = createWorkspaceReplacementEdits({
      model,
      matches: pathMatches,
      replacement,
      useRegex,
    })
    if (edits.length === 0) continue

    model.pushStackElement()
    model.pushEditOperations(null, edits, () => null)
    model.pushStackElement()

    if (!isActiveModel(model)) {
      onHiddenModelEdit(path, model.getValue())
    }
  }
}

export function createWorkspaceReplacementEdits({
  model,
  matches,
  replacement,
  useRegex,
}: {
  model: Pick<
    monaco.editor.ITextModel,
    "getOffsetAt" | "getValue" | "getValueInRange"
  >
  matches: WorkspaceSearchMatch[]
  replacement: string
  useRegex: boolean
}): monaco.editor.IIdentifiedSingleEditOperation[] {
  const content = model.getValue()

  return matches.map((match) => {
    const startOffset = model.getOffsetAt({
      lineNumber: match.range.startLineNumber,
      column: match.range.startColumn,
    })
    const endOffset = model.getOffsetAt({
      lineNumber: match.range.endLineNumber,
      column: match.range.endColumn,
    })

    return {
      range: match.range,
      text: useRegex
        ? expandWorkspaceReplacement({
            replacement,
            match,
            beforeMatch: content.slice(0, startOffset),
            afterMatch: content.slice(endOffset),
          })
        : replacement,
      forceMoveMarkers: true,
    }
  })
}
