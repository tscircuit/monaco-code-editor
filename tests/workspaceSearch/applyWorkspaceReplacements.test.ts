import { expect, test } from "bun:test"
import {
  applyWorkspaceReplacements,
  type WorkspaceReplacementModel,
} from "../../src/utils/workspaceSearch"
import {
  createReplacementModel,
  createSearchMatch,
} from "../fixtures/workspaceSearchFixtures"

test("applyWorkspaceReplacements applies grouped undoable edits and notifies hidden models", () => {
  const active = createReplacementModel("net A1")
  const hidden = createReplacementModel("use A1 and A1")
  const models: Record<string, WorkspaceReplacementModel> = {
    "active.tsx": active.model,
    "hidden.tsx": hidden.model,
  }
  const hiddenEdits: Array<[string, string]> = []

  applyWorkspaceReplacements({
    matches: [
      createSearchMatch({
        path: "active.tsx",
        startColumn: 5,
        endColumn: 7,
        matchText: "A1",
      }),
      createSearchMatch({
        path: "hidden.tsx",
        startColumn: 5,
        endColumn: 7,
        matchText: "A1",
      }),
      createSearchMatch({
        path: "hidden.tsx",
        startColumn: 12,
        endColumn: 14,
        matchText: "A1",
      }),
      createSearchMatch({
        path: "missing.tsx",
        startColumn: 1,
        endColumn: 3,
        matchText: "A1",
      }),
    ],
    replacement: "B2",
    useRegex: false,
    getModel: (path) => models[path],
    isActiveModel: (model) => model === active.model,
    onHiddenModelEdit: (path, content) => hiddenEdits.push([path, content]),
  })

  expect(active.getContent()).toBe("net B2")
  expect(hidden.getContent()).toBe("use B2 and B2")
  // The active model's change reaches the host through the editor's
  // onChange, so only the hidden model reports here.
  expect(hiddenEdits).toEqual([["hidden.tsx", "use B2 and B2"]])
  // Undo boundaries around each file's replacement, both matches in one
  // undoable operation.
  expect(active.stackElementCount()).toBe(2)
  expect(hidden.stackElementCount()).toBe(2)
  expect(hidden.editOperationCount()).toBe(1)
})
