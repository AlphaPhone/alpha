# specs/quint/refinement/native/ClockReviewTraces.java
- Lines: 422 | Kind: Quint refinement harness (Java trace driver, real product classes compiled with stubs) | Verdict: PORT
- Covers: model `specs/quint/native/NativeClockReview.qnt` (live, native manifest): agent-proposed Clock hand-off review: dialog approval, opaque one-shot review token, dispatch to an external Clock activity, journal settlement and refusal of fabricated outcomes, across two plugin instances (old bridge vs successor). Duplicates: none at behaviour level (only the Quint replay covers this; `test/quint-native-clock-review.test.mjs` re-runs the same campaign, as does the native aggregate `index.mjs`).
- Callers/importers: `clock-review.mjs` (`clockReviewSourceTraces`, `checkNativeClockReview`), `clock-review-platform.mjs` (writes the `ClockReviewSupport.java` stub that calls back into `ClockReviewTraces.slots/write/now`). Run by `test/quint-native-clock-review.test.mjs` and `refinement/native/index.mjs:195` (aggregate, `test/quint-native-refinement.test.mjs`).

## How it is tied to product code
- Compiles whole files: `ClockAgentReview.java`, `AlphaActionJournal.java`, `PluginWorkers.java` (app) and upstream `ActionJournal*`, `ClockHandoff`, `ClockDays` (pinned by sha256 against `upstream.lock.json`).
- **Text slice (T10)**: `clock-review-platform.mjs:clockJournalBridge` cuts `AlphaActionJournalPlugin.java` at the regex `^ private static JSONObject read\(` and from the literal `' private final android.os.Handler clockMain'` to the last `}`, and asserts the tail contains `ClockAgentReview.abandon(this)`. Everything above `clockMain` (other journal kinds) is dropped and replaced by throwing stubs (`CalendarAvailabilityJournalResult`, `SmsActionJournalResult`).
- Reflection pins on private members: `ClockAgentReview.open` (static map keyed `scope:id`, row field `owner`), `AlphaActionJournalPlugin.worker` (ExecutorService). Package-private stub shadows `System.currentTimeMillis` via a same-package `System` class.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | platform `clockJournalBridge` | T10 | Product plugin source is cut at two literal anchors; any reorder, split (AlphaActionJournalPlugin is SIMPLIFY) or Prettier run breaks it. | Move the Clock bridge members (`clockMain`, `clockWork`, `reviewClock`, `confirmClock`, `cancelClock`, `abandon` call) into their own class (e.g. `ClockJournalBridge.java`) that the plugin delegates to, then compile it whole. Or compile the full plugin with real `CalendarAvailabilityJournalResult`/`SmsActionJournalResult`. | Medium: model behaviour must stay byte-identical. |
| 2 | 105-112, 154-158 | T10 | `Trace.read(plugin,"worker")` and reflective read of `ClockAgentReview.open` pin private field names. | Expose package-private `ownerFor(scope,id)` / `drainForTest` is D7; prefer a package-private accessor already used by product or keep reflection but list it in the harness header. | Low |
| 3 | 252-258, 314-324 | A1 (check) | Scenario `legacy-exact-replay` seeds "a shape the original source could persist before any nested marker existed". D1 says no prior install base, but a terminal row without `clockReview` can also be produced today by a bare-unknown settle (`fabricated-outer` ends with one), so the readback-only rule is still live. | Keep the case; rename `seedLegacy`/`legacy` to `seedUnmarkedTerminal`/`unmarked` and the comment, in the same change as the model's `legacy` field. | Low; model field rename needs the `.qnt` and expected traces updated together. |
| 4 | 280-418 | D9 | 27 scenarios in one `switch` with one-line chains; readable enough as a script. | None beyond formatting (Prettier does not cover Java; leave). | None |
| 5 | campaign | T4/P3 | Same campaign runs in the per-model test and in the native aggregate. | Keep one runner (see chunk summary). | None |

## Proposed end state
Keep the harness and all 27 scenarios (the model is live and the code is product). Replace the text-sliced
`AlphaActionJournalPlugin` bridge with a compiled whole class once the Clock members are extracted (or compile the
whole plugin with its real collaborators). Rename the `legacy` scenario to `unmarked-terminal`. Run once, from the
native family runner only.
