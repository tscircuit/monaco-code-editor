import { expect, test } from "bun:test"
import { buildFileTree } from "../../src/utils/build-file-tree"

test("buildFileTree returns an empty tree for no paths", () => {
  expect(buildFileTree([])).toEqual([])
})
