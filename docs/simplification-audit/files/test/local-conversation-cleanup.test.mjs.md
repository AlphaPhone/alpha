# test/local-conversation-cleanup.test.mjs
- Lines: 25 | Kind: transplant (type-strips `.eliza/client-features/packages/voice/src/native-speech-request.ts`, `apps/app/src/local-speech-playback.ts` and `runtime/local-voice.ts` with all imports deleted by regex, runs them in one `vm` box with ~15 fake globals) | Verdict: DELETE
- Covers: cancelling on-device conversation speech waits for native playback cleanup (and reports `speech-cleanup-unconfirmed` when stop fails); a late synthesis handle is also stopped before the next capture. Duplicates: `specs/quint/refinement/native/speech-cleanup-latch.mjs` (cleanup-unconfirmed latch) and `specs/quint/refinement/native/renderer-speech-chunk.mjs` (replays RendererSpeechChunk traces against `playOwnedSpeech`/`speakChunk` in `apps/app/src/local-speech-playback.ts`: cancel, stop, late handle); `test/local-speech-native-drain.test.mjs` and `test/local-speech-text.test.mjs` load the same three files the same way. Callers/importers: `npm test` glob; uses `test/support/strip-types.mjs`, `test/fixtures/wait-for.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 15-16 | T2 | Deletes every `import` line by regex and supplies the imports as globals; a new import in either file becomes a `ReferenceError` only here. | Delete. | Low |
| 2 | 19-25 | T4 | Both cases are states of the RendererSpeechChunk / SpeechCleanupLatch models already replayed against the same source. | Delete. | Low |
| 3 | 8-9 | T8 | Unrefs a 20-minute guard timer so a failed wait cannot hang the process. | Gone. | Low |
| 4 | — | D11 | Two files named `local-speech-playback.ts` (`apps/app/src/` and `apps/app/src/prototype/`); tests load both under the same name. | Product rename (structural pass). | Low |

## Proposed end state
File deleted. The speech-cleanup Quint replays are the coverage; if they should run through real imports instead of
source evaluation, that is the T10 port of `renderer-speech-chunk.mjs`.
