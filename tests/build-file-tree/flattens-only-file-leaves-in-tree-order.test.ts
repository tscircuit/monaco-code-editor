import { expect, test } from "bun:test"
import { buildFileTree, collectFiles } from "../../src/utils/build-file-tree"

test("collectFiles flattens only file leaves, in tree order", () => {
  const tree = buildFileTree([
    "lib/footprints/cap.ts",
    "lib/constants.ts",
    "index.tsx",
  ])

  expect(collectFiles(tree).map((node) => node.path)).toEqual([
    "lib/footprints/cap.ts",
    "lib/constants.ts",
    "index.tsx",
  ])
})
