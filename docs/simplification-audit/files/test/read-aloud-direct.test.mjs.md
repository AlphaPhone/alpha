# test/read-aloud-direct.test.mjs
- Lines: 15 | Kind: transplant (T2) | Verdict: DELETE
- Covers: Direct read-aloud through `createCloudVoice("direct")` uses owner-bound native playback without renderer Cloud login and rejects a changed owner mid-synthesis. Duplicates: Speech retirement on owner change is replayed by `quint-speech-cleanup-latch` (Cloud app speech over `runtime/cloud-voice.ts`); `test/cloud-voice-limit.test.mjs`, `development-cloud-voice.test.mjs` load the same module. Callers/importers: npm test (`scripts/run-node-tests.ts` glob `test/*.test.mjs`), so `npm run verify` and the `browser.yml` verify job.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7 | T2 | Reads `runtime/cloud-voice.ts`, deletes every `import` line by regex, rewrites `export` keywords and runs it in `vm.runInNewContext` with 20 fake globals. | Delete. Cover owner-change refusal in `test/integration/voice.test.ts` by importing `createCloudVoice` with injected native/connection ports. | Low |
| 2 | 10 | D6 | The path is `developmentCartesiaVoiceEnabled` (development voice). | Dev-only behaviour; integration test runs under the dev flag. | Low |
| 3 | 9-14 | D8 | Four statements per line, 300+ character lines. | – | Low |

## Proposed end state
- File removed; one owner-change case in the voice integration file.
