import { useEffect, useRef, useState } from "react"
import { acquireTscircuitTypes } from "../monaco/typeAcquisition"

/** Acquires initial types immediately, then debounces background updates. */
export function useTscircuitTypeAcquisition(
  source: string | null | undefined,
  options: {
    enabled?: boolean
    delayMs?: number
    readinessKey?: string
  } = {},
): boolean {
  const { enabled = true, delayMs = 250, readinessKey = "initial" } = options
  const hasCompletedInitialAcquisition = useRef(false)
  const [completedReadinessKey, setCompletedReadinessKey] = useState<
    string | null
  >(null)

  useEffect(() => {
    if (!enabled || source == null) return

    let isActive = true
    const delay = hasCompletedInitialAcquisition.current ? delayMs : 0
    const timer = window.setTimeout(() => {
      void acquireTscircuitTypes(source)
        .catch((error) => console.warn("Failed to acquire types", error))
        .finally(() => {
          if (!isActive) return
          hasCompletedInitialAcquisition.current = true
          setCompletedReadinessKey(readinessKey)
        })
    }, delay)

    return () => {
      isActive = false
      window.clearTimeout(timer)
    }
  }, [enabled, source, delayMs, readinessKey])

  return enabled && completedReadinessKey === readinessKey
}
