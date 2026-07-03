import "../src/styles.css"
import { CodeEditor } from "../src/components/CodeEditor"

export default (
  <div className="h-screen bg-slate-900 p-4">
    <CodeEditor
      defaultValue={`import { RedLed } from "@tsci/seveibar.red-led"
import { PushButton } from "@tsci/seveibar.push-button"
import { SmdUsbC } from "@tsci/seveibar.smd-usb-c"

export default () => (
  <board width="12mm" height="30mm" schAutoLayoutEnabled>
    <SmdUsbC name="USBC" pcbY={-10} />
    <RedLed name="LED" pcbY={12} />
    <PushButton name="SW1" pcbY={0} />
    <resistor name="R1" footprint="0603" resistance="1k" pcbY={7} />

    <trace from="USBC.GND1" to="net.GND" />
    <trace from="USBC.GND2" to="net.GND" />
    <trace from="USBC.VBUS1" to="net.VBUS" />
    <trace from="USBC.VBUS2" to="net.VBUS" />

    <trace from="LED.neg" to="net.GND" />
    <trace from=".R1 > .neg" to="LED.pos" />

    <trace from="SW1.pin2" to="R1.pos" />
    <trace from="SW1.pin3" to="net.VBUS" />
  </board>
)
`}
      language="typescript"
      path="fixture.tsx"
      options={{
        roundedSelection: false,
      }}
    />
  </div>
)
