import { useEffect, useRef, useState } from "react"
import { acquireTscircuitTypes } from "../monaco/typeAcquisition"

/** Acquires initial types immediately, then debounces background updates. */
export function useTscircuitTypeAcquisition(
  source: string | null | undefined,
  options: { enabled?: boolean; delayMs?: number } = {},
): boolean {
  const { enabled = true, delayMs = 250 } = options
  const hasCompletedInitialAcquisition = useRef(false)
  const [isReady, setIsReady] = useState(false)

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
          setIsReady(true)
        })
    }, delay)

    return () => {
      isActive = false
      window.clearTimeout(timer)
    }
  }, [enabled, source, delayMs])

  return isReady
}
