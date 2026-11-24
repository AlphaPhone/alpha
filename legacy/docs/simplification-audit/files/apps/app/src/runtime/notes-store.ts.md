# apps/app/src/runtime/notes-store.ts
- Lines: 13 | Role: binds shared `NotesStore` to Alpha's localStorage keys; re-exports storage-full helpers. | Verdict: MERGE into the notes bindings module (with notes-secure-store)
- Importers: 7 app files (`agent-adapter.ts:68`, `notes-query-executor.ts:8`, `notes-query-review.ts:1`, `notes-trash-adapter.ts:4`, `browser-notes-document.ts:6`, `notes-secure-store.ts:4`, `notes-trash-policy.ts:1`) + `scripts/test-notes-action-flow.ts:6`, `test-notes-store-flow.ts:5`, `test-notes-trash-flow.ts:2`.
- Text/path pins: `specs/quint/refinement/application/contracts.mjs:9` (bundles this path), `notes-coordinator.mjs:17`, `specs/quint/application/manifest.json`, `test/notes-pending-editor.test.mjs` (reads text), browser specs `dev-workflow-dates`, `notes-photos-list-focus`, `feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3, 5 | A1 | `LEGACY_NOTES_KEY='alphaphone:prototype:notes:v1'` carried as `notesStorageKeys.legacy`; prototype-era key predating the package. | Delete with the legacy-notes chain (owner). | Owner |
| 2 | 10-12 | A7 | `STORAGE_FULL_CODE` alias: 0 src, 0 tests. | Delete. | None |
| 3 | 13 | D4 | `isStorageFull` rename of upstream `isNotesStorageFull`. | Callers import the upstream name. | Low |
| 4 | 4 | — | `NOTES_KEY='alphaphone:notes:v2'` is still written by the browser build (`browser-notes-document.ts`); keep exactly. | Keep. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `notesStorageKeys` | const | 5 | `notes-secure-store.ts:12` `config` | notes bindings |

## Proposed end state
~6 lines in the notes bindings module: `NOTES_KEY`, `NotesStore` subclass (or factory), `NotesCommitUncertain`/`NoteRecord` re-export.

## Verification
Quint `contracts.mjs`, `notes-coordinator.mjs`, `scripts/test-notes-store-flow.ts`, `test/notes-pending-editor.test.mjs`.
