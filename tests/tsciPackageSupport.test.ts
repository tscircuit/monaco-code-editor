import { describe, expect, test } from "bun:test"
import {
  DEFAULT_TSCI_REGISTRY_API_URL,
  createTsciPackageFetcher,
  rewriteTsciJsdelivrUrl,
} from "../src/monaco/tsciPackageSupport"

const registry = DEFAULT_TSCI_REGISTRY_API_URL

describe("rewriteTsciJsdelivrUrl", () => {
  test("rewrites the versions listing URL", () => {
    expect(
      rewriteTsciJsdelivrUrl(
        "https://data.jsdelivr.com/v1/package/npm/@tsci/seveibar.red-led",
      ),
    ).toBe(
      `${registry}/snippets/download?jsdelivr_resolve=false&jsdelivr_path=${encodeURIComponent("seveibar/red-led")}`,
    )
  })

  test("rewrites the version resolve URL", () => {
    expect(
      rewriteTsciJsdelivrUrl(
        "https://data.jsdelivr.com/v1/package/resolve/npm/@tsci/seveibar.red-led@latest",
      ),
    ).toBe(
      `${registry}/snippets/download?jsdelivr_resolve=true&jsdelivr_path=${encodeURIComponent("seveibar/red-led@latest")}`,
    )
  })

  test("rewrites the flat file-listing URL", () => {
    expect(
      rewriteTsciJsdelivrUrl(
        "https://data.jsdelivr.com/v1/package/npm/@tsci/seveibar.red-led@0.0.1/flat",
      ),
    ).toBe(
      `${registry}/snippets/download?jsdelivr_resolve=false&jsdelivr_path=${encodeURIComponent("seveibar/red-led@0.0.1/flat")}`,
    )
  })

  test("rewrites CDN file-content URLs", () => {
    expect(
      rewriteTsciJsdelivrUrl(
        "https://cdn.jsdelivr.net/npm/@tsci/seveibar.red-led@0.0.1/index.d.ts",
      ),
    ).toBe(
      `${registry}/snippets/download?jsdelivr_resolve=false&jsdelivr_path=${encodeURIComponent("seveibar/red-led@0.0.1/index.d.ts")}`,
    )
  })

  test("only converts the first dot in the package segment", () => {
    expect(
      rewriteTsciJsdelivrUrl(
        "https://cdn.jsdelivr.net/npm/@tsci/seveibar.red-led@0.0.1/dist/index.d.ts",
      ),
    ).toBe(
      `${registry}/snippets/download?jsdelivr_resolve=false&jsdelivr_path=${encodeURIComponent("seveibar/red-led@0.0.1/dist/index.d.ts")}`,
    )
  })

  test("returns null for non-@tsci jsdelivr URLs", () => {
    expect(
      rewriteTsciJsdelivrUrl(
        "https://data.jsdelivr.com/v1/package/npm/@tscircuit/core",
      ),
    ).toBeNull()
    expect(
      rewriteTsciJsdelivrUrl(
        "https://cdn.jsdelivr.net/npm/typescript@5.6.3/lib/typescript.d.ts",
      ),
    ).toBeNull()
  })

  test("returns null for @tsci mentions outside jsdelivr", () => {
    expect(
      rewriteTsciJsdelivrUrl("https://example.com/@tsci/seveibar.red-led"),
    ).toBeNull()
  })

  test("respects a custom registry URL and strips trailing slashes", () => {
    expect(
      rewriteTsciJsdelivrUrl(
        "https://data.jsdelivr.com/v1/package/npm/@tsci/seveibar.red-led",
        "https://example.com/api/",
      ),
    ).toBe(
      `https://example.com/api/snippets/download?jsdelivr_resolve=false&jsdelivr_path=${encodeURIComponent("seveibar/red-led")}`,
    )
  })
})

describe("createTsciPackageFetcher", () => {
  const makeFetchFn = (body = "ok") => {
    const calls: string[] = []
    const fetchFn = async (input: RequestInfo | URL) => {
      calls.push(typeof input === "string" ? input : input.toString())
      return new Response(body, { status: 200 })
    }
    return { calls, fetchFn }
  }

  test("rewrites @tsci jsdelivr URLs to the registry", async () => {
    const { calls, fetchFn } = makeFetchFn()
    const fetcher = createTsciPackageFetcher({ fetchFn })

    await fetcher(
      "https://cdn.jsdelivr.net/npm/@tsci/seveibar.red-led@0.0.1/index.d.ts",
    )

    expect(calls).toEqual([
      `${registry}/snippets/download?jsdelivr_resolve=false&jsdelivr_path=${encodeURIComponent("seveibar/red-led@0.0.1/index.d.ts")}`,
    ])
  })

  test("passes non-jsdelivr URLs through untouched", async () => {
    const { calls, fetchFn } = makeFetchFn()
    const fetcher = createTsciPackageFetcher({ fetchFn })

    await fetcher("https://example.com/whatever")

    expect(calls).toEqual(["https://example.com/whatever"])
  })

  test("caches successful responses in memory", async () => {
    const { calls, fetchFn } = makeFetchFn("declare const x: number")
    const fetcher = createTsciPackageFetcher({ fetchFn })
    const url =
      "https://cdn.jsdelivr.net/npm/@tsci/seveibar.red-led@0.0.1/index.d.ts"

    const first = await fetcher(url)
    const second = await fetcher(url)

    expect(calls).toHaveLength(1)
    expect(await first.text()).toBe("declare const x: number")
    expect(await second.text()).toBe("declare const x: number")
  })

  test("does not cache failed responses", async () => {
    const calls: string[] = []
    const fetchFn = async (input: RequestInfo | URL) => {
      calls.push(input.toString())
      return new Response("not found", { status: 404 })
    }
    const fetcher = createTsciPackageFetcher({ fetchFn })
    const url =
      "https://cdn.jsdelivr.net/npm/@tsci/seveibar.missing@0.0.1/index.d.ts"

    const first = await fetcher(url)
    await fetcher(url)

    expect(first.ok).toBe(false)
    expect(calls).toHaveLength(2)
  })

  test("does not intercept non-GET requests", async () => {
    const { calls, fetchFn } = makeFetchFn()
    const fetcher = createTsciPackageFetcher({ fetchFn })
    const url =
      "https://cdn.jsdelivr.net/npm/@tsci/seveibar.red-led@0.0.1/index.d.ts"

    await fetcher(url, { method: "POST" })

    expect(calls).toEqual([url])
  })

  test("uses a custom registry URL", async () => {
    const { calls, fetchFn } = makeFetchFn()
    const fetcher = createTsciPackageFetcher({
      fetchFn,
      registryApiUrl: "https://example.com/api",
    })

    await fetcher(
      "https://data.jsdelivr.com/v1/package/resolve/npm/@tsci/seveibar.red-led",
    )

    expect(calls).toEqual([
      `https://example.com/api/snippets/download?jsdelivr_resolve=true&jsdelivr_path=${encodeURIComponent("seveibar/red-led")}`,
    ])
  })
})
