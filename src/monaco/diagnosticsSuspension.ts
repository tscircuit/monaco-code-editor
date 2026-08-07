export type DiagnosticsOptions = {
  noSemanticValidation: boolean
  noSyntaxValidation: boolean
  onlyVisible: boolean
}

export type DiagnosticsController = {
  setLanguageServiceEnabled: (enabled: boolean) => void
  /**
   * Hides semantic errors while dependency types download — every import would
   * otherwise read as unresolved. Reference counted; releasing twice is a no-op.
   */
  suspendSemanticDiagnostics: () => () => void
  getDiagnosticsOptions: () => DiagnosticsOptions
}

/**
 * Owns the diagnostics flags so that suspending and reconfiguring cannot
 * clobber each other: both paths recompute from the same state.
 */
export function createDiagnosticsController(
  applyDiagnosticsOptions: (options: DiagnosticsOptions) => void,
): DiagnosticsController {
  let isLanguageServiceEnabled = false
  let suspensionCount = 0

  const getDiagnosticsOptions = (): DiagnosticsOptions => ({
    noSemanticValidation: !isLanguageServiceEnabled || suspensionCount > 0,
    // Syntax errors do not depend on downloaded types, so keep reporting them.
    noSyntaxValidation: !isLanguageServiceEnabled,
    onlyVisible: !isLanguageServiceEnabled,
  })

  const apply = () => applyDiagnosticsOptions(getDiagnosticsOptions())

  return {
    getDiagnosticsOptions,
    setLanguageServiceEnabled(enabled) {
      isLanguageServiceEnabled = enabled
      apply()
    },
    suspendSemanticDiagnostics() {
      suspensionCount += 1
      if (suspensionCount === 1) apply()

      let isReleased = false
      return () => {
        if (isReleased) return
        isReleased = true
        suspensionCount -= 1
        if (suspensionCount === 0) apply()
      }
    },
  }
}
