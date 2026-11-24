# specs/quint/application/BrowserDeletionPoll.qnt
- Lines: 47 | Kind: Quint model (application family, live: registered in `specs/quint/application/manifest.json`) | Verdict: KEEP; move `deferred` import off the legacy tree
- Covers: Two overlapping journal-retention polls on one expired queued deletion commit it exactly once; a failed edit leaves the work for another poll; a too-young row is skipped. Models: `browser/journal-retention.ts` (also Lemma-proved: `deletionSettled`, `settledDeletionsToTrim`), `browser/calendar.ts`, `browser/daily.ts`, `browser/calendar-store.ts`, `browser/reminder-store.ts` (exist). Duplicates: Lemma `journal-retention.dfy` proves the pure retention rule; this model covers the concurrency. Callers/importers: manifest (3 tests); `scripts/check-quint.ts` default gate (typecheck + every manifest `tests` run + simulation) via `npm run quint:check`; changed-model symbolic verify via `scripts/ci/check-changed-models.ts` when a manifest source changes; harness `refinement/application/browser-deletion-poll.mjs` (imports real stores through `test/fixtures/browser-daily-stores.mjs`, uses `AsyncLocalStorage` to interleave) via `test/quint-browser-deletion-poll.test.mjs` and `refinement/application/index.mjs` aggregate (run by `test/quint-application-refinement.test.mjs`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness 5 | P6 | Imports `deferred` from `specs/quint/legacy/core/source-support.mjs`, one of the three live dependencies that block retiring `specs/quint/legacy`. | Import `deferred` from `refinement/application/support.mjs` (it already exports one) and drop the legacy import. | Low |
| 2 | 1-47 | — | Small, precise model; import-based harness. | Keep. | — |
| 3 | product | A1 | `calendar-store.ts:11`, `reminder-store.ts:6` legacy envelope readers are deleted by C6; the harness fixture must still seed current-format rows. | Check `browser-daily-stores.mjs` seeds only current envelopes after C6. | Low |

## Proposed end state
Unchanged model; harness imports `deferred` from live support code; runs once.
