/**
 * Support for `@tsci/*` package imports (tscircuit registry packages).
 *
 * `@tsci` packages are not published to npm, so the default `@typescript/ata`
 * fetcher 404s on jsdelivr when resolving them. The tscircuit registry exposes
 * a jsdelivr-compatible download endpoint; this module rewrites the jsdelivr
 * URLs ATA constructs into registry URLs (mirroring tscircuit.com's fetcher).
 */

export const DEFAULT_TSCI_REGISTRY_API_URL =
  "https://registry-api.tscircuit.com"

/**
 * URL fragments that precede the `owner.name[@version][/file]` package path in
 * the jsdelivr URLs ATA constructs. Ordered so the resolve endpoint is matched
 * before the plain package endpoint.
 */
const TSCI_JSDELIVR_PREFIXES = [
  "cdn.jsdelivr.net/npm/@tsci/",
  "/v1/package/resolve/npm/@tsci/",
  "/v1/package/npm/@tsci/",
]

/**
 * Rewrite a jsdelivr URL for an `@tsci/*` package into the equivalent
 * tscircuit registry URL. Returns `null` for URLs that should be fetched
 * as-is (non-jsdelivr or non-`@tsci` packages).
 */
export function rewriteTsciJsdelivrUrl(
  url: string,
  registryApiUrl: string = DEFAULT_TSCI_REGISTRY_API_URL,
): string | null {
  if (!url.includes("@tsci/")) return null
  if (!url.includes("jsdelivr.net") && !url.includes("data.jsdelivr.com")) {
    return null
  }

  let packagePath = ""
  for (const prefix of TSCI_JSDELIVR_PREFIXES) {
    const index = url.indexOf(prefix)
    if (index !== -1) {
      packagePath = url.slice(index + prefix.length)
      break
    }
  }
  if (!packagePath) return null

  // Registry packages are addressed as `owner/name`; the npm scope encodes
  // that as `owner.name`, so convert the first dot back to a slash while
  // preserving any `@version` suffix and trailing file path.
  const parts = packagePath.split("/")
  parts[0] = (parts[0] ?? "").replace(/\./, "/")
  const transformedPackagePath = parts.join("/")

  const isResolve = url.includes("/resolve/")
  const baseUrl = registryApiUrl.replace(/\/+$/, "")
  return `${baseUrl}/snippets/download?jsdelivr_resolve=${isResolve}&jsdelivr_path=${encodeURIComponent(transformedPackagePath)}`
}

/** Minimal fetch signature (avoids Bun/DOM `typeof fetch` static-prop drift). */
export type PackageFetcher = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>

export type TsciPackageFetcherOptions = {
  /** Base URL of the tscircuit registry API. Defaults to the public registry. */
  registryApiUrl?: string
  /** Underlying fetch implementation, injectable for tests. */
  fetchFn?: PackageFetcher
}

/**
 * Create an ATA-compatible fetcher that resolves `@tsci/*` packages through
 * the tscircuit registry and caches successful package responses in memory so
 * repeated (debounced) acquisition runs don't refetch.
 */
export function createTsciPackageFetcher(
  options: TsciPackageFetcherOptions = {},
): PackageFetcher {
  const registryApiUrl = options.registryApiUrl ?? DEFAULT_TSCI_REGISTRY_API_URL
  const fetchFn: PackageFetcher =
    options.fetchFn ?? ((input, init) => fetch(input, init))
  const cache = new Map<string, string>()

  return async (input, init) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url

    if (init?.method && init.method.toUpperCase() !== "GET") {
      return fetchFn(input, init)
    }

    const rewrittenUrl = rewriteTsciJsdelivrUrl(url, registryApiUrl)
    if (rewrittenUrl == null && !url.includes("jsdelivr.net")) {
      return fetchFn(input, init)
    }

    const fetchUrl = rewrittenUrl ?? url
    const cached = cache.get(fetchUrl)
    if (cached != null) {
      return new Response(cached, { status: 200, statusText: "OK" })
    }

    const response = await fetchFn(fetchUrl, init)
    if (!response.ok) return response

    const text = await response.text()
    cache.set(fetchUrl, text)
    return new Response(text, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    })
  }
}
