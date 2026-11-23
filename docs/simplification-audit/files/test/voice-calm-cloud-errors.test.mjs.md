# test/voice-calm-cloud-errors.test.mjs
- Lines: 272 | Kind: transplant (`cloud-voice-view.mjs` vm copy of the voice adapter + `voice-markup.mjs` template renderer in JSDOM; `voiceFakeClock`); one real import of `voiceFailure` | Verdict: DELETE (REWRITE four cases into `journeys/voice.spec.ts`)
- Covers: Cloud voice 429/503 are waited out quietly honouring Retry-After, retries are bounded, a long wait ends calmly, Stop cancels the wait, terminal 401/allowance show one line, denied mic copy, stopped-conversation copy per cause, with on-device speech a Cloud failure moves to the phone at once, a non-network failure is not rerouted. Duplicates: `voice-call-interrupted-capture.test.mjs` (call copy), `voice-denied-recovery.test.mjs` (denied copy), `test/voice-start-failure-copy.test.mjs` and `test/browser/browser-speech.spec.ts` for `voiceFailure` copy, Quint `QuietVoiceRetry` model and `quint-quiet-voice-retry.test.mjs` (same retry budget). Playwright: none asserts Retry-After waiting in voice (`browser-speech.spec.ts` only names `voice-http-429`). Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4-7, 26-45 | T2 | Whole file drives a vm transplant with a stand-in `BatchVoiceConversation`. | Delete. | Low |
| 2 | runtime | T8 | 34 subtests, about 15 s (24 s wall); fake clock races the shared loop. | Gone with the file. | Low |
| 3 | 47-66, 75-92 | gap | Quiet wait honours Retry-After, then one fresh conversation; third refusal ends voice without a toast. | Carry as two journey cases using a Cloud voice route fake returning 429 with `retryAfterSeconds` and `page.clock`. | Medium |
| 4 | 213-231 | gap | With on-device speech, a Cloud 429/401 switches to on-device at once and does not resend the turn. | Carry one case (429) in the journey. | Medium |
| 5 | 109-128, 251-272 | T4 | Copy per failure cause duplicates `voiceFailure` copy tests. | Carry one terminal case (401 "sign-in expired" line, no banner). | Low |
| 6 | 151-158 | T3 | Pure `voiceFailure` message table. | Drop (copy is covered by `voice-start-failure-copy.test.mjs` / `browser-speech.spec.ts`). | Low |

## Proposed end state
File deleted. `journeys/voice.spec.ts` gains: 429 quiet wait then resume; bounded retries end calmly; 401 terminal line
shown once; on-device fallback after a Cloud refusal. Needs a Cloud voice route fake in the shared harness
(`test/browser/cloud-voice-fixture.ts`) and Playwright's `page.clock`.
