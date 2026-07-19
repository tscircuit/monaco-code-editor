import { expect, test } from "bun:test"
import { buildFileTree } from "../../src/utils/build-file-tree"

test("buildFileTree sorts directories before files, alphabetically within each group", () => {
  const tree = buildFileTree([
    "zebra.ts",
    "alpha.ts",
    "src/b.ts",
    "assets/logo.svg",
  ])

  expect(tree.map((node) => node.name)).toEqual([
    "assets",
    "src",
    "alpha.ts",
    "zebra.ts",
  ])
})
