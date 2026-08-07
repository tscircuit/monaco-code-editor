import { expect, test } from "bun:test"
import { getWorkspaceCodeFileSetKey } from "../../src/monaco/workspaceReadiness"

test("adding a non-code file leaves the type key alone, so diagnostics stay put", () => {
  const code = [{ path: "index.tsx" }, { path: "lib/board.ts" }]

  // A changed key restarts type acquisition and re-hides semantic errors, which
  // adding a README has no reason to do.
  expect(getWorkspaceCodeFileSetKey([...code, { path: "README.md" }])).toBe(
    getWorkspaceCodeFileSetKey(code),
  )
})
