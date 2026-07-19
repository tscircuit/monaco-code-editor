import { expect, test } from "bun:test"
import { buildFileTree } from "../../src/utils/build-file-tree"

test("buildFileTree nests paths into directories and files", () => {
  const tree = buildFileTree(["lib/constants.ts", "index.tsx"])

  expect(tree).toEqual([
    {
      name: "lib",
      path: "lib",
      children: [{ name: "constants.ts", path: "lib/constants.ts" }],
    },
    { name: "index.tsx", path: "index.tsx" },
  ])
})
