import { expect, test } from "bun:test"
import { createTsciPackageFetcher } from "../../src/monaco/tsciPackageSupport"
import { createRecordingFetchFn } from "../fixtures/tsciPackageSupportFixtures"

test("createTsciPackageFetcher uses a custom registry URL", async () => {
  const { calls, fetchFn } = createRecordingFetchFn()
  const fetcher = createTsciPackageFetcher({
    fetchFn,
    registryApiUrl: "https://example.com/api",
  })

  await fetcher(
    "https://data.jsdelivr.com/v1/package/resolve/npm/@tsci/seveibar.red-led",
  )

  expect(calls).toEqual([
    `https://example.com/api/snippets/download?jsdelivr_resolve=true&jsdelivr_path=${encodeURIComponent("seveibar/red-led")}`,
  ])
})
