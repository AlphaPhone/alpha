# test/browser/voice-fixture.ts
- Lines: 58 | Kind: Playwright support (voice boundary fakes) | Verdict: KEEP, SIMPLIFY and MOVE to `test/browser/harness/voice.ts`
- Covers: synthetic silent microphone (`getUserMedia`), synthetic `speechSynthesis`, and a fake local-agent speech route (`agentBrowserVoice`) that records synthesized text and media playback. Duplicates: same job as `cloud-voice-fixture.ts`, `cloud-notes-voice-fixture.ts`, `voice-assistant-fixture.ts`, `generic-cloud-speech-fixture.ts` (five voice fakes, research tests-browser.md "Voice" row). Callers/importers: `agentBrowserVoice` 7 specs (`dev-workflow-speech`, `dev-voicemail-audio`, `note-read-aloud`, `reading-review`, `dev-maps-voice`, `dev-workflow-automatic-speech`, `dev-speech-account-switch`); `localBrowserVoice` 1 (`journey-b-voice-note-actions`); `silentMicrophone` + `agentContext` 1 (`voice-entry-context`); `recorder` 0.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 26 | A7 | `recorder` export has no importer (and names a subview, `notes-recording`, the specs no longer use; they use `notes-recorder`). | Delete. | None. |
| 2 | 27-29 | T6 | `agentContext` imports `/src/runtime/alpha-client.ts` in the page to read internal state. One caller. | Drop; `voice-entry-context` should assert the visible selected note instead. | Low. |
| 3 | 51-52 | T6 | `agentBrowserVoice` replaces `connectionController.getBrowserSpeechAgent` by importing `/src/runtime/connection-ui.tsx` in the page. | When the harness gains a typed local-agent fake at the `Agent`/HTTP boundary, use it; until then keep as the one sanctioned patch in `harness/voice.ts`. | Medium (7 specs). |
| 4 | 39 | D9 | `state` parameter merges an existing fixture object by name lookup on `window` (`w[state]`). One caller uses it. | Pass the shared object explicitly from the harness fixture. | Low. |
| 5 | 4-25, 36-58 | C5 | Five voice fixture files fake overlapping boundaries (mic, synthesis, Cloud ASR, playback). | Merge into `harness/voice.ts` with one options object (`mic`, `asr`, `tts`, `playback`). | Medium. |

## Proposed end state
`harness/voice.ts` exports one `voice` fixture (via `test.extend`) built from this file plus the Cloud/assistant fakes:
silent or tone microphone, synthetic local/Cloud speech, recorded playback with `finish()`. `recorder` and `agentContext`
removed. No `/src` imports except the single documented `getBrowserSpeechAgent` seam until a boundary fake replaces it.
