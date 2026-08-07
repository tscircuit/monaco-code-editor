import { expect, test } from "bun:test"
import { createRecordingDiagnosticsController } from "../fixtures/diagnosticsSuspensionFixtures"

test("releasing a suspension never enables validation for a disabled language service", () => {
  const { controller } = createRecordingDiagnosticsController({
    enableLanguageService: false,
  })

  const release = controller.suspendSemanticDiagnostics()
  release()

  expect(controller.getDiagnosticsOptions()).toMatchObject({
    noSemanticValidation: true,
    noSyntaxValidation: true,
    onlyVisible: true,
  })
})
