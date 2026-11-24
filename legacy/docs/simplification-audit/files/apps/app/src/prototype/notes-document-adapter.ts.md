# apps/app/src/prototype/notes-document-adapter.ts
- Lines: 34 | Role: Notes "Export as text file" (and a test-mocks-only "Import text file"), plus it patches `api('notes').saveImportedNote` that two other adapters use | Verdict: SIMPLIFY (then MERGE into the notes view owner)
- Importers: `main.tsx:147` only. `saveImportedNote` consumers: `note-source-adapter.ts:70`, `note-web-source-adapter.ts:24`.
  Text/path pins: `specs/quint/refinement/application/notes-document-transfer.mjs:7` transplants the source (T2/T10); `specs/quint/application/manifest.json` pins `exportText, importText, installNotesDocumentAdapter, perform, receipt, testMocksEnabled, whenVisible`; `test/quint-notes-document-transfer.test.mjs`; `test/support/feature-parity.mjs:395`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 22-27, 28 | A5/D5 | `view.importText=()=>{if(!testMocksEnabled)return; …}` and `view.canImportText=testMocksEnabled` — import exists only in test-mocks builds yet its code (and `documents.importText`) ships in production. PRD: no import/export workflow planned (A3) for app data; text-note import is not a product feature here. | Delete the import path (lines 22-27, `canImportText`, `importText` in the plugin type) or move it behind the dev module. ~7 lines. | Quint manifest pins `importText`/`testMocksEnabled`; `test/quint-notes-document-transfer.test.mjs` exercises import. Owner confirms export stays. |
| 2 | 14-15 | D2/D3 | Wraps `Component.prototype.api` to add `saveImportedNote` for all `notes` api calls; two other files depend on it. | Notes view owner exposes `saveNote(patch)`; delete the prototype patch. | Low. |
| 3 | 5-7 | C2 | `AlphaNoteDocuments` plugin interface typed inline. | Typed plugin module (only one user, so fine to keep local after #1 shrinks it). | — |
| 4 | 13 | C3 | `whenVisible()` promise; twin semantics in `native-adapter.ts watchReturnToApp`/`returnGate`. | Shared `whenDocumentVisible()` in `lib/visibility.ts`. | None. |
| 5 | 21 | B1 | `catch{if(token===epoch)receipt('Import failed');}` — the failure toast says "Import failed" also for **export** failures (shared `perform`). | After #1 rename to `'Export failed'` only if owner agrees (user-visible copy change); otherwise keep. | Copy change needs owner. |
| 6 | 1 | D13 | `../../../../.eliza/client-features/plugins/plugin-notes/src/client/note-share-text.ts` deep relative import. | `@eliza/*` alias. | None. |
| 7 | 4 | C1 | `type Bag`. | Shared types. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `documents` plugin | const | 5-7 | none | stays |
| `whenVisible` | helper | 13 | `returnGate`/visibility waits | `lib/visibility.ts` |
| `receipt`, `perform` | helper | 20-21 | similar busy/epoch wrappers in `notes-trash-adapter` | stay |

## Proposed end state
~20 lines: export-only (`canExportText`, `exportText`, busy flag, visible-receipt) inside the notes view owner; no prototype `api` patch; no test-mocks import. Est. 20 lines.

## Verification
`node --test test/quint-notes-document-transfer.test.mjs`, Quint application manifest, Playwright notes export journey, production bundle audit (confirms import code gone), feature-parity test.
