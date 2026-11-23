# android/app/src/main/java/ai/alphacompute/alphaphone/NativeVoiceBinding.java
- Lines: 11 | Role: pins a native audio stream to the enrollment (epoch, root, token, owner) it was admitted under | Verdict: SIMPLIFY (absorb `VoiceEventAdmission`)
- Importers: `AlphaLocalAgentPlugin:989` (one construction). Text/path pins: `test/fixtures/NativeVoiceBindingTest.java`, `test/native-live-pcm.test.mjs` (javac), `specs/quint/native/manifest.json`, `specs/quint/refinement/native/resident-coordinator.mjs`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9 | MERGE / D7 | Delegates to `VoiceEventAdmission.current(...)`, a separate 10-line class with one static boolean expression also called 4× directly from `AlphaLocalAgentPlugin`. Two files for one admission rule. | Move `VoiceEventAdmission.current` here as `static boolean admitted(...)`; update the 4 `AlphaLocalAgentPlugin` sites; delete `VoiceEventAdmission.java`. | Low; host tests and Quint manifest name `VoiceEventAdmission`. |
| 2 | 5 | D8 | Four fields declared on one line. | Format. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `current(...)` | helper | 7-10 | `VoiceEventAdmission.current` | here (merged) |

## Proposed end state
One ~18-line class holding the binding and the static admission predicate.

## Verification
`test/native-live-pcm.test.mjs`, `test/native-voice-event-worker.test.mjs`, Quint resident-coordinator refinement.
