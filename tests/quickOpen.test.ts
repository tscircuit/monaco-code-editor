import { describe, expect, test } from "bun:test"
import { getQuickOpenMatches } from "../src/utils/quickOpen"

const files = [
  { path: "index.tsx", content: "" },
  { path: "imports/PressureSensor.tsx", content: "" },
  { path: "lib/print-settings.ts", content: "" },
  { path: "README.md", content: "" },
  { path: "node_modules/pkg/index.ts", content: "" },
]

describe("getQuickOpenMatches", () => {
  test("prioritizes direct basename matches", () => {
    const matches = getQuickOpenMatches(files, "pressure", "index.tsx")

    expect(matches.map((match) => match.file.path)).toEqual([
      "imports/PressureSensor.tsx",
    ])
  })

  test("supports ordered fuzzy matching", () => {
    const matches = getQuickOpenMatches(files, "prst", "index.tsx")

    expect(matches[0]?.file.path).toBe("lib/print-settings.ts")
    expect(matches[0]?.matchedIndices).toHaveLength(4)
  })

  test("supports space-separated path segments", () => {
    const matches = getQuickOpenMatches(files, "imports sensor", "index.tsx")

    expect(matches[0]?.file.path).toBe("imports/PressureSensor.tsx")
  })

  test("returns no results when the query is absent", () => {
    expect(getQuickOpenMatches(files, "zzzz", null)).toEqual([])
  })

  test("keeps the active file first when the query is empty", () => {
    const matches = getQuickOpenMatches(files, "", "README.md")

    expect(matches[0]?.file.path).toBe("README.md")
  })

  test("hides noisy paths and limits results", () => {
    const matches = getQuickOpenMatches(files, "", "index.tsx", 2)

    expect(matches).toHaveLength(2)
    expect(
      matches.some((match) => match.file.path.includes("node_modules")),
    ).toBe(false)
  })
})
