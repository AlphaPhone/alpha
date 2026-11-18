# specs/quint/refinement/native/RendererBackgroundRebuildReplay.java
- Lines: 233 | Kind: Quint forward replay (ITF traces generated from the model, replayed on two real `MainActivity` instances sharing the real `RendererRecoveryBudget`) | Verdict: KEEP
- Covers: live model `specs/quint/native/RendererBackgroundRebuild.qnt`: WebView renderer loss while the surface is in the background: rebuild waits for the next start, background reclaims do not spend the crash budget, one shared crash is counted once across two surfaces, hidden HOME shows the escape view past the budget, backoff recreation, 60 s window. Duplicates: `FinitePolicyTraces` (`RendererRecovery`) covers the budget helper alone; androidTest renderer-recovery suites cover the device. Runs in `test/quint-renderer-background-rebuild.test.mjs` and in the aggregate through `forward-replays.mjs:34`.
- Callers/importers: `renderer-background-rebuild.mjs` (`checkRendererBackgroundRebuild`, via `itf-replay.mjs:replayJava`).

## How it is tied to product code
- Whole-file compile of `MainActivity.java`, `RendererRecoveryBudget.java`, `NavigationOpenRequest.java` with `MainActivityPorts.java` and `main-activity-platform.mjs` stubs. The platform regex-reads `MainActivity.java` for `registerPlugin(X.class)` names to generate empty plugin stubs and `AlphaNavigationService.java` for `ACTION_SHOW_MAPS` (mild T10 in the platform, not here).
- Reflection: `MainActivity.recoveryBudget`, `rendererDeathsAtCreate`, `recoveringRenderer`, `pendingRebuild`, private `showsHome()`; budget `lossesInWindow`, `started`, `windowStart`; constants `BACKOFF_MS`, `WINDOW_MS`. Overrides `isAssistantSurface()`; uses stub fields `taskId`, `recreates`, `content`.
- This is the style the brief asks for (real classes, no text slicing in the harness).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 143-160 | T10 (reflection) | Seven private `MainActivity`/budget fields pinned. The planned `MainActivity` split (D1 god module) will move them. | When `MainActivity` is split, have the renderer-recovery part own these fields in one class and read them there. | Medium (coupled to the structural pass) |
| 2 | sources | follow-up | `NavigationOpenRequest.java` is slated to be nested into `MainActivity` (cross-file-actions §A63). | Drop it from the source list in that change. | Low |
| 3 | test | B5 | `test/quint-renderer-background-rebuild.test.mjs` asserts exact counts (`traces === 65`, `steps > 1000`, `reached.length === 7`). | Keep "every witness reached" and "every required action replayed"; drop exact counts. | None |
| 4 | campaign | T4 | Per-model test plus `forward-replays.mjs` in the aggregate. | One runner. | None |

## Proposed end state
Unchanged harness. Field reads follow the `MainActivity` split. Run once from the native family runner.
