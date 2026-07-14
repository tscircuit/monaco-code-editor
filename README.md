# monaco-code-editor

Standalone Monaco editor package for the tscircuit web editor.

## Workspace editor

Product-specific controls such as component imports, authentication, and save
actions should be rendered outside `WorkspaceCodeEditor`. A small ref API lets
an external toolbar invoke editor commands without depending on Monaco.

```tsx
import { useRef } from "react"
import {
  WorkspaceCodeEditor,
  type WorkspaceCodeEditorHandle,
} from "@tscircuit/monaco-code-editor"
import "@tscircuit/monaco-code-editor/styles.css"

export function EditorPanel() {
  const editorRef = useRef<WorkspaceCodeEditorHandle>(null)

  return (
    <div className="editor-panel">
      <div className="editor-toolbar">
        <button onClick={() => editorRef.current?.formatDocument()}>
          Format
        </button>
        <button onClick={() => editorRef.current?.setSidebarOpen(true)}>
          Show files
        </button>
      </div>

      <WorkspaceCodeEditor
        ref={editorRef}
        files={files}
        currentFile={currentFile}
        isLoadingFiles={isLoadingFiles}
        loadingProgress={loadingProgress}
        onFileSelect={setCurrentFile}
        onFileContentChange={updateFile}
      />
    </div>
  )
}
```

The ref exposes:

- `focus()`
- `formatDocument()`
- `openQuickOpen()`
- `revealLocation(path, line?, column?)`
- `setSidebarOpen(open)`

Press `Ctrl+P` or `Cmd+P` to fuzzy-search workspace files from the keyboard.
