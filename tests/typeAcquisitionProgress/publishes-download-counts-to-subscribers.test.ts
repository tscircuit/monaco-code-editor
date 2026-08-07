import { expect, test } from "bun:test"
import { createTypeAcquisitionProgressStore } from "../../src/monaco/typeAcquisitionProgress"

test("download counts reach subscribers as dependencies arrive", () => {
  const store = createTypeAcquisitionProgressStore()
  let notifications = 0
  store.subscribe(() => {
    notifications += 1
  })

  store.reportStarted()
  store.reportProgress(5, 12)

  expect(store.getSnapshot()).toEqual({
    isDownloading: true,
    downloadedCount: 5,
    estimatedTotalCount: 12,
  })
  expect(notifications).toBe(2)
})
