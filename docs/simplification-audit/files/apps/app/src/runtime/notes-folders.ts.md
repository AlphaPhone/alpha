# apps/app/src/runtime/notes-folders.ts
- Lines: 20 | Role: storage for the Notes folder list (Android secure slot / browser document) with CAS edit and readback; re-exports the model. | Verdict: SIMPLIFY (→ durable slot)
- Importers: `prototype/agent-adapter.ts:38`, `prototype/notes-folders-adapter.ts:1`, `prototype/notes-trash-adapter.ts:7`.
- Text/path pins: `specs/quint/legacy/notes-view/check-notes-view-refinement.mjs:37,42,76` (loads `/src/runtime/notes-folders.ts` by path), `specs/quint/application/manifest.json`, `test/browser/mvp.spec.ts`, `feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-9, 14-18 | C4/P3 | Own slot/document switch, own `native()` predicate, own CAS with "Notes folders changed". | `durableSlot(NOTES_FOLDERS_SLOT, browserNotesFoldersKey)`; edit = `slot.edit(raw=>…)`. | Medium (installed names) |
| 2 | 7 | C1 | inline `BrowserDocument` shape, also spelled in `reminder-journal-store.ts:4`. | Import `BrowserJsonDomainDocument` type. | None |
| 3 | 16-18 | B3 | validates `update(doc)` again although the model functions validate. | See notes-folders-model #1. | Low |
| 4 | 4 | D4 | `export * from './notes-folders-model'`. | Callers import the model directly. | Low |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `browserDocument` shape | type | 7 | `reminder-journal-store.ts:4` | `browser/json-domain-document` type |
| `native` | helper | 9 | 5 `android()` copies | `native.ts` `isAndroid` |

## Proposed end state
~8 lines: `const folders=durableSlot(...)`, `readNotesFolders`, `editNotesFolders` (validate once, skip unchanged, readback).

## Verification
`test/browser/mvp.spec.ts`, legacy notes-view refinement, notes folders adapter flows.
