import type * as monaco from "monaco-editor"
import type {
  WorkspaceReplacementModel,
  WorkspaceSearchMatch,
  WorkspaceSearchModel,
} from "../../src/utils/workspaceSearch"

export function createSingleLineRange({
  startLineNumber,
  startColumn,
  endColumn,
}: {
  startLineNumber: number
  startColumn: number
  endColumn: number
}): monaco.IRange {
  return {
    startLineNumber,
    startColumn,
    endLineNumber: startLineNumber,
    endColumn,
  }
}

export function createSearchModel({
  content,
  matches,
  onFind,
}: {
  content: string
  matches: Array<{
    range: monaco.IRange
    matches: string[] | null
  }>
  onFind?: (...args: unknown[]) => void
}): WorkspaceSearchModel {
  const lines = content.split("\n")
  return {
    findMatches: ((...args: unknown[]) => {
      onFind?.(...args)
      return matches
    }) as WorkspaceSearchModel["findMatches"],
    getLineContent: (lineNumber) => lines[lineNumber - 1] ?? "",
    getValueInRange: (matchRange) => {
      const line = lines[matchRange.startLineNumber - 1] ?? ""
      return line.slice(matchRange.startColumn - 1, matchRange.endColumn - 1)
    },
  }
}

export function createSearchMatch({
  path,
  startColumn,
  endColumn,
  matchText,
}: {
  path: string
  startColumn: number
  endColumn: number
  matchText: string
}): WorkspaceSearchMatch {
  return {
    path,
    range: createSingleLineRange({
      startLineNumber: 1,
      startColumn,
      endColumn,
    }),
    matchText,
    captures: null,
    linePreview: "",
  }
}

export function createReplacementModel(initialContent: string) {
  let content = initialContent
  let stackElements = 0
  let editOperations = 0

  const model: WorkspaceReplacementModel = {
    getValue: () => content,
    getValueInRange: (matchRange) =>
      content.slice(matchRange.startColumn - 1, matchRange.endColumn - 1),
    getOffsetAt: ({ column }) => column - 1,
    pushStackElement: () => {
      stackElements += 1
    },
    pushEditOperations: ((
      _beforeCursorState: unknown,
      edits: monaco.editor.IIdentifiedSingleEditOperation[],
    ) => {
      editOperations += 1
      const sorted = [...edits].sort(
        (a, b) => b.range.startColumn - a.range.startColumn,
      )
      for (const edit of sorted) {
        content =
          content.slice(0, edit.range.startColumn - 1) +
          (edit.text ?? "") +
          content.slice(edit.range.endColumn - 1)
      }
      return null
    }) as WorkspaceReplacementModel["pushEditOperations"],
  }

  return {
    model,
    getContent: () => content,
    stackElementCount: () => stackElements,
    editOperationCount: () => editOperations,
  }
}
