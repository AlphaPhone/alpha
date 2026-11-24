# test/browser/voice-levels.spec.ts
- Lines: 26 | Kind: Playwright spec, chromium, 2 tests | Verdict: MERGE into `journeys/notes.spec.ts` (voice-note recording section)
- Covers: Notes recorder level bars follow microphone amplitude; Home pauses a browser recording and Notes adopts it; Discard asks once and closes the mic and meter; stopping keeps playable clip bytes. Duplicates: Home-pauses/Discard overlaps `cloud-notes-voice-fixture` users (`voice-preparation-ownership` test 2, `voice-save-ownership`). Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1,6 | A1 | Opens Notes through `openLegacyNotes` ("Previous notes" source), which is deleted with the legacy Notes engine (A2 / D1). | Rebase on the current Notes view. | Breaks when A2 lands. |
| 2 | 21-26 | T6 | Test 2 never touches the UI: it imports `BrowserAudioCapture` and `audio-levels` in the page and calls them. | Delete test 2; assert "Stop keeps a playable clip" in test 1 by pressing Stop instead of Discard, then checking `Play recording`. | Low. |
| 3 | 15 | T6 | Reads `noteRecordingStatus()` through `registerPlugin` in the page. | Assert the visible paused state in Notes (line 17 already does). Drop line 15. | None. |
| 4 | 4 | T7 | Hand-written oscillator/`AudioContext` subclass to count meters. | Move the tone source into `harness/voice.ts` (`mic: 'tone'`). | Low. |
| 5 | 14 | T6 | `window.dispatchEvent(new Event('launcher-home'))` stands in for the Home gesture. | Use the harness `goHome()` helper (one place for this event). | None. |

## Proposed end state
One step in the voice-note recording section of `journeys/notes.spec.ts`: record with the tone mic, bars rise and fall
with gain, Home pauses, Notes resumes the paused recorder, Discard confirms and releases the mic. A second step stops a
recording and sees `Play recording`. Needs `harness/voice.ts` (`mic:'tone'`) and `harness/nav.ts`. File deleted.
