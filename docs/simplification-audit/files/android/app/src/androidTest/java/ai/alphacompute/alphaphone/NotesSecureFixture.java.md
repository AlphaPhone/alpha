# android/app/src/androidTest/java/ai/alphacompute/alphaphone/NotesSecureFixture.java
- Lines: 36 | Role: test helper: calls Capacitor promises through the WebView, reads the encrypted Notes slot `notes-records:v1:device`, binds `__notesEnvelope` into expressions, and replaces records by exact CAS. | Verdict: SIMPLIFY
- Importers: 18 androidTest files (`NotesSecureFixture.` in `BrowserPageQuestion`, `ClockHistoryFixture`, `CombinedAgent`, `CombinedAgentRestart`, `ConnectionChooser`, `DeviceAction`, `Flow`, `JourneyJ05`, `LiveAgent`, `NoMockProduct`, `NoteAudio`, `NoteAudioMetadataEncrypted`, `NotesDocument`, ...). Text/path pins: none.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 20-23 | D4/D11 | `evaluate`/`evaluateSensitive` are pass-throughs to `WebViewTestDriver` unless the expression mentions `__notesEnvelope`; many callers (`NoMockProductInstrumentedTest`, `LiveAgentInstrumentedTest`) use it as a general evaluator. | Rename to `evaluateWithNotes(expression)` that always binds the envelope; other callers use `WebViewTestDriver.evaluate`. | Low (18 files touched) |
| 2 | 9-15 | C3 | `call(expression)` is the best of ~12 promise-to-global bridge helpers in androidTest (`HostedResultNotice`, `NoteOrigin`, `InboxOperationJournal`, `LargeInboxAttachment`, `LocalSpeechBridge`, `NoteAudio`, `InboxDraft`, ...). | Move to `WebViewTestDriver.call` (with an option to return `{error:true}` instead of asserting) and delete the copies. | Low |
| 3 | 8, 19, 28-30 | - | Pins the current Notes slot envelope (`currentRaw` holding `{records}`); this is the current persisted format (D1 keeps it byte-identical; `apps/app/src/runtime/browser-notes-document.ts:13`). | Keep; update together with any envelope change. | Low |
| 4 | 16-18 | T8 | `read()` polls for 20 s until Notes are initialised. | Keep (condition wait, not a fixed sleep). | - |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `call` | helper | 9-15 | ~12 copies (see finding 2) | `WebViewTestDriver.call` |
| `SLOT` | const | 8 | `"notes-records:v1:device"` in main (`RendererCredentialSlots`) | keep or reference the main constant |
| `replaceRecords` | helper | 27-34 | none | keep |

## Proposed end state
`NotesSecureFixture` keeps `read`, `raw`, `evaluateWithNotes`, `replaceRecords`; the generic `call` moves to `WebViewTestDriver`. About 28 lines.

## Verification
Every Notes-touching instrumentation class (`NoteAudio`, `NotesStorageDurability`, `JourneyJ05`, `Flow`, ...) on both variants after the rename.
