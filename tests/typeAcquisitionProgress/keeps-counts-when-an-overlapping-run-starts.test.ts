import { expect, test } from "bun:test"
import { createTypeAcquisitionProgressStore } from "../../src/monaco/typeAcquisitionProgress"
import { createDeferred } from "../fixtures/deferred"

test("a later run starting does not rewind the counts of a run still fetching", async () => {
  const store = createTypeAcquisitionProgressStore()
  const firstAcquisition = createDeferred()
  const first = store.track(firstAcquisition.promise)

  store.reportStarted()
  store.reportProgress(40, 50)

  // Typing re-triggers acquisition; the new run resets acquisition's shared
  // counters, so its "started" must not drag the visible progress backwards.
  const second = store.track(Promise.resolve())
  store.reportStarted()

  expect(store.getSnapshot()).toEqual({
    isDownloading: true,
    downloadedCount: 40,
    estimatedTotalCount: 50,
  })

  await second
  firstAcquisition.resolve()
  await first
  expect(store.getSnapshot().isDownloading).toBe(false)
})
