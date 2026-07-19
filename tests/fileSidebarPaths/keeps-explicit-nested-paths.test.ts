import { expect, test } from "bun:test"
import { constructFilePath } from "../../src/utils/fileSidebarPaths"

test("constructFilePath keeps explicit nested paths unchanged", () => {
  expect(constructFilePath("lib/utils.ts", "src")).toBe("lib/utils.ts")
  expect(constructFilePath("/lib/utils.ts", "src")).toBe("/lib/utils.ts")
})
