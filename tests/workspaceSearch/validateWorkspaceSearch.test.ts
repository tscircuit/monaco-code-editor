import { expect, test } from "bun:test"
import { validateWorkspaceSearch } from "../../src/utils/workspaceSearch"

test("validateWorkspaceSearch reports invalid regular expressions without searching models", () => {
  expect(
    validateWorkspaceSearch({
      query: "(",
      matchCase: false,
      wholeWord: false,
      useRegex: true,
    }),
  ).toContain("regular expression")
})
