export const DEFAULT_TSCI_PACKAGE_BASE_URL = "https://tscircuit.com"

const TSCI_PACKAGE_PATTERN = /@tsci\/[a-zA-Z][\w-]*\.[a-zA-Z][\w-]*/g

export type TsciPackageLink = {
  range: {
    startLineNumber: number
    startColumn: number
    endLineNumber: number
    endColumn: number
  }
  tooltip: string
  url: string
}

export function getTsciPackagePageUrl(
  packageSpecifier: string,
  baseUrl: string = DEFAULT_TSCI_PACKAGE_BASE_URL,
): string | null {
  const [owner, name] = packageSpecifier.replace("@tsci/", "").split(".")
  if (!owner || !name) return null
  return `${baseUrl.replace(/\/+$/, "")}/${owner}/${name}`
}

export function computeTsciPackageLinks(
  lines: readonly string[],
  baseUrl?: string,
): TsciPackageLink[] {
  const links: TsciPackageLink[] = []
  for (const [lineIndex, lineText] of lines.entries()) {
    for (const match of lineText.matchAll(TSCI_PACKAGE_PATTERN)) {
      const [packageSpecifier] = match
      const url = getTsciPackagePageUrl(packageSpecifier, baseUrl)
      if (url == null) continue

      const startColumn = match.index + 1
      links.push({
        range: {
          startLineNumber: lineIndex + 1,
          startColumn,
          endLineNumber: lineIndex + 1,
          endColumn: startColumn + packageSpecifier.length,
        },
        tooltip: "Open package on tscircuit.com",
        url,
      })
    }
  }
  return links
}
