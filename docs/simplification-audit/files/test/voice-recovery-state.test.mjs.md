# test/voice-recovery-state.test.mjs
- Lines: 14 | Kind: transplant (one regex `onState:\(phase,progressText=''\)=>\{(.*?)\},onPlaybackUnlockChange:.*?onError:failure=>\{(.*?)\}\}\);` cuts two callbacks out of `prototype/voice-adapter.ts`, strips a type cast by regex and runs them in `vm`) | Verdict: DELETE
- Covers: development realtime conversation state: a transport error survives the following idle, initial idle cannot erase startup, stale generations are ignored, `ready` keeps startup visible until capture, `complete`/`interrupted` do not look like a stopped mic. Duplicates: `voice-progress-presentation.test.mjs` (same callbacks via the transplant fixture), `voice-repeated-interim.test.mjs` (same `onState` slice). Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-9 | T2 | Regex over source text including argument default text and a `as 'listening'\|...` cast; any formatting change breaks it (named in research §15 alongside `settings-signout-confirm`). | Delete. | Low |
| 2 | 10-14 | T3 | Five state-machine assertions on fake context fields. | Drop; the visible states are in the voice journey. | Low |

## Proposed end state
File deleted.
