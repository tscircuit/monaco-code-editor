import { describe, expect, test } from "bun:test"
import { BookOpen, Braces, Code2, File } from "lucide-react"
import {
  getFileIconClassName,
  getFileIconComponent,
} from "../src/utils/getFileIcon"

describe("getFileIconComponent", () => {
  test("uses code icons for TypeScript and JavaScript files", () => {
    const tsxIcon = getFileIconComponent("index.tsx")
    const jsIcon = getFileIconComponent("main.js")

    expect(tsxIcon).toBe(Code2)
    expect(jsIcon).toBe(Code2)
  })

  test("uses braces icons for json files", () => {
    const icon = getFileIconComponent("manual-edits.json")

    expect(icon).toBe(Braces)
  })

  test("uses book icons for markdown files", () => {
    const icon = getFileIconComponent("README.md")

    expect(icon).toBe(BookOpen)
  })

  test("falls back to the generic file icon", () => {
    const icon = getFileIconComponent("archive.zip")

    expect(icon).toBe(File)
  })

  test("returns extension-specific icon classes", () => {
    expect(getFileIconClassName("index.tsx")).toContain("text-blue-500")
    expect(getFileIconClassName("manual-edits.json")).toContain(
      "text-yellow-500",
    )
    expect(getFileIconClassName("README.md")).toContain("text-slate-500")
    expect(getFileIconClassName("archive.zip")).toContain("text-slate-500")
  })
})
