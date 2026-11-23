# android/app/src/androidTest/java/ai/alphacompute/alphaphone/AssistantInstrumentedTest.java
- Lines: 169 | Role: ACTION_ASSIST surface (`AlphaAssistActivity`): exported/separate task, caller-extra stripping, per-surface stream ownership, composer above the IME. | Verdict: DELETE (with P-78 deferral) — owner decision
- Importers: none. Text/path pins: `scripts/android-instrumentation.ts:267` (`Assistant: {}`); `scripts/owner/emulator-campaign-check.ts:42,57` (group "Assistant", h31-flagoff class list). Uses main-source test hooks `AlphaLocalAgentPlugin.enrollForTest`, `adoptStreamForTest`, `ownedWorkCount`, `enrollmentPresent`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 31-42 | A4/A5 | Asserts `ACTION_ASSIST` resolves to `AlphaAssistActivity` and `assertTrue(resolved.activityInfo.exported)`, but `android/app/src/main/AndroidManifest.xml:124` declares it `android:enabled="false" android:exported="false"` (disabled with P-78 in commit 085c8cdda; launcher manifest :62 only replaces screenOrientation; nothing calls `setComponentEnabledSetting` for it). `resolveActivity` does not return disabled components, so this method cannot pass on any current build (by manifest reading; not run here). | Delete with the dormant assistant entry (research P14), or, if P-78 is kept, mark the class NOT_RUN until the activity is enabled. | Low for deletion; owner decision. |
| 2 | 43-65, 69-102, 134-168 | A4 | Every other method launches `new Intent(context, AlphaAssistActivity.class)`; an explicit start of a disabled component throws `ActivityNotFoundException`. The whole class is dead while the activity is disabled, yet it is in the registry and an owner campaign list. | Same as #1; remove `Assistant` from `scripts/owner/emulator-campaign-check.ts:42,57` and the registry. | Low. |
| 3 | 78-79, 89, 100 | D7 | Production test hooks used only here and by AssistantResidentReuse: `AlphaLocalAgentPlugin.adoptStreamForTest` (also used only by AssistantResidentReuse), `enrollForTest` (also Quint `specs/quint/refinement/native/ResidentStartCancelReplay.java`). | Delete `adoptStreamForTest` from main with both Assistant tests; `enrollForTest` stays while the Quint trace uses it (see AlphaLocalAgentPlugin report). | Medium: main-source edit, Quint trace compile. |
| 4 | 21-30, 104-115 | C3 | `launchSurfaceAssistant` poll and `evalAssist`/`untilAssist` (per-activity evaluate) duplicate `WebViewTestDriver.evaluate(Class, script)` (which already exists, :74) plus local poll loops. | Removed with #1/#2; if kept, use `WebViewTestDriver.evaluate(AlphaAssistActivity.class, ...)` and a shared `until`. | — |
| 5 | 62, 92, 160, 166 | C3 | Four copies of `for(i<50 && getState()!=DESTROYED) sleep(100)`. | `scenario.awaitDestroyed()` in BoundedActivityScenario if kept. | — |
| 6 | 23, 74, 84-85 | — | Calls `Agent.launchSurface()` which the renderer never calls (research P14: renderer uses `Sense.takeInvocation`). | Removed with #1. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `launchSurfaceAssistant` | helper | 21-30 | none | deleted |
| `evalAssist`/`untilAssist` | helper | 105-115 | `WebViewTestDriver.evaluate(Class,...)` | deleted |
| `assistIme` | helper | 116-123 | IME inset checks in Composer/Keyboard tests | deleted |
| `fits()` | helper (JS) | 125-128 | composer-fit probes in Flow/ChatContinuity tests | deleted |

## Proposed end state
File deleted (-169), registry and owner-campaign entries removed, `adoptStreamForTest` removed from `AlphaLocalAgentPlugin`. If the owner keeps P-78 alive, move the class to `NOT_RUN_BY_A_RUNNER` with the reason "AlphaAssistActivity is disabled (P-78)" instead.

## Verification
`node --test test/android-instrumentation-runner.test.mjs test/owner-emulator-campaign-check.test.mjs`; `npm run android:build:local` (main-source hook removal); Quint native refinement build if `enrollForTest` signature changes.
