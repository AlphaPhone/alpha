# test/voice-context-loss.test.mjs
- Lines: 29 | Kind: transplant of upstream code (slices `sendUplinkAudio` .. `handleServerFrame` from `.eliza/client-features/packages/ui/src/voice/voice-session-client-core.ts`, evals in `vm` with 15 fake globals) | Verdict: DELETE
- Covers: when the renderer context getter throws, the shared voice client stops capture and sends no PCM with a generic message. Duplicates: upstream client tests (`vendor/eliza/packages/ui/src/voice/__tests__`). Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-10 | T2 | Marker slice of a generated upstream file (two-space indented function names). | Delete. | Low |
| 2 | 11-29 | T5 | Upstream behaviour. | Delete; upstream follow-up if not covered there. | Low |

## Proposed end state
File deleted.
