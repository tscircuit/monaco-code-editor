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

function Probe({ enabled }: { enabled: boolean }) {
  useTscircuitTypeAcquisition("// workspace", { enabled })
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

test("re-enabling does not wait on the request abandoned by the disable", async () => {
  const { rerender, unmount } = render(<Probe enabled />)
  await flush()
  expect(suspensionCount).toBe(1)
  const abandoned = acquisition

  // Disabling restores diagnostics while the first request is still fetching.
  rerender(<Probe enabled={false} />)
  await flush()
  expect(releaseCount).toBe(1)

  rerender(<Probe enabled />)
  await flush()
  expect(suspensionCount).toBe(2)

  // The abandoned request is still outstanding; it must not hold the new
  // suspension open once the run that replaced it has landed its types.
  acquisition.resolve()
  await flush()
  expect(releaseCount).toBe(2)

  abandoned.resolve()
  unmount()
})
