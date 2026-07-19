import { expect, test } from "bun:test"
import { getCurrentFolderPath } from "../../src/utils/fileSidebarPaths"

test("getCurrentFolderPath prefers the explicit folder selection", () => {
  expect(getCurrentFolderPath("/src/components", "src/index.ts")).toBe(
    "/src/components",
  )
})
