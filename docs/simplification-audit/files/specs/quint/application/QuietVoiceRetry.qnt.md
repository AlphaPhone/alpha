# specs/quint/application/QuietVoiceRetry.qnt
- Lines: 84 | Kind: Quint model (live; slicing harness) | Verdict: KEEP + PORT harness
- Covers: Quiet recovery from transient Cloud voice refusals: at most two waits, one at a time, long wait/third refusal/stale chat ends voice calmly, own-key voice shows errors. Duplicates: test/voice-calm-cloud-errors.test.mjs (host, other chunk) covers error copy. Callers/importers: manifest row (voice-adapter.ts, cloud-voice.ts; 9 symbol pins incl. string literals `voice-http-503`, `rate-limited`); harness specs/quint/refinement/application/quiet-voice-retry.mjs via test/quint-quiet-voice-retry.test.mjs

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | quiet-voice-retry.mjs:24-29 | T2/T10 | Slices voice-adapter.ts from `'  function localVoiceFallback('` to `'  async function beginConversation(){'`, wraps it in a hand-written closure that re-declares 12 adapter variables, `transformSync`, `new Function`. | PORT: extract `quietVoiceRetry` + its counters into a module (`voice/quiet-retry.ts` exporting `createQuietRetry({current, begin, pause, setTimeout})`) and import it. | M |
| 2 | manifest symbols | T10 | String-literal pins (`voice-http-503`) break on copy/wire edits. | Drop symbol pins. | L |
| 3 | model | - | Small, clear, live. | Keep. | L |

## Proposed end state
Model unchanged; harness imports an extracted quiet-retry module; voice-adapter.ts no longer anchored.
