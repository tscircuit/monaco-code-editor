import { expect, test } from "bun:test"
import { constructFilePath } from "../../src/utils/fileSidebarPaths"

test("constructFilePath joins a simple file name onto the current folder", () => {
  expect(constructFilePath("Button.tsx", "src/components")).toBe(
    "src/components/Button.tsx",
  )
})
