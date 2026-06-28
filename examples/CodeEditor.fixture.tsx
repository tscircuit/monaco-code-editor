import "../src/styles.css"
import { CodeEditor } from "../src/components/CodeEditor"

export default (
  <div className="h-screen bg-slate-900 p-4">
    <CodeEditor
      defaultValue={`export default () => (
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
)`}
      language="typescript"
      path="fixture.tsx"
      options={{
        roundedSelection: false,
      }}
    />
  </div>
)
