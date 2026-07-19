import { expect, test } from "bun:test"
import { rewriteTsciJsdelivrUrl } from "../../src/monaco/tsciPackageSupport"

test("rewriteTsciJsdelivrUrl respects a custom registry URL and strips trailing slashes", () => {
  expect(
    rewriteTsciJsdelivrUrl(
      "https://data.jsdelivr.com/v1/package/npm/@tsci/seveibar.red-led",
      "https://example.com/api/",
    ),
  ).toBe(
    `https://example.com/api/snippets/download?jsdelivr_resolve=false&jsdelivr_path=${encodeURIComponent("seveibar/red-led")}`,
  )
})
