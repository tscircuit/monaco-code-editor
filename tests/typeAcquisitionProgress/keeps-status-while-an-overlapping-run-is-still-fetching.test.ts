import { expect, test } from "bun:test"
import { createTypeAcquisitionProgressStore } from "../../src/monaco/typeAcquisitionProgress"
import { createDeferred } from "../fixtures/deferred"

test("an earlier run finishing does not clear the status while a later run is still fetching", async () => {
  const store = createTypeAcquisitionProgressStore()
  const secondAcquisition = createDeferred()

  // Typing re-triggers acquisition, so two runs share one set of counters.
  const first = store.track(Promise.resolve())
  const tracked = store.track(secondAcquisition.promise)
  store.reportStarted()
  store.reportFinished()

  expect(store.getSnapshot().isDownloading).toBe(true)

  await first
  expect(store.getSnapshot().isDownloading).toBe(true)

  secondAcquisition.resolve()
  await tracked
  expect(store.getSnapshot().isDownloading).toBe(false)
})
