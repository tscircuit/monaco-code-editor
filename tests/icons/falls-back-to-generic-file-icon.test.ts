import { expect, test } from "bun:test"
import { File } from "lucide-react"
import { getFileIconComponent } from "../../src/utils/icons"

test("getFileIconComponent falls back to the generic file icon", () => {
  const icon = getFileIconComponent("archive.zip")

  expect(icon).toBe(File)
})
