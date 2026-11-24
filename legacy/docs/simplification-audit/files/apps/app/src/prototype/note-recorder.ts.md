# apps/app/src/prototype/note-recorder.ts
- Lines: 573 | Role: `NoteRecorderSession` state machine over the native segmented note recorder (begin/adopt/pause/resume/stop/finish/discard), owner binding, optional segment transcription and a live transcript stream; plus `addSavedNoteTranscript` and clock formatting | Verdict: SIMPLIFY + MOVE to `apps/app/src/runtime/note-recorder.ts`
- Importers: `voice-adapter.ts:44` (the only product constructor, line 1180), `canonical-notes-ui.ts:13` (type), `runtime/note-recorder-driver.ts:9` (types), `browser/voice.ts` (type). Tests: `test/notes-recorder.test.mjs`, `test/notes-recorder-controls.test.mjs`, `test/browser-note-pending-audio.test.mjs`, `test/saved-note-transcript.test.mjs`, `scripts/test-cloud-voice-flow.ts`, fixtures `test/fixtures/cloud-voice-view.mjs:59` (loads the text and rewrites `export class`, T2), `test/fixtures/notes-recorder-media.mjs:24` (monkey-patches `NoteRecorderSession.prototype.begin`, T6), `test/fixtures/NoteRecorderJournalTest.java`.
  Text/path pins: `LemmaScript-files.txt:11` and `specs/lemma/apps/app/src/prototype/note-recorder.dfy(.gen)` + `specs/lemma/README.md:184` verify `recordingClockParts` (the `//@` annotations at 110-115 must stay verbatim); `specs/quint/application/manifest.json:3429`, `specs/quint/legacy/manifest.json:1095`, `specs/quint/refinement/application/notes-recorder-media-admission.mjs`; `test/support/feature-parity.mjs:392`. Moving the file changes all of these paths.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 69-72, 148-155, 220-261, 263-268 (live part), 357 | A4/A7 | Live transcription stream: `NoteLivePort`, `NoteLiveHandlers`, `liveFinals/liveInterim/liveAt/liveStream/liveOpening/liveLost`, `syncLive`, `closeLive`, `displayTranscript`. The only product constructor (`voice-adapter.ts:1180-1188`) passes **no `live` option**, so `syncLive` always takes the `!want` path; `displayTranscript` has no product caller (grep: only `test/notes-recorder.test.mjs`). | Delete (~60 lines) unless the owner says live note transcription is planned (then record it in DECISIONS.md). Keep `closeLive()` call sites removed together. | Owner question; tests 352-460 in `test/notes-recorder.test.mjs` go with it. |
| 2 | 75-76, 133-137, 158, 168-171, 382-424, 412, 415-417, 499-501 | A4 | Automatic/explicit segment transcription: the product constructor passes `async () => null` as transcriber and `automaticTranscription:false`, and only ever calls `finishAudio` (audioOnly=true), so `pump()` never runs, `texts` stays empty (except journal text from older segments), `needsTranscriptionConsent`, `transcriptionFailed`, `noRoute`, `remoteApproved`, the `keepAudio=false` non-audio path and the `'sign-in'/'transcription'/'unavailable'` error reasons are unreachable in product. The header (lines 7-8) admits it: "The optional session transcriber remains available to callers that explicitly enable it." | Collapse `finish()` to the audio-only path that `finishAudio` uses; delete `pump`, `SegmentTranscriber` constructor arg, `remoteTranscription`/`automaticTranscription` options, `needsTranscriptionConsent`, `noRoute`, `transcriptionFailed`. Keep `absorb()` + `transcript()` only if recovered journal text must still be saved (check `runtime/note-recorder-driver.ts setText` callers: none outside `pump`). ~150 lines. | Owner question; `scripts/test-cloud-voice-flow.ts:74-80` and ~10 tests in `notes-recorder.test.mjs` exercise the dead path. `runtime/note-recorder-driver.ts noteSegmentTranscriber` (exports `SegmentTranscriber` users) becomes dead too — cross-file. |
| 3 | 179-182 | C3 | SHA-256 → hex inline (`crypto.subtle.digest('SHA-256', …)` + `byte.toString(16).padStart(2,'0')`). ~28 renderer twins. | Shared `sha256Hex` in `apps/app/src/lib/`. | None; digest is persisted as `binding.ownerDigest` — same output. |
| 4 | 12, 161 | D7 | "This module has no imports so its logic runs under `node --test`" and "Plain fields, not parameter properties: this module runs under Node's type stripping." Production code shaped for the test loader; blocks #3. | Allow a `lib/` import once tests load through the normal TS loader; drop the comments. | Low. |
| 5 | 81 | C3 | `aborted = error => error?.name === 'AbortError'` — `isAbortError` twin (research C3; also `notes-share-adapter.ts:11`). | Shared `isAbortError`. | None. |
| 6 | 84-97 | D10 | `noteRecorderError` if-chain of 11 reasons. | Lookup table `Record<Reason,string>` with default; after #2 only `storage/recovery/permission/call/save/owner/media/capture` remain. | None; copy is user-visible — keep strings exactly. |
| 7 | 566-572 vs 552-560 | C5 | `leave()` repeats most of `close()`'s field reset in one 400-char line. | Extract `resetView()` used by both. | Low. |
| 8 | 260, 339, 417, 571 | B1 | `.catch(() => {})` on close/remove/stop; `catch { /* The audio is kept… */ }`. Best-effort teardown; acceptable with comments. | Keep the commented ones; add a reason to bare ones. | — |
| 9 | 337, 373 | D8 | `if (this.poll) clearTimeout(this.poll); this.poll = undefined;` on one line reads as if guarded. | Format. | None. |
| 10 | whole file | D11 | Pure runtime/domain module under `prototype/` (research §5). | Move to `apps/app/src/runtime/note-recorder.ts` beside `note-recorder-driver.ts`. | Path pins above (Lemma file list and .dfy path, Quint manifests, feature-parity). |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `NoteSegment`, `NoteRecordingBinding`, `NoteRecordingStatus`, `SavedNoteAudio`, `NoteRecorderDriver` | type/interface | 14-23, 57-68 | mirrored in `test/fixtures/cloud-voice-view.d.mts` | stay (runtime/note-recorder.ts) |
| `CanonicalNoteSaveIntent` | type | 51-56 | none | stays |
| `NoteLiveHandlers`, `NoteLivePort` | interface/type | 70-72 | none | delete (#1) |
| `NoteRecorderOwner`, `NoteRecorderOptions` | type | 73-74 | none | stay (shrunk) |
| `SegmentTranscriber` | type | 76 | used by `runtime/note-recorder-driver.ts:57-58` | delete with #2 or move to driver |
| `NoteRecorderPhase` | type | 78 | none (no importer) | unexport |
| `aborted` | helper | 81 | `isAbortError` twins | `lib/abort.ts` |
| `startFailure` | helper | 99 | none | stays |
| `recordingClockParts`, `formatRecordingClock` | helper | 109-122 | clock formatters `telephony-presenters.ts clockLength` (different format: m:ss only) | stay (Lemma-verified) |

## Proposed end state
`runtime/note-recorder.ts`: types, `addSavedNoteTranscript`, error table, clock helpers, and a `NoteRecorderSession` limited to begin/adopt/attach/apply/poll/pause/resume/togglePause/stop/finishAudio/discard/keep/close/leave/recheckOwner/visibilityChanged with owner binding (shared `sha256Hex`). No live stream, no segment transcription pump. Est. ~380 lines (from 573); ~400 if the owner keeps automatic transcription but drops the live stream.

## Verification
`node --test test/notes-recorder.test.mjs test/notes-recorder-controls.test.mjs test/browser-note-pending-audio.test.mjs test/saved-note-transcript.test.mjs`, `scripts/test-cloud-voice-flow.ts`, Lemma verification of `recordingClockParts` (`LemmaScript-files.txt`), Quint notes-recorder-media admission, Android `NoteRecorderJournalTest`, Playwright notes recorder journeys, `npm run verify`.
