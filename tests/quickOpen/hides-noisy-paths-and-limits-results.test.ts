import { expect, test } from "bun:test"
import { getQuickOpenMatches } from "../../src/utils/quickOpen"
import { quickOpenWorkspaceFiles } from "../fixtures/quickOpenFixtures"

test("getQuickOpenMatches hides noisy paths and limits results", () => {
  const matches = getQuickOpenMatches(
    quickOpenWorkspaceFiles,
    "",
    "index.tsx",
    2,
  )

  expect(matches).toHaveLength(2)
  expect(
    matches.some((match) => match.file.path.includes("node_modules")),
  ).toBe(false)
})
