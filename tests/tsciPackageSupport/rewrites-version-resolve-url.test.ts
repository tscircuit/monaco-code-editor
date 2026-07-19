import { expect, test } from "bun:test"
import { rewriteTsciJsdelivrUrl } from "../../src/monaco/tsciPackageSupport"
import { registry } from "../fixtures/tsciPackageSupportFixtures"

test("rewriteTsciJsdelivrUrl rewrites the version resolve URL", () => {
  expect(
    rewriteTsciJsdelivrUrl(
      "https://data.jsdelivr.com/v1/package/resolve/npm/@tsci/seveibar.red-led@latest",
    ),
  ).toBe(
    `${registry}/snippets/download?jsdelivr_resolve=true&jsdelivr_path=${encodeURIComponent("seveibar/red-led@latest")}`,
  )
})
