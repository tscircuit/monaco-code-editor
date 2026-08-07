import { expect, test } from "bun:test"
import { createRecordingDiagnosticsController } from "../fixtures/diagnosticsSuspensionFixtures"

test("reconfiguring the language service mid-download does not restore hidden semantic errors", () => {
  const { controller } = createRecordingDiagnosticsController()

  controller.suspendSemanticDiagnostics()
  // A second editor mounting re-runs setup while types are still downloading.
  controller.setLanguageServiceEnabled(true)

  expect(controller.getDiagnosticsOptions().noSemanticValidation).toBe(true)
})
