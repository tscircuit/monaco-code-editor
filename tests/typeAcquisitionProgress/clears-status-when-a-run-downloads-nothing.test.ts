import { expect, test } from "bun:test"
import { createTypeAcquisitionProgressStore } from "../../src/monaco/typeAcquisitionProgress"

test("a run that downloads nothing still clears the status, since it reports no finish", async () => {
  const store = createTypeAcquisitionProgressStore()

  store.reportStarted()
  // A fully cached workspace resolves without ever calling `reportFinished`.
  await store.track(Promise.resolve())

  expect(store.getSnapshot().isDownloading).toBe(false)
})
