# test/browser-deletion-recovery.test.mjs
- Lines: 20 | Kind: unit (T3; esbuild-transforms the real `apps/app/src/browser/deletion-recovery.ts` and imports it via a data URL) | Verdict: DELETE
- Covers: recovering a terminal-unknown calendar-delete journal entry from a saved deletion receipt only when scope/proposal/hash/owner/revision all match. Duplicates: `specs/quint/refinement/application/browser-reminder-orphan.mjs` reads/drives `deletion-recovery.ts`; Playwright `calendar-delete-completion.spec.ts`, `calendar-delete-review.spec.ts`. Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-6 | T3, C3 | Hand-rolled `transformSync` + data-URL import; Node 26 type stripping or `tsx` imports the module directly. | n/a (delete) | none |
| 2 | 7-20 | T3 | Pure function with hand-built records; identity-mismatch matrix is a property of one comparator. | Delete; if wanted, one case in the calendar integration: "a reload after an unknown delete outcome shows the deleted result only for the same event revision". | low |

## Proposed end state
Delete. `browserDeletionRecovery` stays covered by the Quint orphan/deletion refinement and the calendar delete journeys. No product export becomes test-only (it is imported by `browser/deletions.ts`).
