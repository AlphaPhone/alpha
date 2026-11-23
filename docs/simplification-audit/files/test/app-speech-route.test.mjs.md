# test/app-speech-route.test.mjs
- Lines: 32 | Kind: source transplant (type-strips all of `apps/app/src/runtime/app-speech.ts` and the tail of `apps/app/src/local-speech-playback.ts` from `export async function confirmSpeechRetirement`, runs them in `vm` with ~15 fake globals) | Verdict: REWRITE as cases in `test/integration/voice.test.ts` importing `app-speech.ts` (needs injectable ports), and DELETE this file
- Covers: app speech routing: device route stays on-device, never falls back to Cloud when on-device is unavailable; Cloud/direct routes use network speech; a network failure before audio falls back to the device; no replay after audio started or on cancel; cancelled queued speech never plays; an unconfirmed cleanup is re-stopped once; a refused native stop asks for restart. Duplicates: `test/local-speech-playback.test.mjs` (same retirement gate), `test/browser/native-speech.production.spec.ts` (production speech path). Callers/importers: `npm test`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-10 | T2 | Strips imports and exports, evaluates in `vm` with fakes for `registerPlugin`, `speechRoute`, `createOnDeviceVoice`, `speakCloudText`, `testMocksEnabled`. | Give `app-speech.ts` a factory taking those ports (or import it with module mocks) and test it for real. | Medium: these fallback and stuck-speaker rules have no other executable coverage on host. |
| 2 | 10 | D8 | 1,000-character fixture line. | n/a after rewrite. | none |

Cases worth carrying (all eight are distinct behaviours): device-local with queue/owner checks; unavailable device refuses without Cloud; dev build keeps Cloud fixture; cancelled queued speech; Cloud and direct routes; network failure before audio falls back to device (401/402/429/503); error kept when device unavailable, after audio started, on cancel, or 400; re-stop after unconfirmed cleanup; refused native stop.

## Proposed end state
Eight cases in `test/integration/voice.test.ts` against the real module with injected ports; this file removed.
