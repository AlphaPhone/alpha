# test/voice-replies.test.mjs
- Lines: 213 | Kind: transplant (`load()` strips imports/exports from six sources incl. the pinned `.eliza` voice timing files and evals them in `vm` with ~30 fake globals) + transplant fixture `fixtures/cloud-voice-view.mjs` | Verdict: DELETE
- Covers: replies are spoken only in the voice conversation; Read aloud / Stop reading on a message; note read-aloud states and the Listen preflight (password/URL refusal); on-device conversation text normalisation; sensitive reply stops voice with "Not read aloud (sensitive)"; own keys without Cartesia stay on the phone. Duplicates: `test/browser/note-read-aloud.spec.ts`, `test/browser/voice-stop-speaking.spec.ts`, `test/browser/message-actions.spec.ts`, `test/browser/chat-voice-mode.spec.ts`, `test/local-speech-playback.test.mjs`, `test/pixel-spoken-acks.test.mjs` (same fixture family). Callers/importers: `npm test` glob; imports `fixtures/cloud-voice-view.mjs`, `support/strip-types.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-12, 39 | T2 | Regex-strips `import`/`export` from `local-speech-text.ts`, `voice-selection.ts`, `voice-timing.ts`, `local-speech-playback.ts` and two `.eliza` files, then evals them in one shared vm realm. Any import added to those files breaks it. | Delete. | Low |
| 2 | 14-55 | T3/T7 | Hand-built `Shell` class, fake `connectionController`, fake speech engine; 30 globals. | Delete. | None |
| 3 | 60, 64, 111 | A1 | `oldReadRepliesAloud` seeds `alphaphone:speak-replies:v1` "stored by an earlier build" to prove it is ignored: legacy stored data that cannot exist (D1). | Delete with the test. | None |
| 4 | 172-213 | T2 | `onDeviceConversation` drives `cloud-voice-view.mjs` (vm transplant of the voice adapter) with stubbed `BatchVoiceConversation`, `React`. | Delete; carry the two user-visible cases below. | Medium |

## Proposed end state
File deleted. Cases worth carrying into `journeys/voice.spec.ts` (merge of `voice-stop-speaking`, `note-read-aloud`, `chat-voice-mode`), driven through the UI with the existing voice fixture:
1. Read aloud on a reply shows Stop reading; Stop or sending a new message stops playback.
2. A reply that looks like a password ends the voice conversation with "Not read aloud (sensitive)" and nothing is spoken.
3. Note read-aloud refuses a password or URL note before any audio (verify `note-read-aloud.spec.ts` already asserts this; add if not).
