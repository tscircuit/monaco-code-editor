import { expect, test } from "bun:test"
import { createTsciPackageFetcher } from "../../src/monaco/tsciPackageSupport"
import { createRecordingFetchFn } from "../fixtures/tsciPackageSupportFixtures"

test("createTsciPackageFetcher passes non-jsdelivr URLs through untouched", async () => {
  const { calls, fetchFn } = createRecordingFetchFn()
  const fetcher = createTsciPackageFetcher({ fetchFn })

  await fetcher("https://example.com/whatever")

  expect(calls).toEqual(["https://example.com/whatever"])
})
