import { expect, test } from "bun:test"
import { createTsciPackageFetcher } from "../../src/monaco/tsciPackageSupport"
import {
  createRecordingFetchFn,
  registry,
} from "../fixtures/tsciPackageSupportFixtures"

test("createTsciPackageFetcher rewrites @tsci jsdelivr URLs to the registry", async () => {
  const { calls, fetchFn } = createRecordingFetchFn()
  const fetcher = createTsciPackageFetcher({ fetchFn })

  await fetcher(
    "https://cdn.jsdelivr.net/npm/@tsci/seveibar.red-led@0.0.1/index.d.ts",
  )

  expect(calls).toEqual([
    `${registry}/snippets/download?jsdelivr_resolve=false&jsdelivr_path=${encodeURIComponent("seveibar/red-led@0.0.1/index.d.ts")}`,
  ])
})
