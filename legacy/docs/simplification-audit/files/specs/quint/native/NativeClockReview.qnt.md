# specs/quint/native/NativeClockReview.qnt
- Lines: 245 | Kind: Quint model (live, `native` manifest; JVM refinement harness) | Verdict: KEEP; trim the legacy terminal-replay seed when Q-LEG-7/Q-AND-4 is settled
- Covers: Alpha's Clock review dialog → one-use approval token → single external Clock handoff → journal receipt that must match the native receipt. Duplicates: `native/DeviceActions.qnt:2` defers Clock evidence to this model; `application` `WorkflowClockAdmission` covers the renderer side; androidTest `ClockHandoffInstrumentedTest`. Callers/importers: `native/manifest.json` (10 tests, 5 invariants), harness `refinement/native/clock-review.mjs` + `clock-review-platform.mjs` + `ClockReviewTraces.java`; `test/quint-native-clock-review.test.mjs`; native aggregate; mentioned in `application/manifest.json:6423`, README `:112,594`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5, 139-141, 168, 197, 216-218 | A1 | `seedLegacy`, the `legacy` flag, the `s.legacy` escape in `TypedReceiptHasProducer` and `exactLegacyTerminalReplayRemainsIdempotentTest` model "an old durable terminal row" without a `clockReview` receipt (`AlphaActionJournal.java:54-56` comment "Preserve exact legacy terminal replays"; delete-candidates B15, Q-LEG-7). On a fresh package no such row exists. Note the Java `replay` boolean also makes same-row re-finishes idempotent, which is current behaviour. | If the owner confirms Q-LEG-7: delete `seedLegacy`, `legacy`, the test, the harness case `legacy-exact-replay` (`ClockReviewTraces.java:252-257,314-323`), and narrow the Java branch to the current-row replay. | M |
| 2 | 154-161 | - | `corruptBinding` models tampered bytes; that is input validation of stored data, current behaviour. | Keep. | - |
| 3 | harness | - | All product and upstream Clock/journal classes compile whole; no text slicing of product files. | None. | - |
| 4 | test wrapper | T4, B5 | Run twice; pins `traces 27`, `observedFields 19`. | One runner; `> 0`. | L |

## Proposed end state
Same model without the legacy seed once Q-LEG-7 is answered; the harness keeps compiling the real classes.
