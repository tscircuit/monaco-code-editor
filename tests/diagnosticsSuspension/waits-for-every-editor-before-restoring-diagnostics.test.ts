import { expect, test } from "bun:test"
import { createRecordingDiagnosticsController } from "../fixtures/diagnosticsSuspensionFixtures"

test("a second editor's acquisition keeps diagnostics hidden until both finish", () => {
  const { controller } = createRecordingDiagnosticsController()

  const releaseFirst = controller.suspendSemanticDiagnostics()
  const releaseSecond = controller.suspendSemanticDiagnostics()

  releaseFirst()
  expect(controller.getDiagnosticsOptions().noSemanticValidation).toBe(true)

  releaseSecond()
  expect(controller.getDiagnosticsOptions().noSemanticValidation).toBe(false)
})
