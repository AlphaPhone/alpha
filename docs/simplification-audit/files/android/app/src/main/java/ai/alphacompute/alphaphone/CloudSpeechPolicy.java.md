# android/app/src/main/java/ai/alphacompute/alphaphone/CloudSpeechPolicy.java
- Lines: 18 | Role: Admits the Cloud speech host (production, staging under mocks) and requires the Cartesia provider header. | Verdict: KEEP
- Importers: `AlphaVoiceCloudPlugin`, `KeyboardDictationCloud`. Text/path pins: `specs/quint/native/manifest.json`; `specs/quint/refinement/native/{keyboard-dictation-cloud,note-bridge-platform}.mjs`; `test/cloud-voice-profile.test.mjs`, `test/keyboard-dictation.test.mjs`, `test/fixtures/CloudSpeechPolicyTest.java`; `test/support/feature-parity.mjs` (allowlist path)

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5 | - | "developer pairing has a separate policy" refers to PairedSpeechContract (P15). | Drop the clause if paired speech is deleted. | none |
| 2 | whole | C5 | Research suggests merging with `CloudVoiceLimit` and `KeyboardDictationPolicy` into one voice-policy class. | Optional; three distinct responsibilities, small files. Not worth the test churn unless host tests are being rewritten anyway. | low |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| - | - | - | - | - |

## Proposed end state
Unchanged; 18 lines. Estimated lines after: 18.

## Verification
`test/cloud-voice-profile.test.mjs`, `test/keyboard-dictation.test.mjs`.
