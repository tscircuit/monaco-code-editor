import { expect, test } from "bun:test"
import { isWorkspaceLoadPending } from "../../src/monaco/workspaceReadiness"

test("isWorkspaceLoadPending keeps workspace preparation gated while files are loading", () => {
  expect(isWorkspaceLoadPending({ isLoadingFiles: true })).toBe(true)
})
