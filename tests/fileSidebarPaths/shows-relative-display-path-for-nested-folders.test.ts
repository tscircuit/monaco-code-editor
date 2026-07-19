import { expect, test } from "bun:test"
import { getFolderPlaceholder } from "../../src/utils/fileSidebarPaths"

test("getFolderPlaceholder shows a relative display path for nested folders", () => {
  expect(getFolderPlaceholder("/src/components/")).toBe(
    "Enter file name (src/components/)",
  )
})
