import { expect, test } from "bun:test"
import { Braces } from "lucide-react"
import { getFileIconComponent } from "../../src/utils/icons"

test("getFileIconComponent uses braces icons for json files", () => {
  const icon = getFileIconComponent("manual-edits.json")

  expect(icon).toBe(Braces)
})
