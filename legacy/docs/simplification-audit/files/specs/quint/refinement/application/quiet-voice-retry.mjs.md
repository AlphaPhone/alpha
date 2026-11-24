# specs/quint/refinement/application/quiet-voice-retry.mjs
- Lines: 89 | Kind: Quint ITF trace replay (model scenarios + witnesses + 80 random walks via `assistant-model-traces.mjs`) against a **source transplant** of `voice-adapter.ts` | Verdict: KEEP model; PORT the harness to import an extracted module
- Covers: transient Cloud speech refusals (503 / 429 under 30 s) listen again up to twice, the third or a long wait ends voice calmly, a stale chat ends after the wait, own-key/other failures show their error, speech resets the count, close clears the timer. Duplicates: none found (no Playwright spec drives 503/429 voice retries). Callers/importers: `test/quint-quiet-voice-retry.test.mjs` only — **not** in `index.mjs`, so `npm run quint:refinement` never runs it (inconsistent registration).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 25-45 | T2, T10 | Slices `apps/app/src/prototype/voice-adapter.ts` from `  function localVoiceFallback(` to `  async function beginConversation(){` (both present, l.538/564) and re-declares the adapter closure around it: `quietRetries, quietRetry, conversationState, error, generation, chatDestination, conversationNetwork, conversationLocal, conversationLocalMissing, mediaUnconfirmed, noteNetworkSpeechFailure, stopClock, refresh, chatCurrent, cleanup, cancelChat, beginConversation`; ports `connectionController`, `cloudVoiceServiceLimit`, `setTimeout`, `clearTimeout`. The slice also contains free names (`readiness`, `conversationVoice`, `conversationLive`, `liveCapture`, `stopping`) that are only safe because `open()` sets `conversationLocalMissing = chatDestination`, short-circuiting `localVoiceFallback`. The replay therefore re-implements `open/phase/failed/recover/close` (l.38-44) — it checks a hand copy of the surrounding adapter, not the adapter. | PORT: move the quiet-retry policy into `apps/app/src/prototype/voice-quiet-retry.ts` exporting `createQuietVoiceRetry({schedule, cancelTimer, begin, pause, current, residentInference, serviceLimit})` with `failed(failure, chat, token)`, `reset()`, `clear()`; voice-adapter calls it; the harness imports it. | Medium |
| 2 | 1-13 | A8 | Long header partly restates the model; fine but trim after the port. | Shorten to the port list. | None |
| 3 | 23 | C3 | Local `flush` (two `setImmediate`s) duplicates `support.mjs` `tick`. | Import `tick`. | None |
| 4 | — | T4/P1 | Not registered in the family index while siblings are; whichever runner survives must list it. | Register in the per-model runner. | Low |

## Proposed end state
- `voice-quiet-retry.ts` (product) owns the retry counter/timer policy; `voice-adapter.ts` delegates to it.
- Harness (~50 lines) imports `createQuietVoiceRetry`, builds the driver from controlled ports and replays the same ITF traces; no text slice, no re-declared closure.
