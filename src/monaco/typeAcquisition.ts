import { setupTypeAcquisition } from "@typescript/ata"
import * as monaco from "monaco-editor"
import ts from "typescript"
import { createTsciPackageFetcher } from "./tsciPackageSupport"

type TypeScriptLanguageServiceDefaults = {
  addExtraLib(content: string, filePath?: string): monaco.IDisposable
}

type TypeScriptApi = {
  typescriptDefaults: TypeScriptLanguageServiceDefaults
}

const tscircuitBootstrapSource = `import "tscircuit";`

const typeAcquisitionState = {
  acquireTypes: null as null | ((source: string) => Promise<void>),
  disposables: new Map<string, monaco.IDisposable>(),
  registryApiUrl: undefined as string | undefined,
}

export type TscircuitTypeAcquisitionOptions = {
  /** Base URL of the registry API used to resolve `@tsci/*` packages. */
  registryApiUrl?: string
}

/**
 * Override type-acquisition settings (e.g. point `@tsci/*` resolution at a
 * registry proxy). Resets the ATA instance so the next acquisition uses them.
 */
export function configureTscircuitTypeAcquisition(
  options: TscircuitTypeAcquisitionOptions = {},
) {
  typeAcquisitionState.registryApiUrl = options.registryApiUrl
  typeAcquisitionState.acquireTypes = null
}

function getTypeScriptApi() {
  return (
    monaco.languages as typeof monaco.languages & { typescript: TypeScriptApi }
  ).typescript
}

function toExtraLibPath(path: string) {
  return path.startsWith("/") ? `file://${path}` : path
}

function ensureTypeAcquisition() {
  if (typeAcquisitionState.acquireTypes) {
    return typeAcquisitionState.acquireTypes
  }

  const typescript = getTypeScriptApi()

  typeAcquisitionState.acquireTypes = setupTypeAcquisition({
    fetcher: createTsciPackageFetcher({
      registryApiUrl: typeAcquisitionState.registryApiUrl,
    }) as typeof fetch,
    delegate: {
      errorMessage(message, error) {
        console.warn(message, error)
      },
      receivedFile(code, path) {
        const extraLibPath = toExtraLibPath(path)
        typeAcquisitionState.disposables.get(extraLibPath)?.dispose()
        typeAcquisitionState.disposables.set(
          extraLibPath,
          typescript.typescriptDefaults.addExtraLib(code, extraLibPath),
        )
      },
    },
    projectName: "monaco-code-editor",
    typescript: ts,
  })

  return typeAcquisitionState.acquireTypes
}

export function acquireTscircuitTypes(source: string) {
  const acquireTypes = ensureTypeAcquisition()
  return acquireTypes(`${tscircuitBootstrapSource}\n${source}`)
}
