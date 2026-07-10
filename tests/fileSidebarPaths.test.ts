import { describe, expect, test } from "bun:test"
import {
  constructFilePath,
  getCurrentFolderPath,
  getFolderPlaceholder,
} from "../src/utils/fileSidebarPaths"

describe("getCurrentFolderPath", () => {
  test("prefers the explicit folder selection", () => {
    expect(getCurrentFolderPath("/src/components", "src/index.ts")).toBe(
      "/src/components",
    )
  })

  test("derives the parent folder from a nested relative file", () => {
    expect(getCurrentFolderPath(null, "src/components/Button.tsx")).toBe(
      "src/components",
    )
  })

  test("derives the parent folder from a nested absolute file", () => {
    expect(getCurrentFolderPath(null, "/src/components/Button.tsx")).toBe(
      "/src/components",
    )
  })

  test("returns the root folder for top-level absolute files", () => {
    expect(getCurrentFolderPath(null, "/index.ts")).toBe("/")
  })
})

describe("constructFilePath", () => {
  test("rejects empty file names", () => {
    expect(constructFilePath("  ", "src")).toBe("")
  })

  test("keeps explicit nested paths unchanged", () => {
    expect(constructFilePath("lib/utils.ts", "src")).toBe("lib/utils.ts")
    expect(constructFilePath("/lib/utils.ts", "src")).toBe("/lib/utils.ts")
  })

  test("joins a simple file name onto the current folder", () => {
    expect(constructFilePath("Button.tsx", "src/components")).toBe(
      "src/components/Button.tsx",
    )
  })

  test("joins onto the absolute root folder without doubling slashes", () => {
    expect(constructFilePath("index.ts", "/")).toBe("/index.ts")
    expect(constructFilePath("index.ts", "/src/")).toBe("/src/index.ts")
  })
})

describe("getFolderPlaceholder", () => {
  test("uses the root copy for empty and root folders", () => {
    expect(getFolderPlaceholder("")).toBe("Enter file name (root folder)")
    expect(getFolderPlaceholder("/")).toBe("Enter file name (root folder)")
  })

  test("shows a relative display path for nested folders", () => {
    expect(getFolderPlaceholder("/src/components/")).toBe(
      "Enter file name (src/components/)",
    )
  })
})
