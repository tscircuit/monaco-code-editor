import { expect, test } from "bun:test"
import { getCurrentFolderPath } from "../../src/utils/fileSidebarPaths"

test("getCurrentFolderPath derives the parent folder from a nested relative file", () => {
  expect(getCurrentFolderPath(null, "src/components/Button.tsx")).toBe(
    "src/components",
  )
})
