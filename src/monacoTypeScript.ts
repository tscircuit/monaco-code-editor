import * as monaco from "monaco-editor"

type TypeScriptLanguageServiceDefaults = {
  getCompilerOptions(): Record<string, unknown>
  setCompilerOptions(options: Record<string, unknown>): void
}

type TypeScriptApi = {
  JsxEmit: {
    Preserve: number
  }
  ScriptTarget: {
    ESNext: number
  }
  typescriptDefaults: TypeScriptLanguageServiceDefaults
}

let isConfigured = false

function getTypeScriptApi() {
  return (
    monaco.languages as typeof monaco.languages & { typescript: TypeScriptApi }
  ).typescript
}

export function configureMonacoTypeScript() {
  if (isConfigured) {
    return
  }

  const typescript = getTypeScriptApi()
  const compilerOptions = typescript.typescriptDefaults.getCompilerOptions()

  typescript.typescriptDefaults.setCompilerOptions({
    ...compilerOptions,
    allowNonTsExtensions: true,
    jsx: typescript.JsxEmit.Preserve,
    moduleResolution: 100,
    target: typescript.ScriptTarget.ESNext,
  })

  isConfigured = true
}
