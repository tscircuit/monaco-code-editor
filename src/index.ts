export { CodeEditor, defaultCodeEditorOptions } from "./components/CodeEditor"
export { FileSidebar } from "./components/FileSidebar"
export { WorkspaceCodeEditor } from "./components/WorkspaceCodeEditor"

export type { CodeEditorProps } from "./components/CodeEditor"
export type { FileSidebarProps } from "./components/FileSidebar"
export type {
  EditorFile,
  WorkspaceCodeEditorHandle,
  WorkspaceCodeEditorProps,
} from "./components/WorkspaceCodeEditor"

export { useMonacoReady } from "./hooks/useMonacoReady"
export { useTscircuitTypeAcquisition } from "./hooks/useTscircuitTypeAcquisition"
export { useWorkspaceFiles } from "./hooks/useWorkspaceFiles"

export type {
  UseWorkspaceFilesOptions,
  WorkspaceFilesController,
} from "./hooks/useWorkspaceFiles"

export { configureMonacoTypeScript } from "./monaco/monacoTypeScript"
export {
  createMonacoWorkspaceModelManager,
  MonacoWorkspaceModelManager,
} from "./monaco/monacoWorkspace"
export {
  acquireTscircuitTypes,
  configureTscircuitTypeAcquisition,
} from "./monaco/typeAcquisition"
export type { TscircuitTypeAcquisitionOptions } from "./monaco/typeAcquisition"
export {
  createTsciPackageFetcher,
  rewriteTsciJsdelivrUrl,
  DEFAULT_TSCI_REGISTRY_API_URL,
} from "./monaco/tsciPackageSupport"
export {
  computeTsciPackageLinks,
  getTsciPackagePageUrl,
  DEFAULT_TSCI_PACKAGE_BASE_URL,
} from "./monaco/tsciPackageLinks"
export type { TsciPackageLink } from "./monaco/tsciPackageLinks"
export { registerTsciPackageLinkProvider } from "./monaco/monacoSetup"
export type {
  PackageFetcher,
  TsciPackageFetcherOptions,
} from "./monaco/tsciPackageSupport"

export type {
  MonacoWorkspaceModelManagerOptions,
  WorkspaceFile,
} from "./monaco/monacoWorkspace"

import "./styles.css"
