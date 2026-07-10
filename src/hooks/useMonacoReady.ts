import { useEffect, useState } from "react"
import { ensureMonacoConfigured } from "../monaco/monacoSetup"

/**
 * Reports when Monaco and its Shiki tokenizer are ready to mount together.
 */
export function useMonacoReady(): boolean {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    let isActive = true

    void ensureMonacoConfigured()
      .catch((error) => {
        // Keep the editor usable with Monaco's fallback tokenizer if Shiki
        // cannot be loaded.
        console.warn("Failed to install Shiki tokenization", error)
      })
      .finally(() => {
        if (isActive) setIsReady(true)
      })

    return () => {
      isActive = false
    }
  }, [])

  return isReady
}
