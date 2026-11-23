# android/app/src/androidTest/java/ai/alphacompute/alphaphone/ScopedCalendarDeletionInstrumentedTest.java
- Lines: 60 (9.5 KB; lines up to 900 chars) | Role: in a disposable user, creates an owned local or synthetic-synced recurring calendar, then drives the deferred deletion journal (stage/undo/expire/replay), stale-revision conflict and series delete through `CalendarScopedDeletionReview` against the real CalendarProvider. | Verdict: SIMPLIFY
- Importers: none. Registry `ScopedCalendarDeletion` (`scripts/android-instrumentation.ts:280`, `secondaryUser`, arg `scopedCalendarDeletion`, grants calendar). Not in CI default lanes. Text/path pins: none.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 42 | C4 / P7 | Anonymous `DeferredDeletionJournal.Store` adapter over `AlphaCredentialStore` for `NativeDeletionCoordinator.JOURNAL` — the same adapter exists in main (`NativeDeletionCoordinator.java:24-28`, research P7). | Expose the production store adapter (package-private `NativeDeletionCoordinator.journalStore(context)`) and use it here, so the test exercises the shipped wiring. | Low. |
| 2 | 31-34, 53 | C3 | Disposable-calendar creation (`account_name`, `calendar_displayName`, sync-adapter URI) and exact cleanup are copied in 6 calendar tests (`CalendarDeletionReview`, `CalendarDeletionRestart`, `CalendarSyncProvider`, `CalendarUpgrade`, `CalendarCreationRecovery`, here). | One `CalendarFixture.create(resolver,name,type)` / `close()` in androidTest. | None. |
| 3 | 40, 44, 46, 48, 49 | D8 | `instances(resolver,calendarId,begin,end+3*86400000L)` evaluated 7 times with the same range; 900-char statement lines. | Local `int count()`; formatter. | None. |
| 4 | 41-49 | T5 | Most assertions are about upstream `DeferredDeletionJournal` (undo/expire/replay semantics) and `CalendarEventGuard.selectScopedDeletion` revision checks; Alpha-owned code is only `CalendarScopedDeletionReview.target/dispatch`. | Keep the provider round-trip (Alpha dispatch against a real provider); move the journal state-machine assertions (undo at 10099, replay refusal) upstream where `DeferredDeletionJournal` lives. | Low; upstream must own those checks first. |
| 5 | 23 | T8 | `localRecurrence…` loops the whole fixture 10 times to catch an intermittent ordering bug. | Keep only if the flake it guarded is still open; otherwise 1 iteration (owner question). | Low. |
| 6 | 57-58 | — | `providerEvidence` / `instanceEvidence` dump cursors only into failure messages. | Keep (failure diagnostics). | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| anonymous `DeferredDeletionJournal.Store` | type | 42 | `NativeDeletionCoordinator.java:24-28` (main) | production accessor |
| calendar fixture insert/cleanup | helper | 31-34, 52-54 | 5 other `Calendar*InstrumentedTest` files | `CalendarFixture` |
| `instances`, `instanceEvidence`, `providerEvidence` | helper | 57-59 | `CalendarDeletionReviewInstrumentedTest` has instance counts too | `CalendarFixture` |

## Proposed end state
~40 lines: shared calendar fixture, production journal store, Alpha dispatch/conflict/series assertions only; journal state-machine
checks live upstream. Exact owned-calendar cleanup (identity verified before sync-adapter delete) is preserved.

## Verification
`node scripts/android-instrumentation.ts --classes ScopedCalendarDeletion` (owned emulator, disposable secondary user).
