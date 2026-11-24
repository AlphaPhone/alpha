# specs/quint/refinement/native/scoped-calendar-review-platform.mjs
- Lines: 177 | Kind: refinement fixture (generated Android/Capacitor ports + staged upstream guard classes) | Verdict: SIMPLIFY (KEEP)
- Covers: closed ports for `scoped-calendar-review.mjs` (Activity, AlertDialog, Keyguard, Lifecycle, ContextCompat permission reads, a fake `AlphaCalendarPlugin` enqueue). Duplicates: Capacitor `PluginCall`/`JSObject` and Android `Activity`/`AlertDialog`/`Context` stubs are re-written in nearly every `*-platform.mjs` (C5). Callers/importers: `scoped-calendar-review.mjs`; `calendar-sync-enable-platform.mjs` imports `calendarReviewPorts` (three entries).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 154-158,173-175 | B5 | Reads `android/upstream-native-sources.json`, filters `patches` for the calendar module and runs `materializeNativePatches`. The manifest has **0 patches** and `patches/eliza/` does not exist (`preparePatchedNative` even throws if patches are non-empty), so the staged guard files are byte copies of `vendor/eliza`. | Compile `vendor/eliza/plugins/plugin-native-calendar/.../CalendarEventGuard.java` and `read/CalendarSourceIdentity.java` directly; drop the staging, `expected` hashes and the temp `staged` dir. | L |
| 2 | 164-166 | T10 | Rewrites the upstream test fixture `ContentValues.java` at the literal `'public void put(String key,Long value)'` to add `size()` and an `Integer` overload. Breaks on any upstream reformat. | Write a complete local `ContentValues` stub (it is ~10 lines) instead of patching upstream text. | L |
| 3 | 121-135 | – | Fake `AlphaCalendarPlugin` (records staged deletions, `refuseStage`) stands in for the product plugin; acceptable port. | Keep. | – |
| 4 | 13-146 | C5 | Stub source strings duplicated across platforms. | Move common Android/Capacitor stubs to `refinement/native/support/` (one `PluginCall` with resolve/reject/answered, one `Activity`, one `AlertDialog` builder) and import. | M |
| 5 | 148-176 | – | Product models: `CalendarScopedDeletionReview`, `CalendarDeletionIdentity` (live, D18 keeps native Calendar). | Keep. | – |

## Proposed end state
~120 lines: shared stubs imported, local overrides only for focus/lock/lifecycle; vendor guard classes compiled from
`vendor/eliza` directly; no patch materialisation; one temp dir for generated ports only.
