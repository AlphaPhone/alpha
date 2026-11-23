# scripts/android-paired-speech-live.ts
- Lines: 92 | Kind: script (manual device campaign: paired ASR/voice against a development host) | Verdict: DELETE
- Covers: pairs the app with a local development host (ports 47846/47844) and runs `PairedAsrLiveInstrumentedTest` or `PairedVoiceLiveInstrumentedTest` on both variants. Duplicates: none that remain after D5. Callers/importers: only `android-instrumentation.ts:313` `CAMPAIGN_RUNNERS`; no npm, workflow, doc or test caller (git grep).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | A3/D5 | Paired-agent speech; PRD has no hosted-agent pairing; delete-candidates A51 removes the Live classes. | Delete this script, `PairedAsrLive`/`PairedVoiceLive` classes and the `CAMPAIGN_RUNNERS` entry. | Low |
| 2 | 66 | — | Reads a developer owner token from a fixed home path. | Gone with the file. | — |

## Proposed end state
Deleted. Coverage lost: paired speech only, which D5 removes from the product. On-device speech is covered by the `LocalSpeech*`/`SpeechNoNetwork` classes in the fused-speech CI lane.
