import { expect, test } from "bun:test"
import {
  DEFAULT_TSCI_PACKAGE_BASE_URL,
  computeTsciPackageLinks,
} from "../../src/monaco/tsciPackageLinks"

test("computeTsciPackageLinks links multiple specifiers on the same line", () => {
  const links = computeTsciPackageLinks(["// @tsci/a.one and @tsci/b.two"])
  expect(links.map((link) => link.url)).toEqual([
    `${DEFAULT_TSCI_PACKAGE_BASE_URL}/a/one`,
    `${DEFAULT_TSCI_PACKAGE_BASE_URL}/b/two`,
  ])
})
