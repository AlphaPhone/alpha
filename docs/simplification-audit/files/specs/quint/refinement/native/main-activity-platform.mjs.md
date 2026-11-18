# specs/quint/refinement/native/main-activity-platform.mjs
- Lines: 587 | Kind: Quint refinement fixture (≈60 Android/AndroidX/Capacitor stub classes as strings; plugin stubs **generated from MainActivity source text**) | Verdict: KEEP (move stubs to files; drop text reads)
- Covers: ports under which the real `MainActivity` runs for `HomeInstanceHandoff`, `RendererBackgroundRebuild`, `RendererRecovery` coordinator, text-scale lifecycle and assistant entry. Exports `navigationRequestSource`, `navigationActionSource` (used by `renderer-coordinator.mjs`, `text-scale-lifecycle.mjs`). Callers/importers: `home-instance-handoff.mjs`, `renderer-background-rebuild.mjs`, `renderer-coordinator.mjs`, `text-scale-lifecycle.mjs`, `text-scale-platform.mjs`, `assistant-entry.mjs`, `assistant-entry-platform.mjs`.

## Text pins (T10)
- `AlphaNavigationService.java`: regex `/\bstatic final String ACTION_SHOW_MAPS="([^"]+)";/g`, asserted to match once (562-566), to synthesise a stub with the same constant.
- `MainActivity.java`: regex `/registerPlugin\(([\w.]+)\.class\)/g` (572-579) to generate one empty `Plugin` subclass per registered plugin; special-cases `AlphaVoiceCloudPlugin.Streaming`.
- Hand-written stubs for product classes `AlphaImageCapability`, `AlphaDevicePlugin`, `AlphaVoiceCloudPlugin`, `AlphaTelephonyRoles`, `AlphaCanonicalNotifications`, `AlphaKeyboardDictationService`, `BuildConfig` must match what `MainActivity` calls (`MainActivity.java:58,359-362,430`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 562-566 | T10 | Reads a constant out of a product file by regex. | Compile the real `AlphaNavigationService.java` is heavy (service deps); instead move `ACTION_SHOW_MAPS` to `NavigationOpenRequest.java` (already compiled) and let both classes use it — then the regex and the synthetic stub go. Product change: one constant moves. | Low |
| 2 | 568-579 | T10 | Plugin stub list derived from `registerPlugin(...)` text. Works for any plugin set but ties the fixture to source formatting. | Acceptable short-term (it auto-follows plugin deletions such as Wallet); long-term, when `MainActivity` registers plugins from one list (`AlphaPlugins.ALL`), stub by reading nothing. | Low |
| 3 | 13-559 | D6 / C4 | 550 lines of Java in strings; `Intent`, `Context`-like `BridgeActivity`, `Lifecycle`, `Build`, `Log`, `ComponentName` duplicate (with different members) stubs in 6+ sibling platforms. | Committed `stubs/android/` base set shared by all native campaigns, with per-campaign overrides only where behaviour differs. | Medium (large, but mechanical) |
| 4 | 580-585 | C3 | Temp write loop. | Shared helper. | None |
| 5 | 544 | follow-up | `BuildConfig.ELIZA_DEV_ALLOW_TEST_MOCKS=false` — matches production gating; keep. | — | — |

## Proposed end state
A shared Android stub folder used by every MainActivity campaign; no product text read (constant moved, plugin list either
still regex-derived or from one product list). The module shrinks to returning the folder and generated plugin stubs.
