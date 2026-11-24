# specs/quint/refinement/native/SharedRecordingProbe.java
- Lines: 32 | Kind: one-off reproduction probe (staged upstream `LocalSpeechBridgePlugin`: start a draft recording at a permission prompt, enter a phone call, grant permission, print whether the draft started) | Verdict: DELETE
- Covers: "a pending draft recording admitted after the audio mode enters a call". Duplicates: `SharedRecordingTraces.java` scenario `permission-call` (same sequence, checked against `SharedRecordingAdmission`). Callers/importers: only `probeSharedRecording` in `shared-recording.mjs:23-27`, and git grep finds **no importer of `probeSharedRecording`** anywhere (specs, test, scripts).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | A7 | Unreachable: its only launcher function is unused. | Delete this file and `probeSharedRecording` from `shared-recording.mjs`. | none |
| 2 | 23-25 | T4 | Sequence is a subset of `SharedRecordingTraces` `permission-call`. | none (covered) | none |

## Proposed end state
Gone. No coverage lost.
