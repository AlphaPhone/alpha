# test/browser-streamed-speech.test.mjs
- Lines: 62 | Kind: transplant (T2; whole `browser/voice.ts`, imports stripped by regex, `import.meta.env.DEV`→`false`, run by `new Function` with a hand-written MediaSource/SourceBuffer stand-in) | Verdict: DELETE; REWRITE as cases in `test/browser/journeys/voice.spec.ts`
- Covers: streamed Cloud speech is fed into MediaSource; on completion the object URL and listeners are released without cancelling the download; on element detach, refused/failed append or Stop the download is cancelled and everything released. Duplicates: Playwright `browser-agent-tts.spec.ts`, `voice-stop-speaking.spec.ts` (Stop interrupts the reply once), `browser-audio.spec.ts`; `browser-voice-cancellation.test.mjs` compiles the same module the same way. Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 13 | T2 | Regex import removal + DEV substitution; the comment at 10-12 relies on "nothing else in it runs here". | Delete. | none |
| 2 | 17-30 | T3 | The test re-implements Media Source Extensions event ordering; Chromium has the real one. | Use real MSE in Playwright with a `page.route` streaming `audio/mpeg` body. | low |
| 3 | 38 | — | Listener counting with `getEventListeners`: implementation detail; a leak shows as continued download or unreleased URL. | Journey asserts the route saw the body cancelled. | low |

## Proposed end state
Delete. Journey: a Cloud speech reply streamed via `page.route` plays; pressing Stop mid-stream aborts the response (route observes `request.failure()`/closed) and Stop speaking disappears; a stream that completes leaves no active request and Stop speaking hides.
