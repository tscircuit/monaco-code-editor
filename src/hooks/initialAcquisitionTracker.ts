export type InitialAcquisitionRun = {
  markStarted: () => void
  cancel: () => void
  settle: () => boolean
}

export type InitialAcquisitionTracker = {
  begin: () => InitialAcquisitionRun
  hasPending: () => boolean
}

type PendingRun = {
  active: boolean
  started: boolean
}

/**
 * Keeps an initial diagnostics suspension alive across overlapping requests.
 * A newer request can finish before an older one that is still downloading, so
 * completion belongs to the latest active run but waits for every run.
 */
export function createInitialAcquisitionTracker(): InitialAcquisitionTracker {
  // Membership doubles as "not settled yet": a run leaves the set exactly once.
  const pending = new Set<PendingRun>()
  let latestRun: PendingRun | undefined

  return {
    begin() {
      const run: PendingRun = { active: true, started: false }
      pending.add(run)
      latestRun = run

      return {
        markStarted() {
          run.started = true
        },
        cancel() {
          run.active = false
          if (!run.started) pending.delete(run)
        },
        settle() {
          if (!pending.delete(run)) return false
          return pending.size === 0 && latestRun?.active === true
        },
      }
    },
    hasPending() {
      return pending.size > 0
    },
  }
}
