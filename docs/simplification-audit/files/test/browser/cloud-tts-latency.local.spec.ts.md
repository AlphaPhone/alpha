# test/browser/cloud-tts-latency.local.spec.ts
- Lines: 14 | Kind: Playwright `live` project (manual, needs a running local agent + `ALPHA_LIVE_CLOUD_VOICE_QA=1`) | Verdict: **MERGE** with `cloud-voice-live.local.spec.ts` into `test/browser/live/cloud-voice.local.spec.ts`
- Covers: measures first-chunk and total latency of three Cloud TTS calls through the real local agent `/api/tts/cloud` route and checks the provider is Cartesia on the Cloud route. Duplicates: request/response timing collector is the same as in `cloud-voice-live.local.spec.ts:6-7`. Callers/importers: `npm run test:browser:live` (`playwright.config.ts:70` adds the project only when named). Never runs in CI.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7, 9 | C3 | Request-timing map and response header capture duplicated with `cloud-voice-live.local.spec.ts`. | One `liveTimings(page)` helper in the merged live spec. | none |
| 2 | 10-11 | P2 | Readiness and the TTS call go through `connectionController.getBrowserSpeechAgent()` and `developmentCloudSpeech` via in-page import; this measures the dev-host API, not a user action. | Acceptable for a provider measurement; keep, but wait on the visible "Talk" control instead of the controller snapshot for readiness. | Low. |
| 3 | 11 | A8 | Error text "Paired speech agent unavailable" names the retired pairing concept. | Rename to "Local agent unavailable". | none |
| 4 | 9, 13 | B5 | Writes a `receipt.json` attachment. For a live latency measurement this is the output, so it stays; use `info.attach` instead of `writeFile(outputPath)` so it shows in the report. | Minor. | none |

## Proposed end state
One live file with two tests ("Cloud TTS latency" and "Cloud voice round trip") and a shared timing collector, still gated by the `live` project and the explicit env opt-in. No CI lane.
