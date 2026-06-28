import { useEffect } from "react"
import { acquireTscircuitTypes } from "../monaco/typeAcquisition"

/**
 * Debounced tscircuit/dependency type acquisition for the given source.
 * Skips work when disabled or when there is no source to analyze.
 */
export function useTscircuitTypeAcquisition(
  source: string | null | undefined,
  options: { enabled?: boolean; delayMs?: number } = {},
): void {
  const { enabled = true, delayMs = 250 } = options

  useEffect(() => {
    if (!enabled || source == null) return

    const timer = window.setTimeout(() => {
      void acquireTscircuitTypes(source)
    }, delayMs)

    return () => window.clearTimeout(timer)
  }, [enabled, source, delayMs])
}
