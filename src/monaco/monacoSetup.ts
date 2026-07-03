import { loader } from "@monaco-editor/react"
import { createHighlighter } from "shiki/bundle/web"
import * as monaco from "monaco-editor"
import { defaultEditorTheme } from "./editorDefaults"
import { configureMonacoTypeScript } from "./monacoTypeScript"
import { installShikiMonaco, installShikiTokenizer } from "./shikiTokenizer"
import { computeTsciPackageLinks } from "./tsciPackageLinks"

loader.config({ monaco })

let monacoSetupPromise: Promise<void> | null = null
let isTsciLinkProviderRegistered = false

export function registerTsciPackageLinkProvider(): void {
  if (isTsciLinkProviderRegistered) return
  isTsciLinkProviderRegistered = true

  for (const languageId of ["typescript", "javascript"]) {
    monaco.languages.registerLinkProvider(languageId, {
      provideLinks: (model) => ({
        links: computeTsciPackageLinks(model.getLinesContent()),
      }),
    })
  }
}

export const ensureMonacoConfigured = () => {
  if (monacoSetupPromise) return monacoSetupPromise

  configureMonacoTypeScript()
  registerTsciPackageLinkProvider()

  monacoSetupPromise = createHighlighter({
    langs: ["tsx"],
    themes: [defaultEditorTheme],
  })
    .then((highlighter) => {
      installShikiMonaco(highlighter, defaultEditorTheme)
      installShikiTokenizer({
        highlighter,
        languageId: "typescript",
        shikiLanguage: "tsx",
      })
    })
    .catch((error) => {
      // Allow a later call to retry instead of caching the rejection forever.
      monacoSetupPromise = null
      throw error
    })

  return monacoSetupPromise
}
