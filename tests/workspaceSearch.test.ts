import { describe, expect, test } from "bun:test"
import type * as monaco from "monaco-editor"
import {
  DEFAULT_WORD_SEPARATORS,
  createWorkspaceReplacementEdits,
  expandWorkspaceReplacement,
  searchWorkspaceModels,
  validateWorkspaceSearch,
  type WorkspaceSearchModel,
} from "../src/utils/workspaceSearch"

const range = (
  startLineNumber: number,
  startColumn: number,
  endColumn: number,
): monaco.IRange => ({
  startLineNumber,
  startColumn,
  endLineNumber: startLineNumber,
  endColumn,
})

function createSearchModel(
  content: string,
  matches: Array<{
    range: monaco.IRange
    matches: string[] | null
  }>,
  onFind?: (...args: unknown[]) => void,
): WorkspaceSearchModel {
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

describe("workspace search", () => {
  test("uses Monaco ranges and excludes hidden and binary files", () => {
    const findArguments: unknown[][] = []
    const models = new Map<string, WorkspaceSearchModel>([
      [
        "src/index.ts",
        createSearchModel(
          "const board = true",
          [{ range: range(1, 7, 12), matches: ["board"] }],
          (...args) => findArguments.push(args),
        ),
      ],
      [
        "node_modules/pkg/index.ts",
        createSearchModel("board", [
          { range: range(1, 1, 6), matches: ["board"] },
        ]),
      ],
    ])

    const result = searchWorkspaceModels({
      files: [
        { path: "src/index.ts", content: "const board = true" },
        { path: "node_modules/pkg/index.ts", content: "board" },
        { path: "image.png", content: "board", isBinary: true },
      ],
      getModel: (path) => models.get(path),
      options: {
        query: "board",
        matchCase: true,
        wholeWord: true,
        useRegex: false,
      },
    })

    expect(result.totalMatches).toBe(1)
    expect(result.files[0]?.file.path).toBe("src/index.ts")
    expect(result.files[0]?.matches[0]?.range.startColumn).toBe(7)
    expect(findArguments[0]?.slice(0, 6)).toEqual([
      "board",
      false,
      false,
      true,
      DEFAULT_WORD_SEPARATORS,
      true,
    ])
  })

  test("reports invalid regular expressions without searching models", () => {
    expect(
      validateWorkspaceSearch({
        query: "(",
        matchCase: false,
        wholeWord: false,
        useRegex: true,
      }),
    ).toContain("regular expression")
  })

  test("expands capture groups and escaped replacement tokens", () => {
    expect(
      expandWorkspaceReplacement({
        replacement: "$2, $1 costs $$5 ($&)",
        match: {
          matchText: "Ada Lovelace",
          captures: ["Ada Lovelace", "Ada", "Lovelace"],
        },
      }),
    ).toBe("Lovelace, Ada costs $5 (Ada Lovelace)")
  })

  test("creates immutable regex replacement edits for Monaco", () => {
    const content = "pin A1 connects"
    const matchRange = range(1, 5, 7)
    const model = {
      getValue: () => content,
      getValueInRange: () => "A1",
      getOffsetAt: ({ column }: monaco.IPosition) => column - 1,
    }

    const edits = createWorkspaceReplacementEdits({
      model,
      matches: [
        {
          path: "index.tsx",
          range: matchRange,
          matchText: "A1",
          captures: ["A1", "A", "1"],
          linePreview: content,
        },
      ],
      replacement: "$1-$2",
      useRegex: true,
    })

    expect(edits).toEqual([
      { range: matchRange, text: "A-1", forceMoveMarkers: true },
    ])
    expect(content).toBe("pin A1 connects")
  })
})
