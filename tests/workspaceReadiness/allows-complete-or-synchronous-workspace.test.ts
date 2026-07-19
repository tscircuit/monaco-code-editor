import { expect, test } from "bun:test"
import { isWorkspaceLoadPending } from "../../src/monaco/workspaceReadiness"

test("isWorkspaceLoadPending allows a complete or synchronously supplied workspace", () => {
  expect(isWorkspaceLoadPending({ isLoadingFiles: false })).toBe(false)
  expect(isWorkspaceLoadPending({})).toBe(false)
})
