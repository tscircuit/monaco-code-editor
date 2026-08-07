import { expect, test } from "bun:test"
import { createRecordingDiagnosticsController } from "../fixtures/diagnosticsSuspensionFixtures"

test("suspending keeps reporting syntax errors, which do not depend on downloaded types", () => {
  const { controller } = createRecordingDiagnosticsController()

  controller.suspendSemanticDiagnostics()

  expect(controller.getDiagnosticsOptions()).toMatchObject({
    noSemanticValidation: true,
    noSyntaxValidation: false,
  })
})
