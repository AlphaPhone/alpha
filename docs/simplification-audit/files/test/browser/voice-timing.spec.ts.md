# test/browser/voice-timing.spec.ts
- Lines: 94 | Kind: Playwright spec, chromium, 4 tests; T6-heavy (prototype patches) | Verdict: MERGE into `journeys/voice.spec.ts` (one assertion block); drop the rest
- Covers: a Cloud voice turn records one latency record with ordered marks (`recording-end` … `final-reply`, `first-audio` only when playback starts), warm vs cold, `abandoned` when closed during transcription or discarded under the review policy, and no transcript or identifiers in the export. Duplicates: `test/voice-timing.test.mjs` (host test of the same module); Stop-during-transcription also in `voice-owned-navigation.spec.ts`. Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 18-48 | T6 | Replaces 11 `BrowserVoice.prototype` methods, `connectionController` methods and `Component.prototype.prepareVoiceConversation/voiceConversationCurrent/voiceConversationContext/sendVoiceTurn/renderVals`. The "conversation" is mostly the test's own code. | Run on the shared voice journey (harness Cloud ASR/TTS + agent fake) and read the timing export once at the end. | Medium. |
| 2 | 21, 88-94 | A4/D8 | Test 4 needs `setVoiceSendPolicyForTests('review')`; DECISIONS D8 deletes that test-only override. | Delete test 4. | None (policy is constant `auto-send`). |
| 3 | 52-53 | T6 | Reads records via `exportVoiceTiming()` imported in the page. | If Settings exposes the export (diagnostics), read it there; otherwise keep this single read in the journey as the documented seam. | Low. |
| 4 | 51 | T8 | `waitForTimeout(950)` to fake an utterance. | Use the harness utterance helper that waits on recorded samples. | Low. |
| 5 | 68-77 | T3 | Cold/warm flag per route is a pure module rule. | Leave to `test/voice-timing.test.mjs` if that host test survives its own review; otherwise drop. | Low. |

## Proposed end state
In `journeys/voice.spec.ts`, after the first Cloud turn: one record, marks in order, `first-audio` present once playback
starts, no transcript text or ids in the export; after the Stop-while-transcribing step: the turn is `abandoned` with
only `recording-end`. No prototype patches. File deleted.
