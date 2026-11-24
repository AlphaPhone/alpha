# specs/quint/application/CalendarPreservationConfirmation.qnt
- Lines: 0 (file no longer exists) | Kind: Quint model (deleted) | Verdict: DELETE (done in working tree)
- Deleted in this branch together with its manifest entry (D1: legacy calendar preservation, `runtime/legacy-calendar-preservation.ts`); `git grep CalendarPreservation` finds no remaining reference outside the audit folder.
- Follow-up: lower the application floor in `test/quint-checker.test.mjs` if it still counts this model; no harness or test wrapper referenced it.
