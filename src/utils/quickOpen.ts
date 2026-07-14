import type { EditorFile } from "../components/WorkspaceCodeEditor"
import { isHiddenFile } from "./isHiddenFile"

export type QuickOpenMatch = {
  file: EditorFile
  matchedIndices: number[]
  score: number
}

/** Fuzzy path scoring ported from tscircuit.com's existing Quick Open. */
export function fuzzyMatch(pattern: string, text: string) {
  if (!pattern) return { score: 0, matchedIndices: [] as number[] }

  const normalizedPattern = pattern.toLowerCase().replaceAll(" ", "")
  const normalizedText = text.toLowerCase()
  const matchedIndices: number[] = []
  const segments = pattern.toLowerCase().trim().split(/\s+/)
  const usesSegments = segments.length > 1
  let patternIndex = 0
  let score = 0
  let consecutiveMatches = 0
  let segmentBonus = 0

  if (usesSegments) {
    let segmentIndex = 0
    let currentSegment = segments[0] ?? ""
    let segmentCharacterIndex = 0

    for (
      let textIndex = 0;
      textIndex < normalizedText.length && segmentIndex < segments.length;
      textIndex += 1
    ) {
      const character = normalizedText[textIndex]
      const targetCharacter = currentSegment[segmentCharacterIndex]

      if (character === targetCharacter) {
        matchedIndices.push(textIndex)
        segmentCharacterIndex += 1
        consecutiveMatches += 1
        score += 1 + consecutiveMatches * 0.5

        if (textIndex === 0 || /[/\-_.]/.test(text[textIndex - 1] ?? "")) {
          score += 2
        }

        if (segmentCharacterIndex >= currentSegment.length) {
          segmentIndex += 1
          segmentBonus += 3
          currentSegment = segments[segmentIndex] ?? ""
          segmentCharacterIndex = 0
          consecutiveMatches = 0
        }
      } else if (
        segmentCharacterIndex > 0 &&
        /[/\-_.]/.test(character ?? "") &&
        segmentIndex < segments.length - 1
      ) {
        segmentIndex += 1
        currentSegment = segments[segmentIndex] ?? ""
        segmentCharacterIndex = 0
        consecutiveMatches = 0
        if (character === currentSegment[0]) {
          matchedIndices.push(textIndex)
          segmentCharacterIndex = 1
          score += 2
        }
      } else {
        consecutiveMatches = 0
      }
    }

    if (
      segmentIndex < segments.length ||
      (segmentIndex === segments.length - 1 &&
        segmentCharacterIndex < currentSegment.length)
    ) {
      return null
    }
    score += segmentBonus
  } else {
    for (
      let textIndex = 0;
      textIndex < normalizedText.length &&
      patternIndex < normalizedPattern.length;
      textIndex += 1
    ) {
      if (normalizedText[textIndex] !== normalizedPattern[patternIndex]) {
        consecutiveMatches = 0
        continue
      }

      matchedIndices.push(textIndex)
      patternIndex += 1
      consecutiveMatches += 1
      score += 1 + consecutiveMatches * 0.5

      if (textIndex === 0 || /[/\-_.]/.test(text[textIndex - 1] ?? "")) {
        score += 2
      }
    }

    if (patternIndex !== normalizedPattern.length) return null
  }

  score += Math.max(0, 100 - text.length) * 0.1
  const fileName = text.split("/").pop() ?? text
  if (fileName.toLowerCase().includes(normalizedPattern)) score += 5

  return { score, matchedIndices }
}

export function getQuickOpenMatches(
  files: EditorFile[],
  query: string,
  currentFile: string | null,
  limit = 100,
): QuickOpenMatch[] {
  const normalizedQuery = query.trim()

  return files
    .filter((file) => !isHiddenFile(file.path) || file.path === currentFile)
    .map((file): QuickOpenMatch | null => {
      if (!normalizedQuery) {
        return {
          file,
          matchedIndices: [],
          score: file.path === currentFile ? 1 : 0,
        }
      }

      const match = fuzzyMatch(normalizedQuery, file.path)
      return match ? { file, ...match } : null
    })
    .filter((match): match is QuickOpenMatch => match !== null)
    .sort((a, b) => {
      if (a.file.path === currentFile) return -1
      if (b.file.path === currentFile) return 1
      return (
        b.score - a.score ||
        a.file.path.localeCompare(b.file.path, undefined, {
          sensitivity: "base",
        })
      )
    })
    .slice(0, limit)
}
