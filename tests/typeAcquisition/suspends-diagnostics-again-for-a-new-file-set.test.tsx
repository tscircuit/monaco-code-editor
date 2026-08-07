import { expect, mock, test } from "bun:test"
import { act, render } from "@testing-library/react"
import { createDeferred } from "../fixtures/deferred"

let suspensionCount = 0
let releaseCount = 0
mock.module("../../src/monaco/monacoTypeScript", () => ({
  suspendSemanticDiagnostics: () => {
    suspensionCount += 1
    return () => {
      releaseCount += 1
    }
  },
}))

let acquisition = createDeferred()
mock.module("../../src/monaco/typeAcquisition", () => ({
  acquireTscircuitTypes: () => {
    acquisition = createDeferred()
    return acquisition.promise
  },
}))

const { useTscircuitTypeAcquisition } = await import(
  "../../src/hooks/useTscircuitTypeAcquisition"
)

function Probe({ readinessKey }: { readinessKey: string }) {
  useTscircuitTypeAcquisition(`// ${readinessKey}`, { readinessKey })
  return null
}

/** Lets the zero-delay acquisition timer and its promise callbacks run. */
const flush = () =>
  act(
    () =>
      new Promise<void>((resolve) => {
        setTimeout(resolve, 5)
      }),
  )

test("loading a different file set suspends diagnostics for its own acquisition", async () => {
  const { rerender, unmount } = render(<Probe readinessKey="workspace-a" />)
  await flush()
  expect(suspensionCount).toBe(1)

  acquisition.resolve()
  await flush()
  expect(releaseCount).toBe(1)

  // The editor is not remounted between workspaces, so the second file set
  // would otherwise download its `@tsci/*` types with errors on show.
  rerender(<Probe readinessKey="workspace-b" />)
  await flush()
  expect(suspensionCount).toBe(2)

  acquisition.resolve()
  await flush()
  expect(releaseCount).toBe(2)

  unmount()
})
