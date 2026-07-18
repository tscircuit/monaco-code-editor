import * as monaco from "monaco-editor"
import { getWorkspaceCompilerOptions } from "./getWorkspaceCompilerOptions"

type TypeScriptLanguageServiceDefaults = {
  getCompilerOptions(): monaco.typescript.CompilerOptions
  setCompilerOptions(options: monaco.typescript.CompilerOptions): void
  setDiagnosticsOptions(options: Record<string, unknown>): void
  setEagerModelSync?(value: boolean): void
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
  for (const defaults of [
    typescript.typescriptDefaults,
    typescript.javascriptDefaults,
  ]) {
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

    defaults.setEagerModelSync?.(true)
  }

  typescript.typescriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
    onlyVisible: false,
  })

  isConfigured = true
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
