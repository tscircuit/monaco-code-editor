import { expect, test } from "bun:test"
import { getTsciPackagePageUrl } from "../../src/monaco/tsciPackageLinks"

test("getTsciPackagePageUrl returns null when the specifier has no package name", () => {
  expect(getTsciPackagePageUrl("@tsci/seveibar")).toBeNull()
})
