# test/recovery-restart-action.test.mjs
- Lines: 62 | Kind: transplant (T2) | Verdict: DELETE; REWRITE behaviour into `test/integration/resident-runtime.test.ts`
- Covers: Resident recovery restart: fresh review before confirmation; refuse when busy/background/connected/unsupported; start only after a complete matching native archive; Try again only for runtime-identity refusal. Duplicates: Playwright `resident-recovery.production.spec.ts`; Quint `quint-resident-liveness` (restart replies keep their epoch). Callers/importers: npm test (`scripts/run-node-tests.ts` glob `test/*.test.mjs`), so `npm run verify` and the `browser.yml` verify job.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-6, 25 | T2 | Slices `runtime/connection-ui.tsx` between `  async restartRecovery()` and `  cancelRecoveryReview()`, and between `  async reviewRecovery()` and `  async restoreSavedSignIn()`, evaluated in a vm. | Delete. Carry 4 cases once `connection-ui` exposes the recovery controller (D1 god-module split): restart = review then confirm; incomplete/mismatched archive never starts; background renderer refuses confirm; Try again only for `runtime-identity-unavailable`. | Medium |

## Proposed end state
- File removed; four cases in the resident-runtime integration test.
