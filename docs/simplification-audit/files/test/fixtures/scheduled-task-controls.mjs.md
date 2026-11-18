# test/fixtures/scheduled-task-controls.mjs
- Lines: 222 | Kind: integration fixture (esbuild-bundles the real `automations-adapter.ts` + `automations-route-policy.ts` with 11 port stubs; runs in `vm`) | Verdict: KEEP (simplify)
- Covers: Workflows scheduled-task controls (edit instructions/time/days, fire, snooze, reopen, acknowledge/complete/dismiss): owner-scoped pending-intent storage, one in-flight POST, exact-response matching (wrong id, raced, transport lost), owner switch, leaving the view, partial/failed catalog. Duplicates: `test/scheduled-task-controls.test.mjs` runs the same fixture; Workflows Playwright specs cover the visible controls. Callers/importers: `test/scheduled-task-controls.test.mjs:3`, `specs/quint/refinement/application/scheduled-task-controls.mjs:3` (registered `application/index.mjs:61`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 37-57 | — | Bundles real modules (no text slicing); the template the reminder fixtures should follow. | Keep. | — |
| 2 | 23, 44-55 | B5 | Hashes the fixture, `prepare-client-features.ts`, `upstream.lock.json` and every bundled file into `hashes` (consumed as `driverHashes` by `specs/quint/refinement/application/scheduled-task-controls.mjs:61`), and asserts staged `.eliza/client-features` bytes equal `vendor/eliza` bytes, which duplicates `checkClientFeatures` in `scripts/prepare-client-features.ts`. | Drop the staged-vs-vendor assertion. Keep the hash map only while `check-traces.mjs` keeps before/after driver-hash capture; if that ceremony is removed repo-wide (B5), drop it here too. | Low |
| 3 | 25-35 | D3 | Port for `../runtime/connection-ui` hard-codes `agentPendingText`/`agentAvailabilityNotice`; any new import from connection-ui breaks the bundle loudly (good) but the list is long. | Keep; shrink as `connection-ui.tsx` splits (stage F). | Low |
| 4 | 121 | B4 | Wraps `Intl.DateTimeFormat` to force UTC. | Keep (deterministic clock), but move to a shared `utcIntl` helper if other fixtures need it. | — |
| 5 | 159, 213 | D8 | Long single-line day-selection expressions. | Name a `DAY_NAMES` constant and split. | — |

## Proposed end state
~190 lines: same bundle and ports, no hash bookkeeping, a named `DAY_NAMES` constant; the per-model host test is dropped in favour of the family runner.
