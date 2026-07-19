import { expect, test } from "bun:test"
import { getQuickOpenMatches } from "../../src/utils/quickOpen"
import { quickOpenWorkspaceFiles } from "../fixtures/quickOpenFixtures"

test("getQuickOpenMatches supports ordered fuzzy matching", () => {
  const matches = getQuickOpenMatches(
    quickOpenWorkspaceFiles,
    "prst",
    "index.tsx",
  )

  expect(matches[0]?.file.path).toBe("lib/print-settings.ts")
  expect(matches[0]?.matchedIndices).toHaveLength(4)
})
