# specs/quint/refinement/native/clock-review-platform.mjs
- Lines: 231 | Kind: Quint harness platform (Android dialog/handler/activity/keyguard stubs plus a text-sliced tail of `AlphaActionJournalPlugin.java`) | Verdict: PORT
- Covers: compile environment for model `NativeClockReview`: Clock review dialog, main-thread posting with a hold point, activity start outcomes (`missing`, `denied`, `unknown-before/after`), keyguard lock. Callers: `clock-review.mjs:8,25`.

## Text anchors (T10)
- `AlphaActionJournalPlugin.java`: regex `^ private static JSONObject read\(...` (one line) and everything from `' private final android.os.Handler clockMain'` to the last `}`; asserts the tail contains `'ClockAgentReview.abandon(this)'`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4-22 | T10 | Takes the tail of the same file whose head `action-recovery-platform.mjs` takes; the generated class re-declares imports and the `createJournal` override by hand. | Split the plugin (Clock journal members into `ClockJournalReview.java`); compile it whole. Same change as the action-recovery port. | Medium |
| 2 | 184-229 | C5 | Capacitor and journal-result stubs duplicate `action-recovery-platform.mjs`. | Shared `journal-ports.mjs`. | Low |
| 3 | 227-229 | D7 | Shadow `System` class in the product package to fix the clock. | Inject a clock into the extracted class. | Low |
| 4 | 78-98, 138-169 | — | Handler hold point and dialog `deliver` after dismissal model the late-callback race explicitly. Good. | Keep. | — |

## Proposed end state
Android ports only (checked-in or generated), whole `ClockJournalReview` and `ClockAgentReview` compiled, shared journal stubs, injected clock.
