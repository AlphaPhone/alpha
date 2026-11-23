# test/browser/voice-owned-navigation.spec.ts
- Lines: 110 | Kind: Playwright spec, chromium, 13 tests (loops); heavy in-page monkey-patching | Verdict: MERGE into `journeys/voice.spec.ts` (conversation navigation section)
- Covers: a spoken "open Notes/Calendar/Home" turn navigates via the agent's claim/ack handshake while the conversation keeps listening, the unsent chat draft and reply/edit targets survive, and Stop/account change/selection change during held claim, ack, TTS or ASR admit no late navigation, speech or rearm; empty ASR and billing failure need an explicit restart. Duplicates: Stop-during-transcription also in `voice-timing.spec.ts` test 3; restart-after-failure overlaps `chat-voice-mode.spec.ts`. Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 22-37 | T6 | `setup` imports five product modules in the page and replaces `connectionController.getSnapshot/prepareVoiceConversation/voiceConversationCurrent/captureViewNavigation`, `BrowserVoice.prototype.*` and `Component.prototype.sendVoiceTurn/renderVals`. The test drives the real coordinator only between patched seams. | Replace with `harness/voice.ts` (Cloud ASR/TTS at the plugin boundary) plus a harness agent fake that answers `VIEWS_SHOW` and `/api/views/interact-*` over the transport. | High effort; this is the main reason to build the agent fake. |
| 2 | 14, 39-40 | T6 | Drives `shell.setState`, `shell.startVoice()` and seeds `messageReplyTarget` directly instead of typing a draft and pressing Talk. | Type a draft in the composer, choose Reply on a message, press Talk. | Low. |
| 3 | 22 | A1 | `openLegacyNotes` is used only to snapshot the notes document; it disappears with A2. | Use the current Notes store snapshot (or assert no new note is visible). | Breaks when A2 lands. |
| 4 | 44 | T7 | Navigation journey runs twice (`sheet`, `full` detents). | One detent; the other detent is a layout concern for the accessibility sweep. | Low. |
| 5 | 54-55 | T4 | Five variants of "late handshake after Stop/change" (claim, ack × user-navigation, account, selection). | Keep Stop-during-held-claim and account-change-during-held-ack; drop the rest. | Low. |
| 6 | 50,54-57,79,95,105 | T8 | `waitForTimeout(1600/400/1000/700/500)` to prove nothing happened late. | Wait on the release promise, then a single animation frame; assert counters. | Low. |
| 7 | 100-110 | T6 | Calls `mediaDriver.notifyListeners('recordingStopped')` to simulate stale callbacks. | Delete this case (internal event ordering; no user action reaches it). | Coverage of stale-capture guard moves to Quint/voice model if modelled; owner question. |
| 8 | 43 | B5 | `afterEach` attaches a debug blob on failure. | Use Playwright trace. | None. |

## Proposed end state
In `journeys/voice.spec.ts`: one conversation that says "open Notes", "open Calendar", "go Home" and checks the active
view, the retained draft and one claim+ack per turn; one Stop-while-claim-held step; one account-change-while-ack-held
step; one empty-transcript and one billing-failure step that require Talk again. Needs `harness/voice.ts`,
`harness/agent.ts` (view-navigation routes) and `harness/nav.ts`. About 30 lines. File deleted.
