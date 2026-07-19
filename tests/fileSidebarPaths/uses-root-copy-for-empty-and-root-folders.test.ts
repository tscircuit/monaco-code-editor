import { expect, test } from "bun:test"
import { getFolderPlaceholder } from "../../src/utils/fileSidebarPaths"

test("getFolderPlaceholder uses the root copy for empty and root folders", () => {
  expect(getFolderPlaceholder("")).toBe("Enter file name (root folder)")
  expect(getFolderPlaceholder("/")).toBe("Enter file name (root folder)")
})
