# test/voice-capture-retirement.test.mjs
- Lines: 40 | Kind: unit of upstream code (esbuild bundle of `.eliza/client-features/packages/ui/src/voice/voice-session-client-core.ts` with alias map to `.eliza` packages; fake WebSocket, track and AudioContext) | Verdict: DELETE
- Covers: a fatal capture failure (track ended, graph closed, throwing error observer) retires the shared voice session client once. Duplicates: upstream `vendor/eliza/packages/ui/src/voice/__tests__/` (client tests with `voice-session-fakes.ts`). Product use: only `development-cartesia-conversation.ts` (development path). Callers/importers: `npm test` glob.
- Research correction: `research/tests-host.md:1406` says "imports a real app module ... merge into voice-speech integration". The module is upstream's, not the app's.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-12 | T5/D13 | Hand-maintained esbuild alias map into `.eliza/client-features` duplicates the Vite/tsconfig aliases. | Delete with the file. | Low |
| 2 | 14-40 | T5 | Tests upstream client behaviour with upstream-style fakes. | Delete; missing cases become upstream follow-ups. | Low |

## Proposed end state
File deleted.
