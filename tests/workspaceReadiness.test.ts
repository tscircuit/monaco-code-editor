import { describe, expect, test } from "bun:test"
import {
  getWorkspaceFileSetKey,
  getWorkspaceTypeAcquisitionSource,
  isWorkspaceLoadPending,
} from "../src/monaco/workspaceReadiness"

describe("isWorkspaceLoadPending", () => {
  test("keeps Monaco gated while local or package files are incomplete", () => {
    expect(isWorkspaceLoadPending({ isFullyLoaded: false })).toBe(true)
    expect(isWorkspaceLoadPending({ pkgFilesLoaded: false })).toBe(true)
    expect(
      isWorkspaceLoadPending({ totalFilesCount: 2, loadedFilesCount: 1 }),
    ).toBe(true)
  })

  test("allows a complete or synchronously supplied workspace", () => {
    expect(
      isWorkspaceLoadPending({
        isFullyLoaded: true,
        pkgFilesLoaded: true,
        totalFilesCount: 2,
        loadedFilesCount: 2,
      }),
    ).toBe(false)
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
})
