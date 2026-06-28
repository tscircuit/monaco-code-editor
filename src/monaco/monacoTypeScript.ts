import * as monaco from "monaco-editor"

type TypeScriptLanguageServiceDefaults = {
  getCompilerOptions(): Record<string, unknown>
  setCompilerOptions(options: Record<string, unknown>): void
  setDiagnosticsOptions(options: Record<string, unknown>): void
  setEagerModelSync?(value: boolean): void
}

type TypeScriptApi = {
  JsxEmit: {
    ReactJSX: number
  }
  ModuleKind: {
    ESNext: number
  }
  ModuleResolutionKind: {
    Bundler: number
    NodeJs: number
  }
  ScriptTarget: {
    ES2022: number
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
    allowJs: true,
    allowNonTsExtensions: true,
    jsx: typescript.JsxEmit.ReactJSX,
    module: typescript.ModuleKind.ESNext,
    moduleResolution:
      typescript.ModuleResolutionKind.Bundler ??
      typescript.ModuleResolutionKind.NodeJs,
    resolveJsonModule: true,
    target: typescript.ScriptTarget.ES2022,
  })

  typescript.typescriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
    onlyVisible: false,
  })

  typescript.typescriptDefaults.setEagerModelSync?.(true)

  isConfigured = true
}
