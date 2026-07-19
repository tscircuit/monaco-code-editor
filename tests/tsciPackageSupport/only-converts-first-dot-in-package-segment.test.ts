import { expect, test } from "bun:test"
import { rewriteTsciJsdelivrUrl } from "../../src/monaco/tsciPackageSupport"
import { registry } from "../fixtures/tsciPackageSupportFixtures"

test("rewriteTsciJsdelivrUrl only converts the first dot in the package segment", () => {
  expect(
    rewriteTsciJsdelivrUrl(
      "https://cdn.jsdelivr.net/npm/@tsci/seveibar.red-led@0.0.1/dist/index.d.ts",
    ),
  ).toBe(
    `${registry}/snippets/download?jsdelivr_resolve=false&jsdelivr_path=${encodeURIComponent("seveibar/red-led@0.0.1/dist/index.d.ts")}`,
  )
})
