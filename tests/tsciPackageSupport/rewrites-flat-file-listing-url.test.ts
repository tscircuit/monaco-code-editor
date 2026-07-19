import { expect, test } from "bun:test"
import { rewriteTsciJsdelivrUrl } from "../../src/monaco/tsciPackageSupport"
import { registry } from "../fixtures/tsciPackageSupportFixtures"

test("rewriteTsciJsdelivrUrl rewrites the flat file-listing URL", () => {
  expect(
    rewriteTsciJsdelivrUrl(
      "https://data.jsdelivr.com/v1/package/npm/@tsci/seveibar.red-led@0.0.1/flat",
    ),
  ).toBe(
    `${registry}/snippets/download?jsdelivr_resolve=false&jsdelivr_path=${encodeURIComponent("seveibar/red-led@0.0.1/flat")}`,
  )
})
