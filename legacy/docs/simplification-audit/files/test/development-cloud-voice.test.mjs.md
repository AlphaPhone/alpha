# test/development-cloud-voice.test.mjs
- Lines: 173 | Kind: integration (real `createLocalAgentDevHandler` from `scripts/local-agent-dev-bridge.ts` over a real HTTP server and in-process `duplexPair` connections) + one source-text case (line 77) + one transplant (lines 79-90, `runtime/cloud-voice.ts`) | Verdict: MERGE into `test/dev-local-agent-bridge.test.mjs`; DELETE cases at lines 77 and 79-90
- Covers: the dev bridge's Cloud/direct ASR/TTS proxy projects only verified Cartesia speech, strips keys/vendor fields, sanitises errors, refuses wrong owner/provider/MIME/oversize, aborts on Stop, streams TTS chunks, truncates on upstream failure/rotation, and enforces the 120 s deadline under backpressure. Duplicates: fixture and deadline/backpressure harness are near-verbatim copies of `development-conversation-stream.test.mjs` (`blockOnDrain`, `settled`, `AbortSignal.timeout` patch, pairing fake); `direct-transcription-proxy.test.mjs` covers direct ASR via a transplant of the same handler. Callers/importers: `npm test`. Research row 700 called it a transplant (C); it is mostly integration.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11 | T9 | Re-spawns itself under `--import tsx` when not already loaded with it. | One tsx-loaded bridge suite; drop the self-spawn. | None. |
| 2 | 77 | T1 | Regex over `development-cloud-voice.ts` for the DEV/test-mock/native gate expression. | Delete; the production bundle audit proves the dev path is absent from production. | Low. |
| 3 | 79-90 | T2 | Strips types from `runtime/cloud-voice.ts`, deletes imports, runs in `vm` with a 10-key box. | Delete; Cloud dictation ownership change is a voice journey (`journeys/voice.spec.ts`, dev-simulator project). | Medium: the "owner changed mid-upload rejects late text" guard is only here and in `direct-browser-transcription`. |
| 4 | 14-55 | C4, T7 | Pairing fake (`/api/auth/status|pair-code|pair|me`) and server setup repeated in 6 files that drive this handler. | One `test/fixtures/dev-bridge.mjs` fixture. | None. |
| 5 | 121-165 | T4 | Deadline/backpressure cases are the same mechanism as in `development-conversation-stream` (same bridge relay code). | Keep them once (stream relay), plus one TTS-specific deadline case. | Low. |
| 6 | 58-76, 92-120, 166-173 | - | Speech-projection refusals and stream/Stop behaviour: real integration over the bridge, unique. | Carry. | - |

## Proposed end state
Cases at lines 58-76, 92-120, one deadline case and the direct read-aloud cases move into a single
`test/dev-local-agent-bridge.test.mjs` (with `development-conversation-stream`, `direct-transcription-proxy`,
`enabled-view-transport`, `local-agent-voice-bridge`) on one shared fixture. Source-text and transplant cases deleted.
