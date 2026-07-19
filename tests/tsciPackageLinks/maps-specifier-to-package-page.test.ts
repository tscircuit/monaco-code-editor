import { expect, test } from "bun:test"
import {
  DEFAULT_TSCI_PACKAGE_BASE_URL,
  getTsciPackagePageUrl,
} from "../../src/monaco/tsciPackageLinks"

test("getTsciPackagePageUrl maps @tsci/owner.name to the package page", () => {
  expect(getTsciPackagePageUrl("@tsci/seveibar.smd-usb-c")).toBe(
    `${DEFAULT_TSCI_PACKAGE_BASE_URL}/seveibar/smd-usb-c`,
  )
})
