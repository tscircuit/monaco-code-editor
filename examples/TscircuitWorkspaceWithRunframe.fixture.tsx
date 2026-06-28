import { useMemo, useState } from "react"
import "../src/styles.css"
import { SuspenseRunFrame } from "../src/components/SuspenseRunFrame"
import {
  WorkspaceCodeEditor,
  type EditorFile,
} from "../src/components/WorkspaceCodeEditor"
import { useWorkspaceFiles } from "../src/hooks/useWorkspaceFiles"

const initialFiles: EditorFile[] = [
  {
    path: "index.tsx",
    content: `export default () => (
  <board width="10mm" height="10mm">
    <resistor
      resistance="1k"
      footprint="0402"
      name="R1"
    />
    <capacitor
      capacitance="1000pF"
      footprint="0402"
      name="C1"
      connections={{ pin1: "R1.pin1" }}
    />
  </board>
)`,
  },
]

export default function TscircuitWorkspaceWithRunframeFixture() {
  const workspace = useWorkspaceFiles({
    initialFiles,
    initialCurrentFile: "index.tsx",
  })
  const [lastRenderState, setLastRenderState] = useState<
    "idle" | "running" | "finished"
  >("idle")

  const fsMap = useMemo(
    () =>
      workspace.files.reduce(
        (acc, file) => {
          acc[file.path] = file.content
          return acc
        },
        {} as Record<string, string>,
      ),
    [workspace.files],
  )

  return (
    <div className="h-screen bg-white">
      <div className="flex h-full flex-col md:flex-row">
        <div className="min-h-0 flex-1 border-b border-slate-200 md:border-r md:border-b-0">
          <WorkspaceCodeEditor {...workspace} />
        </div>
        <div className="min-h-0 flex flex-1 flex-col">
          <SuspenseRunFrame
            className="h-full flex-1"
            fsMap={fsMap}
            mainComponentPath="index.tsx"
            showFileMenu={false}
            showRunButton
            forceLatestEvalVersion
            onRenderStarted={() => setLastRenderState("running")}
            onRenderFinished={() => setLastRenderState("finished")}
          />
        </div>
      </div>
    </div>
  )
}
