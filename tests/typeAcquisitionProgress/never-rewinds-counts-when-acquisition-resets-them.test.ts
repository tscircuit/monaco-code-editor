import { expect, test } from "bun:test"
import { createTypeAcquisitionProgressStore } from "../../src/monaco/typeAcquisitionProgress"

test("an older run's post-reset callback neither rewinds counts nor outruns the total", () => {
  const store = createTypeAcquisitionProgressStore()

  store.reportStarted()
  store.reportProgress(40, 50)
  // A second run resets acquisition's shared counters, so the first run's next
  // callback arrives with numbers below what the toolbar already shows.
  store.reportProgress(5, 30)

  expect(store.getSnapshot()).toEqual({
    isDownloading: true,
    downloadedCount: 40,
    estimatedTotalCount: 50,
  })

  // A batch can also report more downloaded than the estimate knows about.
  store.reportProgress(70, 60)
  expect(store.getSnapshot().downloadedCount).toBe(60)
})
