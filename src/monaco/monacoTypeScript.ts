import * as monaco from "monaco-editor"
import { createDiagnosticsController } from "./diagnosticsSuspension"
import { getWorkspaceCompilerOptions } from "./getWorkspaceCompilerOptions"

type TypeScriptLanguageServiceDefaults = {
  getCompilerOptions(): monaco.typescript.CompilerOptions
  setCompilerOptions(options: monaco.typescript.CompilerOptions): void
  getDiagnosticsOptions(): Record<string, unknown>
  setDiagnosticsOptions(options: Record<string, unknown>): void
  setEagerModelSync?(value: boolean): void
  setModeConfiguration?(options: Record<string, boolean>): void
}

type TextSpan = { start: number; length: number }

type NavigationTree = {
  text: string
  kind: string
  spans: TextSpan[]
  childItems?: NavigationTree[]
}

type TypeScriptWorker = {
  getNavigationTree(fileName: string): Promise<NavigationTree | undefined>
}

type TypeScriptApi = {
  JsxEmit: {
    ReactJSX: monaco.typescript.JsxEmit
  }
  ModuleKind: {
    ESNext: monaco.typescript.ModuleKind
  }
  ModuleResolutionKind: {
    Bundler: monaco.typescript.ModuleResolutionKind
    NodeJs: monaco.typescript.ModuleResolutionKind
  }
  ScriptTarget: {
    ES2022: monaco.typescript.ScriptTarget
  }
  javascriptDefaults: TypeScriptLanguageServiceDefaults
  typescriptDefaults: TypeScriptLanguageServiceDefaults
  getTypeScriptWorker(): Promise<
    (...resources: monaco.Uri[]) => Promise<TypeScriptWorker>
  >
}

/** Files the TypeScript language service can provide symbols/diagnostics for. */
export const isCodeFile = (path: string | null): path is string =>
  !!path && /\.(ts|tsx|js|jsx)$/.test(path)

/** A symbol (class, function, property, …) found in a file's outline. */
export type DocumentSymbol = {
  name: string
  kind: string
  range: monaco.IRange
  selectionRange: monaco.IRange
  children: DocumentSymbol[]
}

let isConfigured = false

const languageServiceFeatures = [
  "completionItems",
  "hovers",
  "documentSymbols",
  "definitions",
  "references",
  "documentHighlights",
  "rename",
  "diagnostics",
  "documentRangeFormattingEdits",
  "signatureHelp",
  "onTypeFormattingEdits",
  "codeActions",
  "inlayHints",
] as const

function getTypeScriptApi() {
  return (
    monaco.languages as typeof monaco.languages & { typescript: TypeScriptApi }
  ).typescript
}

function getLanguageServiceDefaults() {
  const typescript = getTypeScriptApi()
  return [typescript.typescriptDefaults, typescript.javascriptDefaults]
}

const diagnosticsController = createDiagnosticsController((options) => {
  for (const defaults of getLanguageServiceDefaults()) {
    // Monaco replaces the whole options object, so anything a consumer set
    // (noSuggestionDiagnostics, diagnosticCodesToIgnore) has to be carried
    // forward or suspending would silently drop it.
    defaults.setDiagnosticsOptions({
      ...defaults.getDiagnosticsOptions(),
      ...options,
    })
  }
})

export const suspendSemanticDiagnostics =
  diagnosticsController.suspendSemanticDiagnostics

export function configureMonacoTypeScript(
  enableTypeScriptLanguageService: boolean,
) {
  const typescript = getTypeScriptApi()
  const defaultsList = getLanguageServiceDefaults()

  if (!isConfigured) {
    for (const defaults of defaultsList) {
      defaults.setCompilerOptions(
        getWorkspaceCompilerOptions({
          compilerOptions: defaults.getCompilerOptions(),
          jsxEmit: typescript.JsxEmit.ReactJSX,
          moduleKind: typescript.ModuleKind.ESNext,
          moduleResolutionKind:
            typescript.ModuleResolutionKind.Bundler ??
            typescript.ModuleResolutionKind.NodeJs,
          scriptTarget: typescript.ScriptTarget.ES2022,
        }),
      )
    }
    isConfigured = true
  }

  const modeConfiguration = Object.fromEntries(
    languageServiceFeatures.map((feature) => [
      feature,
      enableTypeScriptLanguageService,
    ]),
  )

  for (const defaults of defaultsList) {
    defaults.setEagerModelSync?.(enableTypeScriptLanguageService)
    defaults.setModeConfiguration?.(modeConfiguration)
  }

  diagnosticsController.setLanguageServiceEnabled(
    enableTypeScriptLanguageService,
  )
}

/** Wait until Monaco's TypeScript worker has synchronized the workspace graph. */
export async function prepareMonacoTypeScriptWorkspace(
  resources: readonly monaco.Uri[],
): Promise<void> {
  const getWorker = await getTypeScriptApi().getTypeScriptWorker()
  await getWorker(...resources)
}

function textSpanToRange(
  model: monaco.editor.ITextModel,
  span: TextSpan,
): monaco.IRange {
  const start = model.getPositionAt(span.start)
  const end = model.getPositionAt(span.start + span.length)
  return {
    startLineNumber: start.lineNumber,
    startColumn: start.column,
    endLineNumber: end.lineNumber,
    endColumn: end.column,
  }
}

function convertNavigationTree(
  item: NavigationTree,
  model: monaco.editor.ITextModel,
): DocumentSymbol {
  const primarySpan = item.spans[0] ?? { start: 0, length: 0 }
  return {
    name: item.text,
    kind: item.kind,
    range: textSpanToRange(model, primarySpan),
    selectionRange: textSpanToRange(model, primarySpan),
    children: (item.childItems ?? []).map((child) =>
      convertNavigationTree(child, model),
    ),
  }
}

/**
 * Fetch a file's outline (classes, functions, properties, …) from the same
 * TypeScript worker data Monaco's built-in "Go to Symbol" command uses.
 */
export async function getDocumentSymbols(
  model: monaco.editor.ITextModel,
): Promise<DocumentSymbol[]> {
  const getWorker = await getTypeScriptApi().getTypeScriptWorker()
  const worker = await getWorker(model.uri)
  const root = await worker.getNavigationTree(model.uri.toString())
  if (!root || model.isDisposed()) return []
  return (root.childItems ?? []).map((item) =>
    convertNavigationTree(item, model),
  )
}
