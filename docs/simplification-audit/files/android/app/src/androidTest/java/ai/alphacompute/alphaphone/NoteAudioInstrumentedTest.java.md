# android/app/src/androidTest/java/ai/alphacompute/alphaphone/NoteAudioInstrumentedTest.java
- Lines: 179 | Role: Notes audio on device: saved audio survives draft removal/recreation/undo, native capture save, dictation into a text note, offline record-and-transcribe UI, deletion expiry, purge ownership, and a legacy-tombstone fence. | Verdict: SIMPLIFY
- Importers: none. Text/path pins: `scripts/ci/pending-recovery-ui.py:24` (phase `audio-fence` runs `#optInRetiredDeletionCannotArriveAfterReloadAndRestore` with `audioFence=true`). Not in `CLASS_REGISTRY` (reachable through `CAMPAIGN_RUNNERS`; `--all` runs the ungated methods).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 160-178 | A1 | `optInRetiredDeletionCannotArriveAfterReloadAndRestore`: "Prior app versions wrote deletedAt without an operation owner. Explicit restore may retire that legacy tombstone" — writes a legacy tombstone and checks the compatibility branch. No such record exists under the new package (D1). | Delete the method and the `audio-fence` phase tuple in `scripts/ci/pending-recovery-ui.py:24`; delete the ownerless-`deletedAt` branch in the note-audio store (upstream `recordings()` or `AlphaNoteAudioPlugin`, check owner). | Medium (cross-file; store branch may be upstream) |
| 2 | 20-25 | C3 | `call/ready/until` copies on top of `NotesSecureFixture.evaluate`. | `WebViewTestDriver.call/until`. | Low |
| 3 | 26-27 | C3 | `wav()` synthetic WAV builder (7 androidTest files) and `plugin()` lookup (33 files); `NoteRecordingSaveInstrumentedTest.java:23-24` has identical copies. | `TestAudio.wav()`, `WebViewTestDriver.plugin`. | Low |
| 4 | 40, 56, 110, 128, 158, 177 | C3 | `for(String suffix:new String[]{".audio",".json",".json.bak",".pending"})new File(...,"note-audio/"+id+suffix).delete()` six times here and in `NoteRecordingSaveInstrumentedTest:48`. | `NoteAudioFiles.delete(context,id)` helper. | None |
| 5 | 72-75, 86, 98-100, 108 | C3/C6 | localStorage save/restore of `alpha.connection.selection.v1` with `{kind:'offline'}` twice. | Shared restore helper + `Keys.SELECTION`. | Low |
| 6 | 90-93, 102 | C3 | React value-setter snippet copies (50 files). | `Ui.setValue`. | Low |
| 7 | 113-114 | A8 | Method name `expiredOwnedDeletionCannotRestoreBeforeMigration` and comment "before the next startup migration removes the audio bytes" — this is the trash backstop, not a data migration; misleading name. | Rename to `expiredOwnedDeletionCannotBeRestored`. | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `wav()` | helper | 26 | `NoteRecordingSaveInstrumentedTest:23` and 5 more | `TestAudio` |
| `plugin()` | helper | 27 | `NoteRecordingSaveInstrumentedTest:24`, 31 more | `WebViewTestDriver.plugin` |
| `click/fillEditor/chooseManualRecording` | helper | 63-67, 90-93 | `NotesDocumentInstrumentedTest.click/title`, `InboxDraftInstrumentedTest.click/input` | `Ui` |
| playback-start observer | helper | 60-62 | none | keep |

## Proposed end state
Six methods (legacy fence removed), shared helpers for audio files, WAV, plugin lookup and UI input. About 135 lines.

## Verification
`npm run test:android:instrumentation -- --classes NoteAudio` (both variants, mic permission granted by the test); `python3 scripts/ci/pending-recovery-ui.py` after removing the `audio-fence` phase.
