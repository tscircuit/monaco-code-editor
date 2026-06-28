import { loader } from "@monaco-editor/react"
import { createHighlighter } from "shiki/bundle/web"
import * as monaco from "monaco-editor"
import { defaultEditorTheme } from "./editorTheme"
import { configureMonacoTypeScript } from "./monacoTypeScript"
import { installShikiMonaco, installShikiTokenizer } from "./shikiTokenizer"

loader.config({ monaco })

let monacoSetupPromise: Promise<void> | null = null

export const ensureMonacoConfigured = () => {
  if (monacoSetupPromise) return monacoSetupPromise

  configureMonacoTypeScript()

  monacoSetupPromise = createHighlighter({
    langs: ["tsx"],
    themes: [defaultEditorTheme],
  }).then((highlighter) => {
    installShikiMonaco(highlighter, defaultEditorTheme)
    installShikiTokenizer({
      highlighter,
      languageId: "typescript",
      shikiLanguage: "tsx",
    })
  })

  return monacoSetupPromise
}
