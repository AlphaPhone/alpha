# apps/app/src/runtime/notes-view.ts
- Lines: 68 | Role: pure Notes list helpers: search text, filter, filter label, sort, preview, date label; `NotesKind`/`NOTES_KINDS`. | Verdict: SIMPLIFY (small)
- Importers: `prototype/model.js:25`, `prototype/notes-organize-executor.ts:4`, `prototype/notes-query-executor.ts:10`, `prototype/notes-trash-adapter.ts:8`, `runtime/notes-organize-contract.ts:3`.
- Text/path pins: `test/notes-view.test.mjs`, `test/notes-view-defaults.test.mjs`, `test/notes-organize.test.mjs`, `feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8, 14-17 | C1/B3 | local `Note` type with every field `unknown`, then `strings()`/`transcript()` guard each field. Callers pass `NoteRecord`s from validated storage. | Type as `NoteRecord`; keep only the guards for genuinely optional fields. | Low (model.js passes plain objects) |
| 2 | 9-10 | C6/A2 | `NotesKind`/`NOTES_KINDS` duplicate upstream `NOTES_KINDS` (`plugin-assistant/.../notes-organize-contract.ts:15`) and `notes-trash-policy.ts:14`. | Import upstream. | None |
| 3 | 31 | C6 | `KIND_LABEL` duplicates upstream `KIND_LABELS` and local `notes-organize-contract.ts:59`. | Import or keep one. | None |
| 4 | 37 | A7 | `noteInstant` exported, 0 external users. | Unexport. | None |
| 5 | 3-7 | A8 | "PLAN.md section 3"; "Dependency-free so test/notes-view.test.mjs exercises it directly" (D7 note). | Rewrite comment. | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `Note` | type | 8 | `NoteRecord`, `notes-folders-model.ts:64` `FolderNote` | `NoteRecord` |
| `NotesKind`, `NOTES_KINDS` | type/const | 9-10 | upstream organise contract, `notes-trash-policy.ts:14` | upstream |
| `KIND_LABEL` | const | 31 | upstream `KIND_LABELS` | upstream |
| `fold` | helper | 15 | NFKC fold in `notes-folders-model.ts:23` `key` | `lib/text.ts` |

## Proposed end state
~55 lines; typed on `NoteRecord`, kinds/labels imported, comment trimmed.

## Verification
`test/notes-view.test.mjs`, `test/notes-view-defaults.test.mjs`, Notes list browser specs.
