export { CodeEditor, defaultCodeEditorOptions } from "./components/CodeEditor"
export { WorkspaceCodeEditor } from "./components/WorkspaceCodeEditor"
export { useMonacoReady } from "./hooks/useMonacoReady"
export { useTscircuitTypeAcquisition } from "./hooks/useTscircuitTypeAcquisition"
export { useWorkspaceFiles } from "./hooks/useWorkspaceFiles"
export {
  createMonacoWorkspaceModelManager,
  MonacoWorkspaceModelManager,
} from "./monaco/monacoWorkspace"
export { acquireTscircuitTypes } from "./monaco/typeAcquisition"
export { configureMonacoTypeScript } from "./monaco/monacoTypeScript"

export type { CodeEditorProps } from "./components/CodeEditor"
export type {
  CreateFileProps,
  CreateFileResult,
  DeleteFileProps,
  DeleteFileResult,
  EditorFile,
  RenameFileProps,
  RenameFileResult,
  WorkspaceCodeEditorProps,
} from "./components/WorkspaceCodeEditor"
export type {
  UseWorkspaceFilesOptions,
  WorkspaceFilesController,
} from "./hooks/useWorkspaceFiles"
export type {
  MonacoWorkspaceModelManagerOptions,
  WorkspaceFile,
} from "./monaco/monacoWorkspace"
