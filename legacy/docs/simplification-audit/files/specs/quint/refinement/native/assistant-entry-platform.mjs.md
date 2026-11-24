# specs/quint/refinement/native/assistant-entry-platform.mjs
- Lines: 230 | Kind: Quint harness platform (extends `main-activity-platform.mjs` with Android/Capacitor stubs, edits stub text by anchors, and text-slices `AlphaLocalAgentPlugin.java` and `AlphaNavigationService.java`) | Verdict: PORT
- Covers: compile environment for model `NativeAssistantEntry`: assistant/Power activities, MainActivity re-entry through a modified Capacitor `BridgeActivity`, Quick Settings tile, Power launch pin with closed credential ports. Callers: `assistant-entry.mjs:7,36` only.

## Text anchors (T10)
- `AlphaLocalAgentPlugin.java`: `' static final class PowerLaunchPin'` .. `' private final java.util.Set<String> cancelledStarts'` and `' @PluginMethod public void launchSurface('` .. `' /** Read-only: may this surface'` (verified present).
- `AlphaNavigationService.java`: regex `static final String ACTION_SHOW_MAPS="..."` (exactly one).
- `vendor/eliza/plugins/plugin-native-system/test/sense-client-stubs.json` (upstream test stubs reused).
- 15 `edit(path, from, to)` rewrites of the stub texts from `main-activity-platform.mjs` (Intent, Build, BridgeActivity, Bridge), each asserting a unique anchor.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 156-176 | T10 | Slices two regions of the 1.4k-line `AlphaLocalAgentPlugin` (D1 god module). `delete-candidates.md` B4 marks `launchSurface`/`PowerLaunchPin` D7-keep, so the code stays; the slice will break on the planned split. | Move `PowerLaunchPin` and `launchSurface`'s admission logic into `PowerLaunch.java` (part of the `AlphaLocalAgentPlugin` split) and compile it whole. | Medium |
| 2 | 30-33, 102-137 | C5 / T10 | Builds stubs by string-editing other stubs (`edit` with unique-anchor asserts). Two layers of text surgery over test code. | Fold the needed members into `main-activity-platform.mjs` stubs directly (or into checked-in `.java` port files) so no stub is edited at run time. | Low |
| 3 | 36-40 | T10 | Regex-extracts one constant from `AlphaNavigationService`. | Move `ACTION_SHOW_MAPS` to `NavigationOpenRequest` (already compiled whole by the driver) or compile the service with ports. | Low |
| 4 | 167-176 | — | Credential port with account/generation/production switches drives the power-denied cases. | Keep. | — |

## Proposed end state
Checked-in Java port files (Activity, Intent, Bridge, Tile, PackageManager) instead of edited strings; `PowerLaunch.java` compiled whole; no product text slices.
