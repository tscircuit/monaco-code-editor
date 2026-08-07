import {
  createDiagnosticsController,
  type DiagnosticsOptions,
} from "../../src/monaco/diagnosticsSuspension"

/** A controller plus the diagnostics options it pushed to the language service. */
export function createRecordingDiagnosticsController({
  enableLanguageService = true,
}: {
  enableLanguageService?: boolean
} = {}) {
  const applied: DiagnosticsOptions[] = []
  const controller = createDiagnosticsController((options) => {
    applied.push(options)
  })
  controller.setLanguageServiceEnabled(enableLanguageService)
  return { applied, controller }
}
