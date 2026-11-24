# test/voice-copy-presentation.test.mjs
- Lines: 73 | Kind: transplant (`cloud-voice-view.mjs` + `voice-markup.mjs` rendered in JSDOM) plus source-text regex on `prototype/voice-adapter.ts` | Verdict: DELETE
- Covers: voice activity sits below chat notices; no error banner; an unconfirmed cleanup holds voice in "Voice unconfirmed · restart app" and refuses later voice/dictation starts with the same notice; dictation failure states render quietly. Duplicates: `test/browser/voice-composer-recovery.spec.ts` ("Microphone status unconfirmed" held state), `voice-owned-capture-cleanup.test.mjs:73-80` (same notice), `voice-calm-cloud-errors.test.mjs` (no banner). Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-25 | T2 | vm transplant with stand-in `BatchVoiceConversation`. | Delete. | Low |
| 2 | 62-64 | T1 | Regex on `voice-adapter.ts` (`state: failure \|\| stage, failed: Boolean(...)`). | Delete. | Low |
| 3 | 54-59 | gap | "A refused voice start after unconfirmed cleanup is never silent" (toast on Back, Talk and Transcribe). Not clearly in `voice-composer-recovery.spec.ts`. | Carry one journey case: after a cleanup failure, Talk and Transcribe each show the notice and open no capture. | Medium |
| 4 | 26-41 | T3 | DOM order of notices vs composer. | Drop. | Low |

## Proposed end state
File deleted. One case added to `journeys/voice.spec.ts` (unconfirmed cleanup blocks Talk and Transcribe with the
notice), using the voice fixture's stop-failure hook already used by `voice-composer-recovery.spec.ts`.
