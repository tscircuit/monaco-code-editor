import { expect, test } from "bun:test"
import {
  DEFAULT_WORD_SEPARATORS,
  searchWorkspaceModels,
  type WorkspaceSearchModel,
} from "../../src/utils/workspaceSearch"
import {
  createSearchModel,
  createSingleLineRange,
} from "../fixtures/workspaceSearchFixtures"

test("searchWorkspaceModels uses Monaco ranges and excludes hidden and binary files", () => {
  const findArguments: unknown[][] = []
  const models = new Map<string, WorkspaceSearchModel>([
    [
      "src/index.ts",
      createSearchModel({
        content: "const board = true",
        matches: [
          {
            range: createSingleLineRange({
              startLineNumber: 1,
              startColumn: 7,
              endColumn: 12,
            }),
            matches: ["board"],
          },
        ],
        onFind: (...args) => findArguments.push(args),
      }),
    ],
    [
      "node_modules/pkg/index.ts",
      createSearchModel({
        content: "board",
        matches: [
          {
            range: createSingleLineRange({
              startLineNumber: 1,
              startColumn: 1,
              endColumn: 6,
            }),
            matches: ["board"],
          },
        ],
      }),
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
