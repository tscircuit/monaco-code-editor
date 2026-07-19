import { expect, test } from "bun:test"
import {
  DEFAULT_TSCI_PACKAGE_BASE_URL,
  computeTsciPackageLinks,
} from "../../src/monaco/tsciPackageLinks"

test("computeTsciPackageLinks links an import specifier with a 1-based Monaco range", () => {
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
