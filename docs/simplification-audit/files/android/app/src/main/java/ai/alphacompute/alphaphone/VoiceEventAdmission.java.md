# android/app/src/main/java/ai/alphacompute/alphaphone/VoiceEventAdmission.java
- Lines: 10 | Role: one boolean predicate: a live voice feed stays on the exact runtime root and owner it was admitted under, before expiry | Verdict: MERGE into `NativeVoiceBinding.java`
- Importers: `AlphaLocalAgentPlugin` (4 direct calls), `NativeVoiceBinding:9`. Text/path pins: `test/native-live-pcm.test.mjs`, `test/native-voice-event-worker.test.mjs`, `specs/quint/native/manifest.json`, `specs/quint/refinement/native/resident-coordinator.mjs`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-10 | D7 (P1) | Separate file for a single expression shared with `NativeVoiceBinding` (research §5 "merge tiny files"). | Move as `NativeVoiceBinding.admitted(...)`; update the 4 call sites and the two host tests/Quint manifest. | Low. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `current(...)` | helper | 6-9 | `NativeVoiceBinding.current` wraps it | `NativeVoiceBinding` |

## Proposed end state
File removed.

## Verification
`test/native-live-pcm.test.mjs`, `test/native-voice-event-worker.test.mjs`, live voice instrumentation.
