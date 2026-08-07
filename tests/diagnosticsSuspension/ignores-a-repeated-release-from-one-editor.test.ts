import { expect, test } from "bun:test"
import { createRecordingDiagnosticsController } from "../fixtures/diagnosticsSuspensionFixtures"

test("releasing one editor's suspension twice does not restore another editor's diagnostics", () => {
  const { controller } = createRecordingDiagnosticsController()

  const releaseFirst = controller.suspendSemanticDiagnostics()
  controller.suspendSemanticDiagnostics()

  releaseFirst()
  releaseFirst()

  expect(controller.getDiagnosticsOptions().noSemanticValidation).toBe(true)
})
