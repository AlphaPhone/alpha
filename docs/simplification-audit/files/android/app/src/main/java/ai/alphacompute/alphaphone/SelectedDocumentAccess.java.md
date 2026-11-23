# android/app/src/main/java/ai/alphacompute/alphaphone/SelectedDocumentAccess.java
- Lines: 41 | Role: process-wide singleton of the shared `SelectedDocuments` registry with Alpha's installed names, plus static forwards | Verdict: SIMPLIFY
- Importers: main `DailyAppsPlugin` (documents ×8, initialize, authorize, forget), `AlphaFilesPlugin` (authorize), `AlphaMailAttachmentsPlugin` (resolve ×2, releaseUnreferenced), `AlphaNoteDocumentsPlugin` (readTransientText); androidTest `SelectedDocumentInstrumentedTest`, `NotesDocumentInstrumentedTest`, `CameraScanInstrumentedTest`. Text/path pins: `test/note-source-references.test.mjs`, `specs/quint/native/manifest.json`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 38 | A7 | `shareUri(Activity,Uri)` — 0 callers in android/, test/, specs/. | Delete. | None. |
| 2 | 34, 39-40 | A7 / D6 (P12) | `read(Context,id)` (only `SelectedDocumentInstrumentedTest`) and `selections()` "for instrumentation" (only `NotesDocumentInstrumentedTest`). | Delete; tests call `SelectedDocumentAccess.documents(ctx).read(id)` / `.selections()`. | Low. |
| 3 | 27 | D4 | `initialize(ctx)` == `documents(ctx)` discarding the result. | Delete; callers call `documents(ctx)`. | None. |
| 4 | 28, 31, 33, 36 | D4 (P17) | `authorize`, `releaseUnreferenced`, `restore`, `readTransientText` are one-line forwards to `documents(ctx)`. | Callers use `documents(ctx).x(...)`; keep only `documents`, `resolve`, `forget` (the null-safe "loaded" variants carry real meaning: an unknown ID before load confers no access). | Low. |
| 5 | 19 | A7 | `PREFERENCES`, `PREVIEW_PREFIX` read only here. | Make private. Keep values (persisted). | None. |
| 6 | 14-16 | A8 | Javadoc lists callers. | Trim. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `documents(Context)` lazy singleton | helper | 22-25 | 7 hand-rolled singletons | here |
| `loaded()` | helper | 26 | — | here |

## Proposed end state
~18 lines: installed names, `documents(ctx)`, `resolve(id)`, `forget(id)`.

## Verification
`SelectedDocumentInstrumentedTest`, `NotesDocumentInstrumentedTest`, `CameraScanInstrumentedTest`, Files/Notes document journeys.
