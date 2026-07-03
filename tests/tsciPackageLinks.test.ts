import { describe, expect, test } from "bun:test"
import {
  DEFAULT_TSCI_PACKAGE_BASE_URL,
  computeTsciPackageLinks,
  getTsciPackagePageUrl,
} from "../src/monaco/tsciPackageLinks"

describe("getTsciPackagePageUrl", () => {
  test("maps @tsci/owner.name to the package page", () => {
    expect(getTsciPackagePageUrl("@tsci/seveibar.smd-usb-c")).toBe(
      `${DEFAULT_TSCI_PACKAGE_BASE_URL}/seveibar/smd-usb-c`,
    )
  })

  test("keeps only the owner and package name for subpath specifiers", () => {
    expect(getTsciPackagePageUrl("@tsci/seveibar.red-led.sub")).toBe(
      `${DEFAULT_TSCI_PACKAGE_BASE_URL}/seveibar/red-led`,
    )
  })

  test("returns null when the specifier has no package name", () => {
    expect(getTsciPackagePageUrl("@tsci/seveibar")).toBeNull()
  })
})

describe("computeTsciPackageLinks", () => {
  test("links an import specifier with a 1-based Monaco range", () => {
    const line = 'import { UsbC } from "@tsci/seveibar.smd-usb-c"'
    const links = computeTsciPackageLinks(["export {}", line])

    const startColumn = line.indexOf("@tsci/") + 1
    expect(links).toEqual([
      {
        range: {
          startLineNumber: 2,
          startColumn,
          endLineNumber: 2,
          endColumn: startColumn + "@tsci/seveibar.smd-usb-c".length,
        },
        tooltip: "Open package on tscircuit.com",
        url: `${DEFAULT_TSCI_PACKAGE_BASE_URL}/seveibar/smd-usb-c`,
      },
    ])
  })

  test("links multiple specifiers on the same line", () => {
    const links = computeTsciPackageLinks(["// @tsci/a.one and @tsci/b.two"])
    expect(links.map((link) => link.url)).toEqual([
      `${DEFAULT_TSCI_PACKAGE_BASE_URL}/a/one`,
      `${DEFAULT_TSCI_PACKAGE_BASE_URL}/b/two`,
    ])
  })
})
