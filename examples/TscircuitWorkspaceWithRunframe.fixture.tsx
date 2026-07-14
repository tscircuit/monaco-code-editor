import { RunFrame } from "@tscircuit/runframe/runner"
import { useMemo } from "react"
import "../src/styles.css"
import type { EditorFile } from "../src"
import { resolveTscircuitEntrypoint } from "../fixtures-support/resolveTscircuitEntrypoint"
import { WorkspaceCodeEditor } from "../src/components/WorkspaceCodeEditor"
import { useWorkspaceFiles } from "../src/hooks/useWorkspaceFiles"

// Real SparkFun Qwiic MicroPressure Sensor board (copied verbatim from
// ../sparkfun-boards) loaded as raw source so the tree sidebar shows a genuine
// multi-folder package: an `imports/` folder of chip definitions alongside the
// board entrypoint. We skip the board's `index.tsx` (it only re-exports the
// circuit) and run the `.circuit.tsx` directly.
import circuitSource from "../fixtures-support/assets/sparkfun-qwiic-micropressure/SparkFun-Qwiic-MicroPressure-Sensor.circuit.tsx?raw"
import readmeSource from "../fixtures-support/assets/sparkfun-qwiic-micropressure/README.md?raw"
import mprlsSource from "../fixtures-support/assets/sparkfun-qwiic-micropressure/imports/MPRLS0025PA00001A.tsx?raw"
import sm04bSource from "../fixtures-support/assets/sparkfun-qwiic-micropressure/imports/SM04B_SRSS_TB_LF__SN.tsx?raw"
import sm04b2Source from "../fixtures-support/assets/sparkfun-qwiic-micropressure/imports/SM04B_SRSS_TB_LF__SN2.tsx?raw"

const BOARD_ENTRYPOINT = "SparkFun-Qwiic-MicroPressure-Sensor.circuit.tsx"

const initialFiles: EditorFile[] = [
  { path: BOARD_ENTRYPOINT, content: circuitSource },
  { path: "imports/MPRLS0025PA00001A.tsx", content: mprlsSource },
  { path: "imports/SM04B_SRSS_TB_LF__SN.tsx", content: sm04bSource },
  { path: "imports/SM04B_SRSS_TB_LF__SN2.tsx", content: sm04b2Source },
  { path: "README.md", content: readmeSource },
]

export default function TscircuitWorkspaceWithRunframeFixture() {
  const workspace = useWorkspaceFiles({
    initialFiles,
    initialCurrentFile: BOARD_ENTRYPOINT,
  })
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
  const mainComponentPath = useMemo(
    () =>
      resolveTscircuitEntrypoint(workspace.files, workspace.currentFile) ??
      BOARD_ENTRYPOINT,
    [workspace.files, workspace.currentFile],
  )

  return (
    <div className="h-screen bg-white">
      <div className="flex h-full flex-col md:flex-row">
        <div className="min-h-0 flex-1 border-b border-slate-200 md:border-r md:border-b-0">
          <WorkspaceCodeEditor {...workspace} />
        </div>
        <div className="min-h-0 flex flex-1 flex-col">
          <div className="h-full flex-1">
            <RunFrame
              key={mainComponentPath}
              fsMap={fsMap}
              mainComponentPath={mainComponentPath}
              showFileMenu={false}
              showRunButton
              forceLatestEvalVersion
            />
          </div>
        </div>
      </div>
    </div>
  )
}
