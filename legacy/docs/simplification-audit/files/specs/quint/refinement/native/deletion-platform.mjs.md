# specs/quint/refinement/native/deletion-platform.mjs
- Lines: 161 | Kind: Quint refinement fixture builder (Android/WorkManager stubs and product-class ports as JS strings) | Verdict: KEEP (move stubs to files)
- Covers: ports for `deletion-coordinator.mjs` (`DeletionJournal`). Stubs product classes `AlphaCredentialStore`, `AlphaLocalAgentPlugin`, `AlphaCalendarPlugin`, `CalendarSyncBridge`, `CalendarScopedDeletionReview`, `CalendarDeletionIdentity`, `AlphaReminders`, `DeletionWorker`, upstream `CalendarPlugin`. Duplicates: Android `Context`/`SystemClock`/`Settings` stubs exist in 6+ sibling platform files. Callers/importers: only `deletion-coordinator.mjs:7`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 120-126 | A1 follow-up | `CalendarDeletionIdentity` stub throws `"Unexercised legacy calendar identity"`; the real class still carries a `legacy` flag (`CalendarDeletionIdentity.java:8`), which C2 (legacy calendar authority) may remove. The stub only needs `eventId`, so it survives that deletion. | Rename the message when C2 lands. | None |
| 2 | 91-119 | T10 (signature pins) | Stubs replicate exact static signatures of `CalendarSyncBridge.deletionRefusal/dispatchDeletion`, `CalendarScopedDeletionReview.dispatch`, `AlphaReminders.Engine.*`; a product signature change breaks compilation (loudly, which is acceptable). Android side of Calendar sync is kept (D18). | Keep; list these signatures in the product reports so renames update the stub. | Low |
| 3 | 8-152 | D6 / C4 | 150 lines of Java as strings. | Committed `stubs/deletion/*.java`. | Low |
| 4 | 153-160 | C3 | Temp-dir write loop duplicated across the folder. | Shared helper (`java.mjs`). | None |

## Proposed end state
A folder of stub `.java` files passed straight to `javaTraceCampaign`; this module disappears or shrinks to returning the folder path.
