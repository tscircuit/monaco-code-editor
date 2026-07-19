import { expect, test } from "bun:test"
import { createTsciPackageFetcher } from "../../src/monaco/tsciPackageSupport"
import { createRecordingFetchFn } from "../fixtures/tsciPackageSupportFixtures"

test("createTsciPackageFetcher does not intercept non-GET requests", async () => {
  const { calls, fetchFn } = createRecordingFetchFn()
  const fetcher = createTsciPackageFetcher({ fetchFn })
  const url =
    "https://cdn.jsdelivr.net/npm/@tsci/seveibar.red-led@0.0.1/index.d.ts"

  await fetcher(url, { method: "POST" })

  expect(calls).toEqual([url])
})
