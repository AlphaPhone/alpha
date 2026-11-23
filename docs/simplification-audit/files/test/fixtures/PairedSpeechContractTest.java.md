# test/fixtures/PairedSpeechContractTest.java
- Lines: 18 | Kind: Java fixture, unit of `PairedSpeechContract` | Verdict: DELETE (with `test/paired-speech-contract.test.mjs`; delete-candidates A69, D5)
- Covers: the paired-agent ASR/TTS response contract (provider names, transcript, TTS body and headers). Duplicates: androidTest `Paired*` classes slated for deletion with it. Callers/importers: `test/paired-speech-contract.test.mjs:11` only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | A3 / D5 | Paired speech is the paired-agent path the PRD excludes ("No hosted-agent pairing"); `PairedSpeechContract.java` and `AlphaVoiceCloudPlugin.java:268-323` are listed for removal (android-14 chunk §3). | Delete with the product code. | Low |

## Proposed end state
Deleted together with `PairedSpeechContract.java`, `PairedAgentCredential.java` and the paired methods in `AlphaVoiceCloudPlugin`.
