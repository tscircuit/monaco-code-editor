import { expect, test } from "bun:test"
import {
  DEFAULT_TSCI_PACKAGE_BASE_URL,
  getTsciPackagePageUrl,
} from "../../src/monaco/tsciPackageLinks"

test("getTsciPackagePageUrl keeps only the owner and package name for subpath specifiers", () => {
  expect(getTsciPackagePageUrl("@tsci/seveibar.red-led.sub")).toBe(
    `${DEFAULT_TSCI_PACKAGE_BASE_URL}/seveibar/red-led`,
  )
})
