import { expect, test } from "bun:test"
import { rewriteTsciJsdelivrUrl } from "../../src/monaco/tsciPackageSupport"

test("rewriteTsciJsdelivrUrl returns null for @tsci mentions outside jsdelivr", () => {
  expect(
    rewriteTsciJsdelivrUrl("https://example.com/@tsci/seveibar.red-led"),
  ).toBeNull()
})
