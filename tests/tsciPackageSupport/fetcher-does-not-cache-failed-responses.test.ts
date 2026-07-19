import { expect, test } from "bun:test"
import { createTsciPackageFetcher } from "../../src/monaco/tsciPackageSupport"

test("createTsciPackageFetcher does not cache failed responses", async () => {
  const calls: string[] = []
  const fetchFn = async (input: RequestInfo | URL) => {
    calls.push(input.toString())
    return new Response("not found", { status: 404 })
  }
  const fetcher = createTsciPackageFetcher({ fetchFn })
  const url =
    "https://cdn.jsdelivr.net/npm/@tsci/seveibar.missing@0.0.1/index.d.ts"

  const first = await fetcher(url)
  await fetcher(url)

  expect(first.ok).toBe(false)
  expect(calls).toHaveLength(2)
})
