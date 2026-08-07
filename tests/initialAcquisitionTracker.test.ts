import { expect, test } from "bun:test"
import { createInitialAcquisitionTracker } from "../src/hooks/initialAcquisitionTracker"

test("waits for an older initial acquisition after a newer one settles", () => {
  const tracker = createInitialAcquisitionTracker()
  const first = tracker.begin()
  first.markStarted()
  first.cancel()
  const second = tracker.begin()
  second.markStarted()

  expect(second.settle()).toBe(false)
  expect(tracker.hasPending()).toBe(true)
  expect(first.settle()).toBe(true)
  expect(tracker.hasPending()).toBe(false)
})

test("cancelling a timer run does not complete the initial acquisition", () => {
  const tracker = createInitialAcquisitionTracker()
  const run = tracker.begin()

  run.cancel()

  expect(tracker.hasPending()).toBe(false)
  expect(run.settle()).toBe(false)
})
