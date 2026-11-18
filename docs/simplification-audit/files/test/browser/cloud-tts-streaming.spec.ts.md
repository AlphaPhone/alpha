# test/browser/cloud-tts-streaming.spec.ts
- Lines: 176 | Kind: integration (real `scripts/local-agent-dev-bridge.ts` handler + real renderer + real MediaSource playback) driven by `page.evaluate`, chromium; one test is module-in-page | Verdict: **KEEP, trimmed and moved** to `test/browser/dev-host/cloud-speech-stream.spec.ts` (owner question below)
- Covers: on the desktop development host, Cloud read-aloud audio streamed by the local agent starts playing before the body ends, Stop aborts the download and playback, a missing MediaSource buffers the clip, a cut-off clip fails instead of finishing, a 402 refusal is sanitised, and a prepared clip stops downloading when the page is hidden. Duplicates: `test/browser-streamed-speech.test.mjs` (transplant of `browser/voice.ts`, T2, being deleted) and `test/browser-voice-cancellation.test.mjs` (prepared-clip cancellation). Callers/importers: none. 6 tests.
- Runtime: **each test starts its own Vite dev server** (`createServer` in `start()`, line 33) on top of the shared one, and imports `scripts/local-agent-dev-bridge` into the runner (P15). Notable.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 16-38 | P11 / cost | A fresh Vite server per test (6 per run). | Start one server in `test.beforeAll` and reset the fake agent per test. | Low. |
| 2 | 6 | P15 | Top-level import of `../../scripts/local-agent-dev-bridge` into the Playwright process; a broken script stops `--list` for the whole suite. | Keep (this is the point of the integration) but isolate the file in its own `dev-host` project so a broken import does not hide other specs. | Low. |
| 3 | 39-55 | P3 / P2 | Replaces `connectionController.getBrowserSpeechAgent/getCloudEnvironment/getCloudClient/getSnapshot` and wraps `HTMLMediaElement.prototype.play` in-page; drives speech through `createCloudVoice().speak()` instead of a read-aloud button. | Drive "Read aloud" on a reply bubble and observe playback through the media element; keep the controller overrides only for the Cloud binding until the harness provides a dev-host Cloud fixture. | Medium: user-level triggering changes timing. |
| 4 | 158-175 | T6 / T3 | Last test imports `StreamedSpeech`/`streamedSpeechSource` and calls them directly; it is a unit test of one function. | Delete; the Stop test already proves the download is aborted when playback ends. | Low: loses the "element drops its MediaSource" branch. |
| 5 | 112 | T8 | `waitForTimeout(750)` to prove playback has *not* started. | Wait for the body to close and assert `firstAudioMs` was undefined until then (already asserted after). | Low. |
| 6 | 8, 10 | A8 | "fake paired agent" wording: this is the developer local-agent bridge, not hosted pairing (C4 does not delete it). | Reword. | none |

## Proposed end state
A `dev-host` Playwright project (runs only when `scripts/local-agent-dev-bridge.ts`, `apps/app/src/browser/voice.ts` or `runtime/cloud-voice.ts` change) with one file and five tests sharing one Vite server. Owner question: the APK uses the native `AlphaVoiceCloud` plugin, so this covers only the desktop development host; if that host does not need regression coverage, delete the file instead.
