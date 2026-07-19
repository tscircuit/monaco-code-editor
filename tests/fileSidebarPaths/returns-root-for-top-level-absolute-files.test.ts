import { expect, test } from "bun:test"
import { getCurrentFolderPath } from "../../src/utils/fileSidebarPaths"

test("getCurrentFolderPath returns the root folder for top-level absolute files", () => {
  expect(getCurrentFolderPath(null, "/index.ts")).toBe("/")
})
