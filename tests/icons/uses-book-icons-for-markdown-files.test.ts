import { expect, test } from "bun:test"
import { BookOpen } from "lucide-react"
import { getFileIconComponent } from "../../src/utils/icons"

test("getFileIconComponent uses book icons for markdown files", () => {
  const icon = getFileIconComponent("README.md")

  expect(icon).toBe(BookOpen)
})
