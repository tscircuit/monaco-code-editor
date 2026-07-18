import { describe, expect, test } from "bun:test"
import { buildFileTree, collectFiles } from "../src/utils/build-file-tree"

describe("buildFileTree", () => {
  test("nests paths into directories and files", () => {
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

  test("sorts directories before files, alphabetically within each group", () => {
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

  test("merges shared parent directories", () => {
    const tree = buildFileTree(["lib/a.ts", "lib/sub/b.ts"])

    expect(tree).toHaveLength(1)
    expect(tree[0]?.children?.map((node) => node.name)).toEqual(["sub", "a.ts"])
  })

  test("returns an empty tree for no paths", () => {
    expect(buildFileTree([])).toEqual([])
  })
})

describe("collectFiles", () => {
  test("flattens only file leaves, in tree order", () => {
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
})
