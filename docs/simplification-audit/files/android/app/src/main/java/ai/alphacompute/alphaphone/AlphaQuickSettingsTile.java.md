# android/app/src/main/java/ai/alphacompute/alphaphone/AlphaQuickSettingsTile.java
- Lines: 42 | Role: Quick Settings tile that opens AlphaAssistActivity. | Verdict: DELETE (owner decision P-78)
- Importers: Main manifest `<service .AlphaQuickSettingsTile android:enabled="false">` (AndroidManifest.xml:94). Text/path pins: `android/aosp/branding/core-launcher/{AlphaQsDefaultsPolicy.java,alpha-core-launcher.patch,prepare.py,test_policy.py}`; `scripts/apk.ts`; `scripts/owner/emulator-campaign-check.ts`; `specs/quint/native/manifest.json`; `specs/quint/refinement/application/os-defaults.mjs`, `native/AssistantEntryTraces.java`, `assistant-entry.mjs`; `test/alpha-system-entry.test.mjs`, `test/apk-alpha-tile-policy.test.mjs`, `test/voice-in-chat-only.test.mjs`; `test/support/feature-parity.mjs` (allowlist path)

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole file | A4/A5 | Disabled in the manifest; manifest comment says "Disabled with AlphaAssistActivity, its only target (P-78)". | Delete together with AlphaAssistActivity/AlphaPowerVoiceActivity (same change). Keep the AOSP QS-defaults policy only if it must still strip a stale tile from upgraded images (research P5 note). | high churn |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| requestCode 41 | const | 39-41 | none | delete |

## Proposed end state
File removed; strings `alpha_quick_settings_*` removed from resources. Estimated lines after: 0.

## Verification
Same as AlphaPowerVoiceActivity.
