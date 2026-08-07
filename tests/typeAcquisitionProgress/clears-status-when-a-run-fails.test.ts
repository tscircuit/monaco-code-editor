import { expect, test } from "bun:test"
import { createTypeAcquisitionProgressStore } from "../../src/monaco/typeAcquisitionProgress"

test("a failed run clears the status instead of leaving the indicator spinning", async () => {
  const store = createTypeAcquisitionProgressStore()

  store.reportStarted()
  const tracked = store.track(Promise.reject(new Error("registry offline")))

  await expect(tracked).rejects.toThrow("registry offline")
  expect(store.getSnapshot().isDownloading).toBe(false)
})
