# test/resident-recovery.test.mjs
- Lines: 84 | Kind: unit (real import of `apps/app/src/runtime/resident-recovery.ts`) + transplant (slice of `connection-ui.tsx` from `let residentRestartEpoch` into `vm`) | Verdict: DELETE
- Covers: native hard-block codes map to recovery copy; review/archive parsing bounds; liveness check throttling (one read per 10 s); a dead resident is retired once and restarted. Duplicates: `test/browser/resident-recovery.production.spec.ts` ("Restart needed", "Startup check failed", ipc-recovery states); `specs/quint/refinement/application/resident-liveness.mjs`. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-36 | T3/T4 | Copy and parser checks of pure functions whose visible results the production recovery spec drives. | Delete. | Low |
| 2 | 15-23 | B3 | Tests hand-written validators for data from our own native plugin (`parseRecoveryReview`, `parseRecoveryArchive`). | Keep validation at the bridge boundary; no separate test. | Low |
| 3 | 38-60 | T3 | Liveness throttle and boot-message wording; the throttle is modelled in `resident-liveness` refinement. | Delete. | Low |
| 4 | 61-84 | T2 | Marker slice of `connection-ui.tsx` with fake `retire`/`ensureResident`. | Delete. | Low |

## Proposed end state
File deleted. If `resident-recovery.production.spec.ts` does not yet show "dead resident restarts once with the boot
message", add that single case when it becomes `journeys/connection-cloud.spec.ts` (or `startup-permissions`).
