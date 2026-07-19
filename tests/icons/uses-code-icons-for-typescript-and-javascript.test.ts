import { expect, test } from "bun:test"
import { Code2 } from "lucide-react"
import { getFileIconComponent } from "../../src/utils/icons"

test("getFileIconComponent uses code icons for TypeScript and JavaScript files", () => {
  const tsxIcon = getFileIconComponent("index.tsx")
  const jsIcon = getFileIconComponent("main.js")

  expect(tsxIcon).toBe(Code2)
  expect(jsIcon).toBe(Code2)
})
