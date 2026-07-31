import { useEffect, useState } from "react"
import { ensureMonacoConfigured } from "../monaco/monacoSetup"

/**
 * Reports when Monaco and its Shiki tokenizer are ready to mount together.
 */
export function useMonacoReady(
  enableTypeScriptLanguageService: boolean,
): boolean {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    let isActive = true

    void ensureMonacoConfigured(enableTypeScriptLanguageService)
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
  }, [enableTypeScriptLanguageService])

  return isReady
}
