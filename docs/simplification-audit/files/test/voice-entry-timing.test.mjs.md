# test/voice-entry-timing.test.mjs
- Lines: 170 | Kind: mostly integration of real modules (`apps/app/src/runtime/voice-timing.ts` + `scripts/aggregate-voice-latency.ts` on a deterministic clock, `localStorage` stub); last two tests are transplants (`cloud-voice-view.mjs`) | Verdict: MERGE into `test/voice-timing.test.mjs` (auto-send + aggregator cases), rest DELETE
- Covers: per-entry latency records (conversation vs notes), the send boundary, abandon on discard/failed send, the aggregator's entry/boundary summaries, one on-device readiness check per Talk / Transcribe. Duplicates: `test/voice-timing.test.mjs` (same modules, aggregator CLI exit codes), `test/native-voice-latency.test.mjs` (aggregator), `test/browser/voice-timing.spec.ts` and `chat-voice-mode.spec.ts` (rendered send policy and timing). Callers/importers: `npm test` glob.
- Research correction: `research/tests-host.md:1413` classifies the whole file as a transplant; only lines 128-170 are.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 39-85 | A4/D8 | Half of the cases run the `review` send policy, which production never uses (`VOICE_SEND_POLICY='auto-send'`; `review` exists only through `setVoiceSendPolicyForTests`, which D8 deletes). | Drop the `review` cases with the switch; keep auto-send. If D8 keeps `review` for the Notes recorder, keep the Notes case only. | Medium |
| 2 | 87-126 | T4 | Aggregator assertions overlap `voice-timing.test.mjs` and `native-voice-latency.test.mjs`. | Move the entry-split and "older exports without an entry stay readable" cases into `voice-timing.test.mjs`; drop the rest. Note the latter is an A1 legacy reader of old exports: delete it if the aggregator drops entry-less records. | Low |
| 3 | 10-12 | B2 | Global `localStorage` stub installed for the module under test. | Keep in the merged file only if `voice-timing.ts` still needs it. | Low |
| 4 | 128-170 | T2 | Two transplant cases for readiness-check counting. | Delete; `voice-preparation-ownership.spec.ts` drives readiness through the page. | Low |

## Proposed end state
File deleted. `test/voice-timing.test.mjs` (the tooling/measurement suite for A-10) gains the conversation-vs-notes
entry records and the abandoned-on-failed-send case under the auto-send policy. Nothing here needs the cloud-voice-view
fixture afterwards.
