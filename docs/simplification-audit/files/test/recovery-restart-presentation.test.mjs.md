# test/recovery-restart-presentation.test.mjs
- Lines: 67 | Kind: transplant (T2) | Verdict: DELETE
- Covers: `ResidentRecoveryPanel` shows one Restart action, no details and no token; Settings rows show Status + Restart Alpha, details only behind the Developer gate. Duplicates: Playwright `test/browser/resident-recovery.production.spec.ts` renders the real panel; `settings-truth.production.spec.ts` covers Settings rows. Callers/importers: npm test (`scripts/run-node-tests.ts` glob `test/*.test.mjs`), so `npm run verify` and the `browser.yml` verify job.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-10 | T2 | Compiles `connection-ui.tsx` from `function ResidentRecoveryPanel(` to end of file and runs it in a vm. | Delete. | Low |
| 2 | 25-35 | T2 | Slices `settings-adapter.ts` between two indentation-exact anchors. | Delete; a journey step (`journeys/settings.spec.ts`: recovery state shows Status and Restart Alpha, no Details without developer tools) carries it. | Low |

## Proposed end state
- Removed; Playwright production specs own the copy and gating.
