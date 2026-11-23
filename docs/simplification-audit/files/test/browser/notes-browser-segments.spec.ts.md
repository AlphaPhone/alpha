# test/browser/notes-browser-segments.spec.ts
- Lines: 30 | Kind: Playwright spec, chromium, 1 test; module-in-page (`BrowserAudioCapture`) with ~5.5 s of real sleeps, no user action | Verdict: DELETE
- Covers: browser audio capture emits bounded standalone segments while recording (pause excluded), each decodable, plus the whole clip. Duplicates: none in Playwright. Callers/importers: none. Product users of `segmentMs`/`onSegment`: `apps/app/src/browser/audio-capture.ts`, `apps/app/src/browser/voice.ts`, `apps/app/src/prototype/voice-adapter.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-20 | T6 | Constructs `BrowserAudioCapture` directly and calls `start/pause/resume/stop`; a unit test in a browser costume. | Delete. Segmenting is the browser stand-in for the native recorder; the canonical notes journey already records through the real UI. | Coverage: segment boundaries and per-segment decodability (browser build only) |
| 2 | 14 | T8 | `setTimeout` waits of 2.2 s, 1.5 s and 1.8 s; tolerance 400 ms per segment. | n/a. | None |
| 3 | 5 | C5 | Third copy of the oscillator microphone. | n/a. | None |

## Proposed end state
File deleted. If segment upload matters to a user-visible result (transcription of a long note), assert that result in `journeys/notes.spec.ts` with the cloud voice fixture counting segment requests.
