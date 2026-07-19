import { expect, test } from "bun:test"
import { getWorkspaceFileSetKey } from "../../src/monaco/workspaceReadiness"

test("getWorkspaceFileSetKey changes the model-set key when a relative module arrives", () => {
  const partial = [{ path: "index.tsx" }]
  const complete = [...partial, { path: "MPL3115A2R1.tsx" }]

  expect(getWorkspaceFileSetKey(complete)).not.toBe(
    getWorkspaceFileSetKey(partial),
  )
})
