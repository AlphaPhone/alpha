# specs/quint/native/NativeCalendarScopedReview.qnt
- Lines: 118 | Kind: Quint model (live, `native` manifest; JVM refinement harness) | Verdict: KEEP
- Covers: Android scoped Calendar-deletion review: 60 s inspection ticket bound to the current pause epoch, provider re-read refuses changed events, foreground dialog, one canonical staging attempt. Duplicates: none (application `AgentCalendar*` models are the renderer/agent side). Callers/importers: `native/manifest.json` (11 tests, 6 invariants, `sharedSources` two upstream calendar classes), harness `refinement/native/scoped-calendar-review.mjs` + `scoped-calendar-review-platform.mjs`; `test/quint-native-calendar-scoped-review.test.mjs`; native aggregate.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness | - | Product tie is good: `CalendarScopedDeletionReview.java`, `CalendarDeletionIdentity.java`, `AlphaCalendarPlugin.java` compile whole; the platform file reads the manifest and a `ContentValues` stub only. | None. | - |
| 2 | 1-118 | - | Live code (scoped deletion is not part of the D4 linked-sync deletion). Invariants are concrete (`TicketHasCurrentEpoch`, `EnqueueResultAfterAttempt`). | None. | - |
| 3 | test wrapper | T4, B5 | Run twice; wrapper pins `traces 19`, `observedFields 22` and reads named trace fields. | One runner; `> 0`. | L |

## Proposed end state
Unchanged.
