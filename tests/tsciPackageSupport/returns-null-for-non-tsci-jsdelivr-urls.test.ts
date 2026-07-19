import { expect, test } from "bun:test"
import { rewriteTsciJsdelivrUrl } from "../../src/monaco/tsciPackageSupport"

test("rewriteTsciJsdelivrUrl returns null for non-@tsci jsdelivr URLs", () => {
  expect(
    rewriteTsciJsdelivrUrl(
      "https://data.jsdelivr.com/v1/package/npm/@tscircuit/core",
    ),
  ).toBeNull()
  expect(
    rewriteTsciJsdelivrUrl(
      "https://cdn.jsdelivr.net/npm/typescript@5.6.3/lib/typescript.d.ts",
    ),
  ).toBeNull()
})
