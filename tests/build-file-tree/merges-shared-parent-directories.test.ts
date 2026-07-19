import { expect, test } from "bun:test"
import { buildFileTree } from "../../src/utils/build-file-tree"

test("buildFileTree merges shared parent directories", () => {
  const tree = buildFileTree(["lib/a.ts", "lib/sub/b.ts"])

  expect(tree).toHaveLength(1)
  expect(tree[0]?.children?.map((node) => node.name)).toEqual(["sub", "a.ts"])
})
