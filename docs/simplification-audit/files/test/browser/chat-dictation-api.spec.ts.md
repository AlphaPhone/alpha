# test/browser/chat-dictation-api.spec.ts
- Lines: 138 | Kind: Playwright, `chromium` project; drives an API with no user entry point by capturing the shell (`Component.prototype.renderVals` patch) and calling `startTranscription()`; replaces `/src/build-flags.ts` through `page.route` | Verdict: **DELETE** (and raise the dictation-mode branch as a product delete candidate)
- Covers: chat dictation ("Transcribe"): stop into an editable review, append to the unsent draft, cancel discards late ASR, unavailable speech keeps the keyboard, pagehide discards late output, dictation versus voice-conversation distinction, mute/unmute, `interruptSpeech` capture accounting, recovery after a lost capture. Duplicates: Mute/Unmute and voice conversation submit in `voice-assistant.production.spec.ts`; `interruptSpeech` in `voice-stop-speaking.spec.ts`; Notes recorder review in `browser-speech.spec.ts` / `notes-audio-journey.spec.ts`. Callers/importers: none. Imports `native-speech-fixture.ts` (other importer: `native-speech.production.spec.ts`), `voice-assistant-fixture.ts` (3 others), `voice-fixture-failure-metadata.ts` (2 others): all survive.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 12, 28 | A5 | The file says "there is no chat dictation button". `git grep startTranscription apps android` finds only `apps/app/src/prototype/voice-adapter.ts:913` (definition) and `:1447` (`out.startTranscription=` render value); no template or control calls it. The test reaches unreachable product code. | Delete the test. Add the dictation (`chatDestination.mode==='dictation'`) branch of `voice-adapter.ts` to the delete candidates, pending the owner question below. | Low for the test; product deletion needs the owner answer. |
| 2 | 15 | P4, D8 | Replaces the build-flags module with a hand-written body that must list every export, including `updateChannelCheckEnabled` which D8 deletes; the comment cites a commit and PR. | Gone with the file. | none |
| 3 | 18, 25 | P3 | Patches `Component.prototype.renderVals` and `VoiceAssistantSession.prototype.start` to capture instances. | Gone with the file. | none |
| 4 | 94-122 | T6 | `interruptSpeech()` is invoked on the captured session rather than through a control; the busy-hold capture counts (`starts:3, stops:2`) pin internal accounting. | Delete; `voice-stop-speaking.spec.ts` covers the user-facing Stop speaking. | Low: the reopen-one-capture-after-interrupt count loses its only check; if it matters, add it as a step in `journeys/voice.spec.ts` driven by the Stop speaking control. |
| 5 | 34, 47, 114 | T8, A8 | `waitForTimeout(150)` inside `say`; comments citing `#780` and commit hashes. | Gone with the file. | none |

## Proposed end state
Delete the file. If the owner wants chat dictation, it needs a visible entry point first; then one dictation step in
`journeys/voice.spec.ts` (review, edit, append to draft, cancel discards late text) through that control. Otherwise
delete the dictation mode from `voice-adapter.ts` with this test.
