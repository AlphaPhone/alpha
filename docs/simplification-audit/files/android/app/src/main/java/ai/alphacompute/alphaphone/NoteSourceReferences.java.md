# android/app/src/main/java/ai/alphacompute/alphaphone/NoteSourceReferences.java
- Lines: 21 | Role: installed preference names + process singleton for the upstream `SourceReferenceStore` (Notes linked-document grants) | Verdict: KEEP
- Importers: `AlphaMailAttachmentsPlugin` (3), `SelectedDocumentAccess` (1). Text/path pins: `test/note-source-references.test.mjs`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 15-20 | C4 | Hand-rolled `static synchronized` lazy singleton (7 in package). | Keep; optional shared `Lazy` helper later. | None. |
| 2 | 7 | A8 | "J03, option a" refers to an external review item. | Drop the reference. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `PREFERENCES`, `RETAINED_PREFERENCES` | const (persisted pref names) | 13-14 | — | here |

## Proposed end state
Unchanged (~20 lines).

## Verification
`test/note-source-references.test.mjs`, `NotesDocumentInstrumentedTest`.
