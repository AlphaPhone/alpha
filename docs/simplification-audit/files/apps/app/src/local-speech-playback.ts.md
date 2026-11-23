# apps/app/src/local-speech-playback.ts
- Lines: 61 | Role: native/owned speech playback primitive over `AlphaVoiceCloud` (`speakLocalText` chunked local synthesis, `playOwnedSpeech` for Cloud/paired prepared audio, `confirmSpeechRetirement` latch) with busy-retry, 500 ms bounded cleanup and strict-drain mode | Verdict: SIMPLIFY + MOVE to `runtime/voice/native-speech-playback.ts` (D11: same file name as `prototype/local-speech-playback.ts`, which imports this one)
- Importers: 9 app files — `prototype/local-speech-playback.ts:4`, `prototype/voice-adapter.ts`, `runtime/app-speech.ts`, `runtime/cloud-voice.ts`, `runtime/local-voice.ts`, `runtime/native-reading-voice.ts`, `runtime/paired-voice.ts`, `browser/reading-review.ts`, `browser/simulated-voicemail.ts`. Text/path pins: `specs/quint/refinement/native/renderer-speech-chunk.mjs:44` reads this file's text, strips `^import`/`^export` and evaluates it (T2/T10); `specs/quint/native/manifest.json:141,3309,3361-3447` pins symbols `confirmSpeechRetirement`, `speakChunk`, `dispose`, `playOwnedSpeech`, `speakLocalText`, `strictDrain`, `preparation` and strings `speech-cleanup-unconfirmed`, `playback-busy`; `specs/quint/application/manifest.json`, `speech-cleanup-latch.mjs`, `web-reading-review.mjs`; host tests `test/local-speech-playback.test.mjs`, `local-speech-native-drain.test.mjs`, `local-conversation-cleanup.test.mjs`, `app-speech-route.test.mjs`, `voice-replies.test.mjs`, `navigation-voice-pause.test.mjs`, `offline-signed-out-speech.test.mjs`; `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7, 15, 46, 58 | C2 | `registerPlugin<any>('AlphaVoiceCloud')` twice; `voice:any` parameters — `AlphaVoiceCloud` is typed differently in 16 files | one typed `AlphaVoiceCloud` plugin module; type `voice` | none |
| 2 | 15 | D9 | `speakChunk(voice,native,text,signal,onStarted,queue,requirements?,prepare?,strictDrain=false,voiceTurnId?)` — 10 positional params; call site 12 passes `undefined` to reach param 9 | options object `{queue,requirements,prepare,strictDrain,voiceTurnId}` | medium: renderer-speech-chunk.mjs evaluates the function by name; manifest pins `speakChunk`, `strictDrain`, `preparation`, `dispose` names — keep them |
| 3 | 7-9, 13 vs 47-48, 50 | C3 (local) | deadline+abort controller block duplicated: `controller=new AbortController(),cancel=()=>controller.abort(signal.reason)…setTimeout(()=>controller.abort(Error('Speech did not finish.')),20*60*1000)` + finally cleanup | `withSpeechDeadline(signal, run)` | low |
| 4 | 18-20 | C3 | `bounded(run)` (500 ms best-effort) and the `interrupted` deferred — twins of `native-view-events.ts:9-12 quiet()` and the abort-race helpers (video-transcode.ts:12-13, native-connection.ts:276-287, voice-timing.ts:126-129, workflow-presentation.ts:47-51) | shared `bounded`/`raceAbort` in `runtime/abort-signal.ts` | low |
| 5 | 18, 20, 22, 35 | B1 (justified) | `.catch(()=>{})` on cleanup and on unobserved deferreds | keep; one comment per helper | — |
| 6 | 22 | D8 | `dispose` is one 380-char chained `Promise.all` of ternary spreads | build the task list with `if` pushes | none (name `dispose` pinned) |
| 7 | 10 | A8 | `// Issue #395: …` issue-number comment | state the why without the issue number | none |
| 8 | 30-37, 40 | C3 (local) | two `for(;;){…try{…}catch(error){if(!queue||code!=='playback-busy')throw error;await wait(...)}}` busy-retry loops | `retryWhileBusy(op, prepared)` | low (pinned string `playback-busy` stays) |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `requirements` shape `{execution?;assertCurrent}` | type (inline ×2) | 6, 15 | — | name `SpeechRequirements` |
| `bounded` | helper | 18 | `runtime/native-view-events.ts` `quiet`, `owner-reminder-notification-port.ts` | `runtime/abort-signal.ts` |
| `interrupted` deferred | helper | 19-20 | 5 abort-race sites | `runtime/abort-signal.ts` |

## Proposed end state
`runtime/voice/native-speech-playback.ts`, ~55 lines: typed plugin, options object, one deadline wrapper, one busy-retry helper, formatted `dispose`. Exported names, error codes and messages unchanged. Every importer path (9) and the Quint/manifest paths change with the move.

## Verification
`test/local-speech-playback.test.mjs`, `local-speech-native-drain.test.mjs`, `local-conversation-cleanup.test.mjs`, `voice-replies.test.mjs`, browser `speak-replies.spec.ts`, `note-read-aloud.spec.ts`; Quint native run (`renderer-speech-chunk.mjs`, `speech-cleanup-latch.mjs`) — update the path and keep the `^import`/`^export` line shape it strips.
