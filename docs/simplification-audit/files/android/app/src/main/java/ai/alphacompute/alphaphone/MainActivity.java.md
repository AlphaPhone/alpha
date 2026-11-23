# android/app/src/main/java/ai/alphacompute/alphaphone/MainActivity.java
- Lines: 479 | Role: Capacitor `BridgeActivity`: one-live-instance HOME hand-off, renderer-crash recovery and native escape view, plugin registration, system-bar/IME insets, Back dispatch, notification/maps tap capture | Verdict: SPLIT
- Importers: 16 main files (`DailyAppsPlugin` insets, `AlphaKeyboardDictationService` keyboard hooks, `AlphaMapsTransportPlugin` nav-open, `AlphaDevicePlugin`/`AlphaLocalAgentPlugin` `isAssistantSurface`, `AlphaAssistActivity` subclass …), 144 androidTest files, manifest. Text/path pins (heavy): `test/gesture-zones-single-instance.test.mjs` (regexes exact lines 320/323), `test/renderer-recovery-budget.test.mjs`, `test/home-role-recovery-contract.test.mjs`, `test/maps-notification-open.test.mjs`, `test/native-popover-back.test.mjs`, `test/quint-back-dispatch.test.mjs`, `test/keyboard-dictation.test.mjs`, `test/photo-library.test.mjs`, `test/power-sense-entry.test.mjs`, `test/wallet-disabled.test.mjs`, `test/shade-tile-facts.test.mjs`, `test/aosp-image-capability.test.mjs`, `test/cloud-sign-in-flow.test.mjs` and ~25 more; `test/fixtures/app-update-jvm/.../MainActivity.java` stub; `specs/quint/native/manifest.json` (35 symbol pins incl. `isHomeTypeStart`, `isAssistantSurface`), `specs/quint/application/manifest.json` (7), `specs/quint/refinement/native/{MainActivityRecoveryTraces,HomeInstanceHandoffReplay,RendererBackgroundRebuildReplay}.java` and `main-activity-platform.mjs` (compile this file against stubs), `scripts/android-instrumentation.ts`, `scripts/apk.ts`, `scripts/verify-apks.ts`, `scripts/pilot-update.ts`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 22-479 | D1 (P3) | Five responsibilities in one activity: HOME-instance hand-off (158-296 + 299-327, ~170 lines incl. a 37-line comment), renderer recovery/escape view (61-157), plugin registration (328-366), insets/IME bridge (385-416), Back (417-432). | Extract `HomeInstanceHandoff` (static live-instance/task-kind state, `handOff`, `moveLiveTaskToFront`, front-marker), `RendererEscapeView` (`showRendererEscape`, `addEscapeButton`, `openSettings`) and `SystemInsetsBridge` (the insets listener + JS). MainActivity keeps lifecycle wiring. | High: Quint replays and `gesture-zones-single-instance.test.mjs` compile/regex this file; update them in the same change. Needs emulator HOME-role run (AGENTS.md). |
| 2 | 355 | A7 | `registerPlugin(AlphaListenerPlugin.class)` — the renderer never uses `"AlphaListener"` (0 hits in `apps/` and `.eliza/client-features`; only `test/always-on-listener.test.mjs:29`, `test/support/feature-parity.mjs:66`, `specs/quint/native/manifest.json:219,260`). | Delete the line with `AlphaListenerPlugin.java` and those pins. | Low. |
| 3 | 358-362 | A3 / D6 | Reflective `PasswordTransferPlugin` registration under test mocks; password transfer is PRD-excluded (A3); the renderer client is `apps/app/src/passwords/password-manager.ts:55-59` (test-mocks only) and `test/browser/password-manager.spec.ts:125-137`. | Owner decision: delete the block with the renderer transfer client and its spec, or record it in DECISIONS.md as a retained dev surface. | Low. |
| 4 | 28,38,39,41,60,73,299,315,401,429,446 | A4 (P14) | `isAssistantSurface()` is overridden only by `AlphaAssistActivity`, which is `android:enabled="false"` with no enabler (P-78). Every `!isAssistantSurface()` conjunct is constant-true in shipped builds. | If the owner retires P-78 entries: delete `isAssistantSurface()` and the 11 conjuncts (and `AlphaDevicePlugin:268`, `AlphaLocalAgentPlugin:516` checks). | Medium: owner decision on P-78. |
| 5 | 331 | A3 (P14) | `AlphaContactsPlugin` registered on every build while Contacts is deferred (`ContactsFlowInstrumentedTest` @Ignore). | Owner decision with P14. | Low. |
| 6 | 41-42, 135, 399-413, 426, 447, 470-471, 477-478 | C5 / B4 | `getBridge() != null && getBridge().getWebView() != null` repeated 5×; `evaluateJavascript("window.dispatchEvent(new Event('…'))", null)` 4× (`alpha:maps-open`, `launcher-home` ×2, `focus`). | Private `WebView page()` (null when absent) and `dispatch(String eventName)`. | Low; Quint `main-activity-platform.mjs` and `quint-back-dispatch.test.mjs` match these strings — update. |
| 7 | 399-400 | D8 | 400-character inline JS string built by concatenation for keyboard visibility. | Move the JS body into a constant with `%s` placeholders, or into the renderer as a listener for a single `alpha-native-insets` event carrying `{visible, handoff, top, bottom}` (replaces 3 `evaluateJavascript` calls per inset pass). | Medium: renderer contract `alpha-keyboard-visibility`, `--native-top-inset`, `--native-bottom-inset` must stay. |
| 8 | 473-478 | D8 | `onResume`/`onConfigurationChanged` packed on one line each; `applyTextScale` + bridge null check repeated 3× (384, 477, 478). | Format; one `applyTextScaleIfLoaded()`. | None. |
| 9 | 158-194 | A8 | 37-line narrative comment with measurement history ("measured on the API 36 emulator in round 7/8"). | Keep the rule (task activity types) in 6-8 lines; drop round numbers. | None (but some tests may grep comment text — none found). |
| 10 | 26, 38-39 | D7 | `NavigationOpenRequest` is a separate 14-line class only so javac can test it. | Nest it as a private static class here when its host test goes (see NavigationOpenRequest report). | Low. |
| 11 | 19 | — | Header says derived from upstream template `main-activity.ts`; this file has diverged entirely. | Drop "Derived from" or note it is product-owned. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `TaskKind` | class | 200-204 | — | `HomeInstanceHandoff` |
| `isHomeIntent` / `isHomeTypeStart` | helper | 208-214 | HOME-intent checks in `AlphaLocalAgentPlugin`/`AlphaSystemPlugin`? (not found) | `HomeInstanceHandoff` |
| `hasFrontMarker`, `FRONT_START_TOKEN`, `EXTRA_FRONT_START` | helper/const | 225-239 | — | `HomeInstanceHandoff` |
| `isCurrentHome` | helper | 78-93 | HOME-role read in `AlphaSystemPlugin`/`AlphaDevicePlugin` (role checks) | `AlphaHome.isCurrentHome(Context)` shared |
| `showRendererEscape` + `addEscapeButton` + `openSettings` | helper | 100-132 | — | `RendererEscapeView` |
| `voiceKeyboardSelected` | helper | 55-59 | `AlphaKeyboardDictationService` IME selection check | here |

## Proposed end state
MainActivity ≈ 260 lines: lifecycle overrides, plugin registration (minus AlphaListener and dev transfer), renderer-loss hook
delegating to `RendererRecoveryBudget` + `RendererEscapeView`, insets via `SystemInsetsBridge`, hand-off via
`HomeInstanceHandoff.onCreate(this)`. New files ≈ 200 lines total. If P-78 is retired, `isAssistantSurface` goes too.

## Verification
Host: `test/gesture-zones-single-instance.test.mjs`, `test/renderer-recovery-budget.test.mjs`, `test/home-role-recovery-contract.test.mjs`,
`test/quint-home-instance-handoff.test.mjs`, `test/quint-renderer-*.test.mjs`, `test/quint-back-dispatch.test.mjs`; Quint
`MainActivityRecoveryTraces`/`HomeInstanceHandoffReplay`; instrumentation `LauncherHomeInstrumentedTest`, `SettingsRolesInstrumentedTest`;
emulator HOME-role test and Playwright `native-insets.spec.ts`.
