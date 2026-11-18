# android/app/src/main/java/ai/alphacompute/alphaphone/AlphaPowerVoiceActivity.java
- Lines: 21 | Role: Protected Power-button assistant entry (STATUS_BAR_SERVICE-only), subclass of AlphaAssistActivity. | Verdict: DELETE (owner decision P-78)
- Importers: Main manifest declares it `android:enabled="false"` (AndroidManifest.xml:129); launcher manifest overrides orientation (launcher/AndroidManifest.xml:63); AOSP `power-voice` patch targets the component. Text/path pins: `android/aosp/branding/power-voice/{manifest.json,alpha-protected-power-voice.patch}`; `scripts/apk.ts:89` (permission policy); `specs/quint/native/manifest.json`; `specs/quint/refinement/native/{AssistantEntryTraces.java,NavigationServiceTraces.java,assistant-entry*.mjs,navigation-service-platform.mjs}`; `test/apk-alpha-power-policy.test.mjs`, `test/launcher-orientation.test.mjs`, `test/power-sense-entry.test.mjs`, `test/voice-in-chat-only.test.mjs`; `test/support/feature-parity.mjs` (allowlist path)

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole file | A4/A5 | Component is `enabled=false` and no code or script enables it (P-78 deferral; `scripts/stage-aosp.ts` refuses the listener for production). | Delete with `AlphaAssistActivity`, `AlphaQuickSettingsTile`, `AlphaLocalAgentPlugin.PowerLaunchPin/capturePowerLaunchPin`, both manifest entries, the AOSP power-voice patch, `scripts/apk.ts` policy rows and the listed tests/Quint traces. Restore from git when P-78 lands. | high churn; behaviour none (component disabled) |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| - | - | - | - | - |

## Proposed end state
File removed. Estimated lines after: 0.

## Verification
`npm run verify` (apk policy tests), Quint native lane after manifest edits; AOSP image prepare (`android/aosp`) after patch removal.
