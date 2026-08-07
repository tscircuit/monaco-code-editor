import { expect, test } from "bun:test"
import { createRecordingDiagnosticsController } from "../fixtures/diagnosticsSuspensionFixtures"

test("nested suspensions do not re-push diagnostics options, which would wipe and redraw markers", () => {
  const { applied, controller } = createRecordingDiagnosticsController()
  const appliedAfterSetup = applied.length

  const releaseFirst = controller.suspendSemanticDiagnostics()
  const releaseSecond = controller.suspendSemanticDiagnostics()
  releaseFirst()
  releaseSecond()

  // Only the transitions in and out of "suspended" reach the language service.
  expect(applied.length - appliedAfterSetup).toBe(2)
})
