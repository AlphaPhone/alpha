# specs/quint/refinement/native/renderer-background-rebuild.mjs
- Lines: 40 | Kind: Quint ITF replay (simulator traces replayed on real `MainActivity` + `RendererRecoveryBudget`, one JVM per trace) | Verdict: KEEP
- Covers: WebView renderer loss in the background: rebuild on next start, uncounted reclaims, escape view on a hidden HOME surface, backoff recreation, one shared death spent once, surfaces overtaken by late reports, 60 s window reset. Model `RendererBackgroundRebuild`. Duplicates: none (`renderer-coordinator.mjs` covers foreground recovery). Callers/importers: `native/forward-replays.mjs:14`, `test/quint-renderer-background-rebuild.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-14, 21 | C5 | Overwrites `main-activity-platform.mjs`'s `Lifecycle.java` after generation. Works, but is another per-harness stub override. | Give the shared stub a settable state (`Lifecycle.state` already public) and set it from the harness Java. | Low |
| 2 | 25 | — | Lists `NavigationOpenRequest.java`; delete-candidates A63 folds it into `MainActivity`. | Update the list in that change. | Low |
| 3 | 18 | cost | 60 sampled traces + 5 witnesses, each in its own JVM (≈65 JVM starts). | Acceptable; path-filter the lane to `MainActivity.java`, `RendererRecoveryBudget.java` and the model. | — |

## Proposed end state
Unchanged apart from the source list and stub override.
