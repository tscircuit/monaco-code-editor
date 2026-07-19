import { expect, test } from "bun:test"
import { constructFilePath } from "../../src/utils/fileSidebarPaths"

test("constructFilePath rejects empty file names", () => {
  expect(constructFilePath("  ", "src")).toBe("")
})
