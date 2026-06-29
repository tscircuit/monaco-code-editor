import { sel } from "tscircuit"
import { MPRLS0025PA00001A } from "./imports/MPRLS0025PA00001A"
import { SM04B_SRSS_TB_LF__SN } from "./imports/SM04B_SRSS_TB_LF__SN"
import { SM04B_SRSS_TB_LF__SN2 } from "./imports/SM04B_SRSS_TB_LF__SN2"

const qwiicHeaderLabels = {
  pin1: ["GND"],
  pin2: ["3V3"],
  pin3: ["SDA"],
  pin4: ["SCL"],
}

const eocResetHeaderLabels = {
  pin1: ["RESET"],
  pin2: ["EOC"],
}

export default () => {
  return (
    <board width={25.4} height={25.4}>
      <schematicsection name="mprl" displayName="MPRL Micro Pressure Sensor" />
      <schematicsection name="i2c_pullup" displayName="I2C Pull-up" />
      <schematicsection name="power_led" displayName="Power LED" />
      <schematicsection name="connectors" displayName="Connectors" />

      <netlabel
        net="V3_3"
        anchorSide="bottom"
        schX={-10}
        schY={9}
        connectsTo={sel.C1.pin1}
      />
      <capacitor
        name="C1"
        capacitance="0.1uF"
        footprint="0402"
        schSectionName="mprl"
        schRotation={-90}
        schX={-10}
        schY={8}
      />
      <netlabel
        net="GND"
        anchorSide="top"
        schX={-10}
        schY={7}
        connectsTo={sel.C1.pin2}
      />

      <MPRLS0025PA00001A
        name="U1"
        schSectionName="mprl"
        pcbX={0}
        pcbY={0}
        pcbRotation={180}
        schX={-7}
        schY={8}
        connections={{
          pin1: sel.net().SS,
          pin2: sel.net().SDA,
          pin3: sel.net().SCL,
          pin7: sel.net().MISO,
          pin8: sel.net().EOC,
          pin9: sel.net().RESET,
          pin10: sel.net().GND,
          pin12: sel.net().V3_3,
        }}
      />
      <schematictext
        text="MPR Series"
        color="gray"
        anchor="center"
        schX={-7}
        schY={6.55}
        fontSize={0.15}
      />
      <schematictext
        text="Address: 0x18"
        color="gray"
        anchor="center"
        schX={-7}
        schY={5.75}
        fontSize={0.15}
      />
      <schematictext
        text="Supply Voltage: 1.8 - 3.6V"
        color="gray"
        anchor="center"
        schX={-7}
        schY={5.1}
        fontSize={0.15}
      />

      <capacitor
        name="C2"
        capacitance="1nF"
        footprint="0402"
        schSectionName="mprl"
        schRotation={90}
        schX={-4.9}
        schY={8.85}
        connections={{
          pin1: sel.U1.pin4,
          pin2: sel.U1.pin6,
        }}
      />

      <netlabel
        net="V3_3"
        anchorSide="bottom"
        schX={-3.4}
        schY={9}
        connectsTo={sel.R3.pin2}
      />
      <resistor
        resistance="10k"
        footprint="0603"
        name="R3"
        schSectionName="mprl"
        schX={-3.4}
        schY={8}
        schRotation={90}
        connections={{
          pin1: sel.net().RESET,
          pin2: sel.net().V3_3,
        }}
      />
      <netlabel
        net="RESET"
        anchorSide="top"
        schX={-3.4}
        schY={7}
        connectsTo={sel.R3.pin1}
      />

      <schematictext
        text="Clear I2C jumpers to disconnect"
        color="gray"
        anchor="left"
        schX={7.25}
        schY={8.6}
        fontSize={0.15}
      />
      <schematictext
        text="pull-up resistors"
        color="gray"
        anchor="left"
        schX={7.25}
        schY={8.4}
        fontSize={0.15}
      />

      <solderjumper
        schRotation={180}
        connections={{
          pin3: sel.R1.pin2,
          pin1: sel.R2.pin2,
          pin2: sel.net().V3_3,
        }}
        bridgedPins={[["1", "2", "3"]]}
        schSectionName="i2c_pullup"
        schX={6}
        schY={7.7}
        name="I2C_PU"
        footprint="solderjumper3_bridged123_pw0.66_pl1.270_p1"
        layer="bottom"
      />
      <resistor
        resistance="2.2k"
        footprint="0603"
        name="R1"
        schSectionName="i2c_pullup"
        schX={5}
        schY={6.1}
        schRotation={90}
      />
      <resistor
        resistance="2.2k"
        footprint="0603"
        name="R2"
        schSectionName="i2c_pullup"
        schX={7}
        schY={6.1}
        schRotation={90}
      />
      <netlabel
        net="SDA"
        schX={5}
        schY={5.1}
        connectsTo={sel.R1.pin1}
        anchorSide="top"
      />
      <netlabel
        net="SCL"
        schX={7}
        schY={5.1}
        connectsTo={sel.R2.pin1}
        anchorSide="top"
      />

      <schematictext
        text="Clear PWR jumper to"
        color="gray"
        anchor="left"
        schX={-7.85}
        schY={-1.35}
        fontSize={0.15}
      />
      <schematictext
        text="disconnect PWR LED"
        color="gray"
        anchor="left"
        schX={-7.85}
        schY={-1.55}
        fontSize={0.15}
      />

      <solderjumper
        name="PWR"
        pinCount={2}
        footprint="solderjumper2_bridged12_p1.041_pw0.660_ph1.270"
        bridgedPins={[["1", "2"]]}
        schSectionName="power_led"
        schX={-9}
        schY={-1}
        schRotation={90}
        layer="bottom"
        connections={{ pin1: sel.R4.pin2, pin2: sel.net().V3_3 }}
      />
      <resistor
        resistance="1M"
        footprint="0603"
        name="R4"
        schX={-9}
        schY={-2.35}
        schSectionName="power_led"
        schRotation={90}
        connections={{ pin1: sel.D1.pin1 }}
      />
      <led
        name="D1"
        color="red"
        footprint="0603"
        schSectionName="power_led"
        schX={-9}
        schY={-3.55}
        schRotation={-90}
      />
      <netlabel
        net="GND"
        schX={-9}
        schY={-4.55}
        connectsTo={sel.D1.pin2}
        anchorSide="top"
      />

      <SM04B_SRSS_TB_LF__SN2
        name="J1"
        schSectionName="connectors"
        schX={-1.5}
        schY={-6}
        pcbX={-7.4}
        pcbY={8.95}
        pcbRotation={180}
        connections={{
          pin1: sel.net().GND,
          pin2: sel.net().V3_3,
          pin3: sel.net().SDA,
          pin4: sel.net().SCL,
        }}
      />
      <SM04B_SRSS_TB_LF__SN
        name="J2"
        schSectionName="connectors"
        schX={3}
        schY={-6}
        pcbX={7.4}
        pcbY={8.95}
        pcbRotation={180}
        connections={{
          pin1: sel.net().GND,
          pin2: sel.net().V3_3,
          pin3: sel.net().SDA,
          pin4: sel.net().SCL,
        }}
      />

      <chip
        name="H1"
        footprint="pinrow2_p2.54mm"
        pinLabels={eocResetHeaderLabels}
        schPinArrangement={{
          rightSide: {
            direction: "top-to-bottom",
            pins: ["RESET", "EOC"],
          },
        }}
        schSectionName="connectors"
        schX={9}
        schY={-7}
        pcbX={5.08}
        pcbY={-10.16}
        pcbRotation={-90}
        manufacturerPartNumber="PRT-00116"
        supplierPartNumbers={{ sparkfun: ["PRT-00116"] }}
        connections={{
          pin1: sel.net().RESET,
          pin2: sel.net().EOC,
        }}
      />
      <chip
        name="H2"
        footprint="pinrow4_p2.54mm"
        pinLabels={qwiicHeaderLabels}
        schPinArrangement={{
          rightSide: {
            direction: "top-to-bottom",
            pins: ["SCL", "SDA", "3V3", "GND"],
          },
        }}
        schSectionName="connectors"
        schX={11.5}
        schY={-5}
        pcbX={10.16}
        pcbY={-7.62}
        pcbRotation={-90}
        manufacturerPartNumber="PRT-00116"
        supplierPartNumbers={{ sparkfun: ["PRT-00116"] }}
        connections={{
          pin1: sel.net().GND,
          pin2: sel.net().V3_3,
          pin3: sel.net().SDA,
          pin4: sel.net().SCL,
        }}
      />
    </board>
  )
}
