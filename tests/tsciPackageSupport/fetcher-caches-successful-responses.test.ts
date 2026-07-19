import { expect, test } from "bun:test"
import { createTsciPackageFetcher } from "../../src/monaco/tsciPackageSupport"
import { createRecordingFetchFn } from "../fixtures/tsciPackageSupportFixtures"

test("createTsciPackageFetcher caches successful responses in memory", async () => {
  const { calls, fetchFn } = createRecordingFetchFn("declare const x: number")
  const fetcher = createTsciPackageFetcher({ fetchFn })
  const url =
    "https://cdn.jsdelivr.net/npm/@tsci/seveibar.red-led@0.0.1/index.d.ts"

  const first = await fetcher(url)
  const second = await fetcher(url)

  expect(calls).toHaveLength(1)
  expect(await first.text()).toBe("declare const x: number")
  expect(await second.text()).toBe("declare const x: number")
})
