import { expect, test } from "bun:test"
import { getQuickOpenMatches } from "../../src/utils/quickOpen"
import { quickOpenWorkspaceFiles } from "../fixtures/quickOpenFixtures"

test("getQuickOpenMatches keeps the active file first when the query is empty", () => {
  const matches = getQuickOpenMatches(quickOpenWorkspaceFiles, "", "README.md")

  expect(matches[0]?.file.path).toBe("README.md")
})
