# test/browser/cloud-voice-live.local.spec.ts
- Lines: 19 | Kind: Playwright `live` project (manual: real local agent, real Cloud ASR/TTS, fake-audio file) | Verdict: **MERGE** with `cloud-tts-latency.local.spec.ts` into `test/browser/live/cloud-voice.local.spec.ts`
- Covers: a real voice turn ("Talk" → spoken request → Notes opens → reply audio plays) and records admission, transcription, navigation and playback latency. Duplicates: timing collector shared with `cloud-tts-latency.local.spec.ts`. Callers/importers: `npm run test:browser:live` only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-7 | C3 | Request/response timing collector duplicated with the TTS latency spec (one 600-character line). | Shared helper in the merged file. | none |
| 2 | 10 | P2 | Readiness through `connectionController.getSnapshot()` via in-page import. | Wait on the visible "Talk" button being enabled and the chooser being absent. | Low. |
| 3 | 8 | P3 | Wraps `HTMLMediaElement.prototype.play` and adds a MutationObserver to time playback. Observation only, no behaviour change; acceptable in a live measurement. | Keep. | none |
| 4 | 18 | B5 | Writes `receipt.json` and full `body.innerText`. | Keep as `info.attach`; the receipt is the deliverable of a live run. | none |

## Proposed end state
Part of one live file, env-gated, run by hand for acceptance. Not in any CI lane; it is real-integration evidence, not an APK or device result.
