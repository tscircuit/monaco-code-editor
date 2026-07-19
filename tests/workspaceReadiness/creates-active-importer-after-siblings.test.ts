import { expect, test } from "bun:test"
import { orderWorkspaceFilesForModelCreation } from "../../src/monaco/workspaceReadiness"

test("orderWorkspaceFilesForModelCreation creates the active importer after its sibling models", () => {
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
