# apps/app/src/browser/voice.ts
- Lines: 459 | Role: web implementation of the `AlphaVoiceCloud` and `AlphaNoteAudio` Capacitor plugins: quick clip capture, Notes recording with segment journal and crash recovery, transcription/synthesis routed to the local agent or (dev / Mac preview) Cloud, HTMLAudio + MediaSource streamed playback, note audio retention/deletion | Verdict: SPLIT
- Importers: 1 in apps — `browser/register.ts:7,20-22` (one instance registered for both plugin names). Exports `StreamedSpeech`, `streamedSpeechSource` used only by tests. Text/path pins: T2 transplants `test/browser-note-pending-audio.test.mjs:10`, `test/browser-streamed-speech.test.mjs:13`, `test/browser-voice-cancellation.test.mjs:11` (`load(...,'BrowserVoice')`), `test/browser-saved-transcript-audio.test.mjs:6` (reads source text), `test/agent-always-local.test.mjs:256` (scans text); `specs/quint/application/manifest.json:3433` (source path), `specs/quint/refinement/application/notes-recorder-media-admission.mjs:13`; ~20 browser specs import `/src/browser/voice.ts` (`browser-speech`, `chat-voice-mode`, `cloud-tts-streaming`, `note-audio-*`, …); `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 81-91 vs 93-108 | C3 (local) / research P17 | Two copies of "decode once, slice a 25 s PCM window, encode WAV" (recovered window vs saved note window) | one `pcmWindow(pcm,offsetMs,durationMs)` returning `{blob,pcm,empty}` | low; saved-transcript test reads text |
| 2 | 94, 104, 107 | C6 | `25_000` hard-coded thrice although `NOTE_SEGMENT_MS` is declared at line 20 | use `NOTE_SEGMENT_MS` | none |
| 3 | 222, 238, 252, 276 | C3 (local) | busy guard `this.activeSpeechId||this.audio||this.pendingAudioId||this.speechRequests.has('stt')||…has('tts')` + `Object.assign(Error('Playback is busy.'),{code:'playback-busy'})` 4× (276 omits the request check) | `private assertIdle(includeRequests=true)` | none (code `playback-busy` pinned by native manifest semantics) |
| 4 | 226-227, 247, 260-261 | C3 (local) | `this.agentAudio.set(id,…);while(this.agentAudio.size>8)this.agentAudio.delete(this.agentAudio.keys().next().value!)` 3× | `PreparedAudio.add(entry)` returns the new playback id and caps at 8 | none |
| 5 | 204, 211, 221, 290 | B4 / D5 | `if(!devSurfacesEnabled)throw Error('Cloud voice requires the native app or a development host.')` in `cloudBinding` and again in its two callers | keep the caller guards (they run before `withAgentSpeech` supersedes an in-flight request); delete the one in `cloudBinding` | none |
| 6 | 275 | C3 / P5 | inline lock+background predicate (`document.hidden||…devBackground==='true'||Array.from(document.querySelectorAll('[aria-label="Unlock with fingerprint"], [aria-label="Wake"]'))…`) | `noticeActionBlocked()` | none |
| 7 | 52-58 | A1 | "Older pending rows contain no completion markers…" — legacy recovery branch synthesising recovery windows for pre-journal rows | delete with A1 decision (research §7 Q1) | owner sign-off; `browser-note-pending-audio.test.mjs` covers it |
| 8 | 175, 346 | A1 | `void migrateAudio().catch(()=>{})` at construction and `migrationStatus(){return migrateAudio();}` — note-audio migration of old IndexedDB rows; `migrationStatus` has no renderer caller (grep apps: 0; used by `note-audio-lifecycle.spec.ts`, native has its own) | delete both with the store migration if owner confirms no old data | owner |
| 9 | 340-344 | A7 | `saveRecording` (quick-clip → note audio): no renderer caller (grep apps: 0); used by browser specs, native instrumented tests and `scripts/test-cloud-voice-flow.ts` | owner: keep if it is the plugin contract parity; else delete with its specs | low |
| 10 | 167, 174, 348 | B2 | `typeof BroadcastChannel!=='undefined'?new BroadcastChannel(…):undefined` and `this.audioChanges?.` | BroadcastChannel exists in every target; make it required | none |
| 11 | 141, 159 | B1 | `noteRecordingJournal().retire(...).catch(()=>{})` | keep with comment "journal retirement is best effort; recoverNote re-reads" or report to crash log | low |
| 12 | 24-29 | D9 | `Promise.resolve(connectionController).then(...)` wraps a synchronous facade only to defer the `subscribe` | subscribe in the constructor (facade is bound before construction, per comment at 181) | low — verify order with `browser-voice-registration.spec.ts` |
| 13 | 203-248, 379-459 | D6 / D11 | Dev / Mac-preview Cloud speech (`cloudBinding`, `transcribeRecording`, `synthesize`, `transcribeDevelopmentCloudRecording`, `synthesizeDevelopmentCloud`) and the MediaSource streaming classes (~120 lines) share a file with Notes recording and product local-agent speech | SPLIT: `browser/voice/note-recording.ts` (36-161), `browser/voice/streamed-speech.ts` (393-459), `browser/voice/cloud-speech.ts` (203-248), `voice.ts` keeps the plugin class + playback | medium: 4 T2 tests load this file by path and must move with it (or be deleted per T2) |
| 14 | 37, 119 | D8 | inline `import('../prototype/note-recorder').NoteRecordingBinding` type twice | `import type {NoteRecordingBinding}` | none |
| 15 | 6 | D13 | `../../../../.eliza/client-features/packages/voice/...` deep relative import | `@eliza/*` alias | low |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `NOTE_SEGMENT_MS` | const | 20 | native recorder segment bound (Java) | keep |
| note state object | type (inline) | 37 | `prototype/note-recorder.ts` status shape | name it `NoteRecording` |
| `PreparedAudio` | class | 379-382 | none | keep, add `add()` |
| `playbackWait` | helper | 383-392 | timeout+abort race twins (local-speech-playback.ts, video-transcode.ts) | `runtime/abort-signal.ts` |
| `StreamedSpeech`, `streamedSpeechSource`, `mediaEvent`, `SPEECH_TYPE` | class/helper | 394-459 | none | `browser/voice/streamed-speech.ts` |
| busy guard | helper (inline) | 222… | — | `assertIdle` |

## Proposed end state
`voice.ts` ≈ 200 lines (plugin class, local-agent speech, playback, deletion) + `voice/note-recording.ts` ≈ 120 + `voice/cloud-speech.ts` ≈ 45 + `voice/streamed-speech.ts` ≈ 65 → ≈ 400 total (about 45–60 fewer lines from dedup, plus ~12 more if A1 branches go). Plugin method names, event names (`noteRecordingChanged`, `playbackEnded/Failed/Stopped`, `started`, `ended`, `failed`, `recordingStopped`), error copy and codes unchanged.

## Verification
Host tests: `browser-note-pending-audio`, `browser-saved-transcript-audio`, `browser-streamed-speech`, `browser-voice-cancellation`, `agent-always-local`, `notes-recorder`, `cloud-voice-limit`, `direct-browser-transcription`. Browser specs: `browser-speech`, `chat-voice-mode`, `cloud-tts-streaming`, `browser-cloud-dev`, `note-audio-*`, `notes-trash-recovery`, `voice-owned-navigation`, `voice-timing`. Quint application run (`notes-recorder-media-admission.mjs` path list).
