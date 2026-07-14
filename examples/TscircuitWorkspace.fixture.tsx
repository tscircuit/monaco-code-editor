import "../src/styles.css"
import { useRef } from "react"
import {
  type EditorFile,
  type WorkspaceCodeEditorHandle,
  WorkspaceCodeEditor,
} from "../src/components/WorkspaceCodeEditor"
import { useWorkspaceFiles } from "../src/hooks/useWorkspaceFiles"

const initialFiles: EditorFile[] = [
  {
    path: "index.tsx",
    content: `import manualEdits from "./manual-edits.json"
import { MPL3115A2R1 } from "./MPL3115A2R1"
import { sel } from "tscircuit"

export default () => (
  <board width="15.24mm" height="17.78mm" manualEdits={manualEdits}>
    <group>
      <capacitor
        name="C1"
        footprint="cap0402"
        capacitance="0.1uF"
        pcbX={1.27}
        pcbRotation={-90}
      />
      <resistor
        name="R1"
        resistance="1k"
        footprint="0402"
        pcbRotation={90}
        connections={{ pin2: sel.net().SCL }}
      />
      <MPL3115A2R1
        name="U1"
        pcbRotation={90}
        pcbY={5.08}
        connections={{
          INT1: sel.net().INT1,
          INT2: sel.net().INT2,
          SCL: sel.net().SCL,
          SDA: sel.net().SDA,
        }}
      />
      <netlabel
        net="GND"
        anchorSide="top"
        connectsTo={[sel.C1.pin2]}
        schY={2.1}
      />
    </group>
  </board>
)
`,
  },
  {
    path: "MPL3115A2R1.tsx",
    content: `import type { ChipProps } from "@tscircuit/props"

const pinLabels = {
  pin1: ["VDD"],
  pin2: ["CAP"],
  pin3: ["GND"],
  pin4: ["VDDIO"],
  pin5: ["INT2"],
  pin6: ["INT1"],
  pin7: ["SDA"],
  pin8: ["SCL"],
} as const

export const MPL3115A2R1 = (props: ChipProps<typeof pinLabels>) => {
  return (
    <chip
      {...props}
      schWidth={1.5}
      pinLabels={pinLabels}
      manufacturerPartNumber="MPL3115A2R1"
      footprint={
        <footprint>
          <smtpad portHints={["pin1"]} pcbX="-1.875mm" pcbY="-1.30mm" width="0.60mm" height="1.50mm" shape="rect" />
          <smtpad portHints={["pin2"]} pcbX="-0.625mm" pcbY="-1.30mm" width="0.60mm" height="1.50mm" shape="rect" />
          <smtpad portHints={["pin3"]} pcbX="0.625mm" pcbY="-1.30mm" width="0.60mm" height="1.50mm" shape="rect" />
          <smtpad portHints={["pin4"]} pcbX="1.875mm" pcbY="-1.30mm" width="0.60mm" height="1.50mm" shape="rect" />
          <smtpad portHints={["pin5"]} pcbX="1.875mm" pcbY="1.30mm" width="0.60mm" height="1.50mm" shape="rect" />
          <smtpad portHints={["pin6"]} pcbX="0.625mm" pcbY="1.30mm" width="0.60mm" height="1.50mm" shape="rect" />
          <smtpad portHints={["pin7"]} pcbX="-0.625mm" pcbY="1.30mm" width="0.60mm" height="1.50mm" shape="rect" />
          <smtpad portHints={["pin8"]} pcbX="-1.875mm" pcbY="1.30mm" width="0.60mm" height="1.50mm" shape="rect" />
        </footprint>
      }
    />
  )
}
`,
  },
  {
    path: "manual-edits.json",
    content: `{
  "pcb_placements": [],
  "schematic_placements": [],
  "edit_events": []
}
`,
  },
  {
    path: "lib/constants.ts",
    content: `export const BOARD_WIDTH_MM = 15.24
export const BOARD_HEIGHT_MM = 17.78
`,
  },
  {
    path: "lib/footprints/cap0402.ts",
    content: `export const cap0402 = "cap0402"
`,
  },
  {
    path: "README.md",
    content: `# MPL3115A2 breakout

A tiny tscircuit example board. Edit \`index.tsx\` to get started.
`,
  },
]

export default function TscircuitWorkspaceFixture() {
  const editorRef = useRef<WorkspaceCodeEditorHandle>(null)
  const workspace = useWorkspaceFiles({
    initialFiles,
    initialCurrentFile: "index.tsx",
  })

  return (
    <div className="flex h-screen flex-col bg-white">
      <div className="flex h-10 shrink-0 items-center justify-end gap-2 border-b border-slate-200 px-3">
        <button
          type="button"
          className="rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          onClick={() => editorRef.current?.formatDocument()}
        >
          Format
        </button>
      </div>
      <div className="min-h-0 flex-1">
        <WorkspaceCodeEditor ref={editorRef} {...workspace} />
      </div>
    </div>
  )
}
