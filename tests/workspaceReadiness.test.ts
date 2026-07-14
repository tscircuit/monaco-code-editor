import { describe, expect, test } from "bun:test"
import {
  getWorkspaceFileSetKey,
  getWorkspaceTypeAcquisitionSource,
  isWorkspaceLoadPending,
  orderWorkspaceFilesForModelCreation,
} from "../src/monaco/workspaceReadiness"

describe("isWorkspaceLoadPending", () => {
  test("keeps workspace preparation gated while files are loading", () => {
    expect(isWorkspaceLoadPending({ isLoadingFiles: true })).toBe(true)
  })

  test("allows a complete or synchronously supplied workspace", () => {
    expect(isWorkspaceLoadPending({ isLoadingFiles: false })).toBe(false)
    expect(isWorkspaceLoadPending({})).toBe(false)
  })
})

describe("workspace preparation", () => {
  test("changes the model-set key when a relative module arrives", () => {
    const partial = [{ path: "index.tsx" }]
    const complete = [...partial, { path: "MPL3115A2R1.tsx" }]

    expect(getWorkspaceFileSetKey(complete)).not.toBe(
      getWorkspaceFileSetKey(partial),
    )
  })

  test("acquires dependencies imported by every code file", () => {
    const source = getWorkspaceTypeAcquisitionSource([
      { path: "index.tsx", content: 'import "./MPL3115A2R1"' },
      {
        path: "MPL3115A2R1.tsx",
        content: 'import type { ChipProps } from "@tscircuit/props"',
      },
      { path: "manual-edits.json", content: "{}" },
    ])

    expect(source).toContain('import "./MPL3115A2R1"')
    expect(source).toContain('from "@tscircuit/props"')
    expect(source).not.toContain("manual-edits.json")
  })

  test("creates the active importer after its sibling models", () => {
    const orderedFiles = orderWorkspaceFilesForModelCreation(
      [
        { path: "index.tsx", content: 'import "./MPL3115A2R1"' },
        { path: "MPL3115A2R1.tsx", content: "export const sensor = {}" },
        { path: "manual-edits.json", content: "{}" },
      ],
      "index.tsx",
    )

    expect(orderedFiles.map((file) => file.path)).toEqual([
      "MPL3115A2R1.tsx",
      "manual-edits.json",
      "index.tsx",
    ])
  })
})
