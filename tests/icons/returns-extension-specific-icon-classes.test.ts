import { expect, test } from "bun:test"
import { getFileIconClassName } from "../../src/utils/icons"

test("getFileIconClassName returns extension-specific icon classes", () => {
  expect(getFileIconClassName("index.tsx")).toContain("text-blue-500")
  expect(getFileIconClassName("manual-edits.json")).toContain("text-yellow-500")
  expect(getFileIconClassName("README.md")).toContain("text-slate-500")
  expect(getFileIconClassName("archive.zip")).toContain("text-slate-500")
})
