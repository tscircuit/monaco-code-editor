import "../src/styles.css"
import { useState } from "react"
import { WorkspaceCodeEditor } from "../src/components/WorkspaceCodeEditor"

export default function NarrowWorkspace() {
  const [content, setContent] = useState(`export default () => (
  <board width="10mm" height="10mm">
    <resistor resistance="1k" footprint="0402" name="R1" />
    <capacitor capacitance="1000pF" footprint="0402" name="C1" />
  </board>
)`)

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 720,
        height: "100vh",
        resize: "horizontal",
        overflow: "auto",
      }}
    >
      <WorkspaceCodeEditor
        files={[{ path: "index.tsx", content }]}
        currentFile="index.tsx"
        onFileSelect={() => {}}
        onFileContentChange={(_, value) => setContent(value)}
        enableTypeScriptLanguageService={false}
      />
    </div>
  )
}
