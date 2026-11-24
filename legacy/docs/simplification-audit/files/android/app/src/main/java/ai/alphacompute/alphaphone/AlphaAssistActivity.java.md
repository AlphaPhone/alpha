# android/app/src/main/java/ai/alphacompute/alphaphone/AlphaAssistActivity.java
- Lines: 84 | Role: `MainActivity` subclass for the ACTION_ASSIST surface (and parent of `AlphaPowerVoiceActivity`): sanitizes launch intents, records Sense invocations, exposes a legacy `takeInvocation()`. Declared `android:enabled="false"` in `src/main/AndroidManifest.xml:124` with no enabler. | Verdict: DELETE (after owner decision on P-78), else SIMPLIFY
- Importers: main — `AlphaPowerVoiceActivity` (extends it), `AlphaLocalAgentPlugin:334,342-343` (`EXTRA_ASSISTANT`, `takeInvocation()`), `AlphaSystemPlugin:49` (`EXTRA_ASSISTANT`); androidTest — `AssistantInstrumentedTest`, `AssistantResidentReuseInstrumentedTest`, `PhotosTrashInstrumentedTest`. Text/path pins: `android/app/proguard-rules.pro`, `scripts/apk.ts`, `scripts/stage-aosp.ts`, `android/aosp/branding/{power-voice,system-entry}/*.patch`, `android/aosp/branding/system-entry/prepare.py`, `android/aosp/pixel10a-composition.json`, `specs/quint/native/manifest.json:952,960,1058,2851`, `specs/quint/refinement/native/{AssistantEntryTraces.java,NavigationServiceTraces.java,app-info-handoff-platform.mjs,assistant-entry.mjs,navigation-service-platform.mjs,resident-platform.mjs}`, tests `alpha-system-entry`, `always-on-listener` (regex `sense\.recordInvocation\(isProtectedPowerEntry\(\) \? null : caller\);`), `aosp-cloud-power-defaults`, `aosp-provisioning-overlay`, `aosp-secure-camera-policy`, `apk-alpha-tile-policy`, `launcher-orientation`, `power-sense-entry`, `renderer-recovery-budget`, `voice-in-chat-only`, `support/feature-parity.mjs`; Playwright `home-assistant-surface`, `home-native-launcher`, `listener-invocation.production`, `chat-continuity`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-84 | A4 / A5 | The activity, its Power child and the QS tile that targets it are disabled in every manifest; grep finds no `setComponentEnabledSetting` for them (only `AlphaTelephonyRoles` toggles components). | Owner decision (P-78). If deferred: delete this file, `AlphaPowerVoiceActivity`, `AlphaQuickSettingsTile`, manifest elements, `AlphaLocalAgentPlugin.PowerLaunchPin/launchSurface/takeInvocation`, `AlphaSystemPlugin.isAssistantLaunch` override, AOSP patch hunks and the pinned tests; restore from git when the feature lands. | High churn (≈25 pin files, AOSP patches). |
| 2 | 57-65 | A1 / A8 | `synchronized String takeInvocation(){ return "assist"; }` with "Legacy Agent read ... Keep this old method as a UI-only hint". The renderer uses `Sense.takeInvocation` (`apps/app/src/runtime/always-on-listener.ts:56`); `Agent.takeInvocation` has no renderer caller (grep apps/ and `.eliza/client-features`: none). | Delete this method and `AlphaLocalAgentPlugin.takeInvocation` (:340-348). | Low; `specs/quint/refinement/native/resident-platform.mjs:207` stub and `AssistantEntryTraces.java:230` must drop it. |
| 3 | 17-18 | A8 | Orphaned Javadoc `/** This launch's origin until the renderer takes it; see {@link #takeInvocation}. */` directly followed by another Javadoc; it documents no member. | Delete line 17. | None |
| 4 | 11-12 | D7 | `protected boolean isProtectedPowerEntry(){return false;}` exists only so `AlphaPowerVoiceActivity` can return true. | Goes with #1; if kept, fine. | — |
| 5 | 56 | C6 | `EXTRA_ASSISTANT="alpha.assistant"` also read in `AlphaLocalAgentPlugin`, `AlphaSystemPlugin`. | Keep as the single constant. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `INVOCATION_EVENT` | const | 19 | `apps/app/src/runtime/always-on-listener.ts:62` (`'alpha:assist-invocation'`) | keep (wire name) |
| `EXTRA_ASSISTANT` | const | 56 | — | here |
| `cleanIntent` | helper | 70-83 | — | here |

## Proposed end state
Preferred: file deleted (0 lines) with the whole dormant P-78 entry. If the owner keeps P-78 planned: ~70 lines without `takeInvocation` and the orphan comment, recorded in DECISIONS.md as planned.

## Verification
`AssistantInstrumentedTest`, `AssistantResidentReuseInstrumentedTest`; Quint assistant-entry refinement; the listed `test/*` and Playwright specs; `scripts/apk.ts` audit; AOSP `prepare.py` dry run for the system-entry/power-voice patches.
