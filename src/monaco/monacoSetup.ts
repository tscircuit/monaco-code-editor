import { loader } from "@monaco-editor/react"
import * as monaco from "monaco-editor"
import { createHighlighter } from "shiki/bundle/web"
import { defaultEditorTheme } from "./editorDefaults"
import { configureMonacoTypeScript } from "./monacoTypeScript"
import { installShikiMonaco, installShikiTokenizer } from "./shikiTokenizer"
import { computeTsciPackageLinks } from "./tsciPackageLinks"

loader.config({ monaco })

let monacoSetupPromise: Promise<void> | null = null
let isTsciLinkProviderRegistered = false
let isMonacoBaseConfigured = false

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

/** Configure the parts Monaco needs before an editor can be mounted. */
export function configureMonaco() {
  if (isMonacoBaseConfigured) return
  configureMonacoTypeScript()
  registerTsciPackageLinkProvider()
  isMonacoBaseConfigured = true
}

/**
 * Install optional Shiki tokenization in the background. Monaco's native
 * tokenization remains available while this promise resolves.
 */
export const ensureMonacoConfigured = () => {
  configureMonaco()
  if (monacoSetupPromise) return monacoSetupPromise

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
