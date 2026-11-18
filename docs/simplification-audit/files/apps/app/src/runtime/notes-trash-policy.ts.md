# apps/app/src/runtime/notes-trash-policy.ts
- Lines: 73 | Role: Alpha's inputs to the shared Notes Trash policy (30 days, limits, kinds) plus 11 one-line forwards and the days-left copy. | Verdict: SIMPLIFY
- Importers: `prototype/notes-trash-adapter.ts:6`, `runtime/notes-store.ts:12`, `runtime/notes-trash.ts:5,7` (`export *`), `scripts/test-notes-trash-flow.ts:7-8`. Android mirrors constants: `NOTES_TRASH_MAX_BYTES` in `AlphaCredentialStore.java`, `NOTES_TRASH_RETENTION_MS` in `AlphaNoteAudioPlugin.java`.
- Text/path pins: `specs/quint/refinement/application/contracts.mjs:10` (bundles path), `specs/quint/application/manifest.json`, browser specs `notes-trash-full`, `notes-trash-recovery`, `feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 28-73 | D4 | Eleven forwards `export function emptyNotesTrash(){return policy.empty();}` … `sortedNotesTrash`. Only `addNotesTrashEntry`, `notesTrashExpired`, `removeNotesTrashEntries`, `sortedNotesTrash`, `isNotesTrashFull` have product callers; `emptyNotesTrash`, `validateNotesTrash`, `notesTrashDaysLeft`, `planNotesTrash`, `restoreNotesTrashEntry`, `notesTrashOverflows` are used only by `scripts/test-notes-trash-flow.ts`/tests. | Export `notesTrashPolicy` and call `notesTrashPolicy.add/expired/remove/sorted` at the 3 callers; delete the forwards (~30 lines). | Low (script + Quint bundle import names) |
| 2 | 55-58 | D7/B1 | `notesTrashOverflows` (try/catch on `policy.add`) only used by a test script. | Delete with #1. | None |
| 3 | 14 | C6 | `kinds:['text','list','voice','link']` literal again (`notes-view.ts:10` `NOTES_KINDS`, upstream `NOTES_KINDS`). | Use one `NOTES_KINDS`. | None |
| 4 | 6 | A8 | "PLAN.md decision N2". | Cite PRD. | None |
| 5 | 26 | A7 | `NotesTrashPlan` type: 0 users. | Delete. | None |
| 6 | 7-9 | — | Constants mirrored in Java (retention, bytes) — keep values; they are product policy. | Keep. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `NOTES_TRASH_RETENTION_MS` / `MAX_BYTES` / `MAX_ENTRIES` | const | 7-9 | Java `AlphaNoteAudioPlugin`, `AlphaCredentialStore` | keep here |
| kinds literal | const | 14 | `notes-view.ts:10`, upstream | upstream `NOTES_KINDS` |
| `notesTrashDaysLabel`/`Short` | helper | 39-44 | — (Alpha copy) | keep |

## Proposed end state
~30 lines: constants, `notesTrashPolicy`, the three type aliases, the two copy helpers, `NOTES_TRASH_FULL_CODE`/`isNotesTrashFull` re-export.

## Verification
`scripts/test-notes-trash-flow.ts` (update to policy methods), Quint `contracts.mjs`, browser specs `notes-trash*`.
