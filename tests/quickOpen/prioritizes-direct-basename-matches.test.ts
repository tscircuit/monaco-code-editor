import { expect, test } from "bun:test"
import { getQuickOpenMatches } from "../../src/utils/quickOpen"
import { quickOpenWorkspaceFiles } from "../fixtures/quickOpenFixtures"

test("getQuickOpenMatches prioritizes direct basename matches", () => {
  const matches = getQuickOpenMatches(
    quickOpenWorkspaceFiles,
    "pressure",
    "index.tsx",
  )

  expect(matches.map((match) => match.file.path)).toEqual([
    "imports/PressureSensor.tsx",
  ])
})
