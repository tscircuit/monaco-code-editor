import { expect, test } from "bun:test"
import type * as monaco from "monaco-editor"
import { createWorkspaceReplacementEdits } from "../../src/utils/workspaceSearch"
import { createSingleLineRange } from "../fixtures/workspaceSearchFixtures"

test("createWorkspaceReplacementEdits creates immutable regex replacement edits for Monaco", () => {
  const content = "pin A1 connects"
  const matchRange = createSingleLineRange({
    startLineNumber: 1,
    startColumn: 5,
    endColumn: 7,
  })
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
