# test/voice-progress-state-forwarding.test.mjs
- Lines: 81 | Kind: unit (esbuild bundle of real `apps/app/src/runtime/development-cartesia-conversation.ts` with five modules replaced by string stubs, a `globalThis.__alphaVoiceProgressFixture` side channel and fake `window`/`location`/`WebSocket`) | Verdict: DELETE
- Covers: the development realtime adapter forwards SDK-accepted progress state, ignores raw `progress` server events and stops forwarding after Stop or binding retirement. Duplicates: `voice-progress-presentation.test.mjs`. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 31-45 | T3 | Five stubbed imports (connection UI, flags, device preferences, upstream voice client) around one function: everything except the function is fake. | Delete. | Low |
| 2 | 9 | A5/D6 | Covers only the development Cartesia/own-key path that sits behind dev flags. | If the development realtime path stays (D19), its journey is the dev spec `dev-connected-voice.spec.ts`; no carry. | Low |
| 3 | 38-46 | runtime | Writes a bundle to a temp dir and `require`s it. | Gone with the file. | Low |

## Proposed end state
File deleted.
