import { DEFAULT_TSCI_REGISTRY_API_URL } from "../../src/monaco/tsciPackageSupport"

export const registry = DEFAULT_TSCI_REGISTRY_API_URL

export function createRecordingFetchFn(body = "ok") {
  const calls: string[] = []
  const fetchFn = async (input: RequestInfo | URL) => {
    calls.push(typeof input === "string" ? input : input.toString())
    return new Response(body, { status: 200 })
  }
  return { calls, fetchFn }
}
