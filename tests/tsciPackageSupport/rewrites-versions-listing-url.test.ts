import { expect, test } from "bun:test"
import { rewriteTsciJsdelivrUrl } from "../../src/monaco/tsciPackageSupport"
import { registry } from "../fixtures/tsciPackageSupportFixtures"

test("rewriteTsciJsdelivrUrl rewrites the versions listing URL", () => {
  expect(
    rewriteTsciJsdelivrUrl(
      "https://data.jsdelivr.com/v1/package/npm/@tsci/seveibar.red-led",
    ),
  ).toBe(
    `${registry}/snippets/download?jsdelivr_resolve=false&jsdelivr_path=${encodeURIComponent("seveibar/red-led")}`,
  )
})
