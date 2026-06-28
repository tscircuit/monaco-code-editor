import { useEffect, useState } from "react"
import { ensureMonacoConfigured } from "../monaco/monacoSetup"

/**
 * Runs the one-time Monaco configuration (loader + Shiki + TypeScript) and
 * reports when it has finished, so a component can gate rendering on it.
 */
export function useMonacoReady(): boolean {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    let isActive = true

    void ensureMonacoConfigured().then(() => {
      if (isActive) setIsReady(true)
    })

    return () => {
      isActive = false
    }
  }, [])

  return isReady
}
