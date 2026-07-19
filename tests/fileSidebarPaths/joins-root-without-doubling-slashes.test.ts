import { expect, test } from "bun:test"
import { constructFilePath } from "../../src/utils/fileSidebarPaths"

test("constructFilePath joins onto the absolute root folder without doubling slashes", () => {
  expect(constructFilePath("index.ts", "/")).toBe("/index.ts")
  expect(constructFilePath("index.ts", "/src/")).toBe("/src/index.ts")
})
