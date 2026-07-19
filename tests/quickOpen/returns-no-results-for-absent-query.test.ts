import { expect, test } from "bun:test"
import { getQuickOpenMatches } from "../../src/utils/quickOpen"
import { quickOpenWorkspaceFiles } from "../fixtures/quickOpenFixtures"

test("getQuickOpenMatches returns no results when the query is absent", () => {
  expect(getQuickOpenMatches(quickOpenWorkspaceFiles, "zzzz", null)).toEqual([])
})
