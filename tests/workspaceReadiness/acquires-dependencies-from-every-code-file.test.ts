import { expect, test } from "bun:test"
import { getWorkspaceTypeAcquisitionSource } from "../../src/monaco/workspaceReadiness"

test("getWorkspaceTypeAcquisitionSource acquires dependencies imported by every code file", () => {
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
