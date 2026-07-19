import { expect, test } from "bun:test"
import { expandWorkspaceReplacement } from "../../src/utils/workspaceSearch"

test("expandWorkspaceReplacement expands capture groups and escaped replacement tokens", () => {
  expect(
    expandWorkspaceReplacement({
      replacement: "$2, $1 costs $$5 ($&)",
      match: {
        matchText: "Ada Lovelace",
        captures: ["Ada Lovelace", "Ada", "Lovelace"],
      },
    }),
  ).toBe("Lovelace, Ada costs $5 (Ada Lovelace)")
})
