# specs/quint/refinement/native/ScopedCalendarReviewTraces.java
- Lines: 189 | Kind: Quint refinement harness (whole product `CalendarScopedDeletionReview.java`, `CalendarDeletionIdentity.java`, driven through a stub-backed `AlphaCalendarPlugin` from `scoped-calendar-review-platform.mjs`, with staged upstream `CalendarEventGuard`/`CalendarSourceIdentity`) | Verdict: KEEP
- Covers: native review of a single-occurrence Calendar deletion: inspection returns an exact ticket; review refuses forged/mismatched keys, visible-field mismatch, expiry, provider/source change, competing review, pause/destroy, revoked permission, lock, stop, refused enqueue; a held inspection cannot commit across pause/destroy. Duplicates: none (Android-only flow; renderer Calendar specs do not reach it). Callers/importers: `scoped-calendar-review.mjs` (`generateScopedCalendarReviewTraces`, `checkNativeCalendarScopedReview`) <- `index.mjs`, `test/quint-native-calendar-scoped-review.test.mjs`.
- Model live: `specs/quint/native/NativeCalendarScopedReview.qnt`. Native Calendar bridge stays (DECISIONS D18).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 34-55, 80, 93, 116 | T10 | Reflection on `CalendarScopedDeletionReview` privates `tickets`, `target`, `expires`, `reviewing`, `epoch`, `retired`. | Keep; harness contract. | low |
| 2 | 87-92 | T10 | Holds inspection at the 4th permission read (`count!=4`): pins the number of `checkSelfPermission` calls on the inspect path. A refactor that reads permission once fewer silently changes the hold point (the latch then times out: loud, not silent). | Keep; comment already explains. | low |
| 3 | 135 | — | Asserts dialog copy contains `"Series"` and `"This occurrence only"`: real user-visible review text. | Keep. | none |
| 4 | driver `scoped-calendar-review.mjs:47-55` | A7 | `--observe` / direct-run CLI branch; no script or test invokes it (git grep `--observe`: only this file, `calendar-sync-enable.mjs`, `navigation-progress.mjs`). | Delete the CLI branches. | low |
| 5 | driver `scoped-calendar-review-platform.mjs:165` | T10 | Rewrites vendor `ContentValues` fixture text (`'public void put(String key,Long value)'`). Upstream-only surface. | Keep or ask upstream for the overload. | low |
| 6 | test | B5 | `traces === 19`, `observedFields.length === 22`. | Assert `passed`. | low |

## Proposed end state
Unchanged harness; driver without the CLI branch. Path filter: `CalendarScopedDeletionReview.java`, `CalendarDeletionIdentity.java`, `AlphaCalendarPlugin.java`, `upstream.lock.json`, `android/upstream-native-sources.json`, `patches/eliza/**`, `NativeCalendarScopedReview.qnt`, this directory's calendar files.
