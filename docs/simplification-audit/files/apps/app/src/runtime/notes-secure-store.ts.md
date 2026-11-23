# apps/app/src/runtime/notes-secure-store.ts
- Lines: 30 | Role: binds the shared encrypted Notes store and unsaved-draft slot to Alpha's slot names; legacy localStorage migration sources. | Verdict: SIMPLIFY
- Importers: 7 — `prototype/agent-adapter.ts:66`, `prototype/legacy-notes-access.ts:4-5`, `prototype/notes-query-executor.ts:7`, `runtime/browser-notes-document.ts:7`, `note-audio-deletions.ts:6`, `notes-store.ts:13`(type), `notes-trash.ts:4`.
- Text/path pins: `specs/quint/refinement/application/notes-coordinator.mjs:16` (`export * from` this path), `specs/quint/application/manifest.json`, `test/native-secure-slots.test.mjs` (reads text), `test/notes-owner-retirement.test.mjs`, `feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 12-16 | A1 | `LEGACY_NOTES_SOURCE_KEYS=[config.legacy,config.current,config.daily]` ("The localStorage keys an empty secure slot migrates from on open") and `readLegacyDailyNotes`; feed the "previous notes" source (`prototype/legacy-notes-access.ts`, `agent-adapter.ts`). | Owner decision (PRD: new package starts empty). If approved: delete these, the `legacy` argument of `open`, `legacy-notes-access.ts`, and the `legacy-app-notes-source` context kind. | High impact; owner |
| 2 | 12 | C6/D10 | `'alphaphone:daily:v1'` literal; also declared in `product/alpha-product-registration.ts` `storage.retained`. | Read from the registration or drop with #1. | Low |
| 3 | 5, 8 | A7 | re-exports with no external user: `NotesOpenStage`, `mergeNotesDrafts`, `notesDraftChanges` (0 src, 0 tests). | Remove those names. | None |
| 4 | 24-29 | D8 | `createNotesDraftSlot(vault,SECURE_NOTES_DRAFT_SLOT)` built three times. | `const draft=(vault)=>createNotesDraftSlot(vault,SECURE_NOTES_DRAFT_SLOT)`. | None |
| 5 | — | C3 | Natural home for `readSavedNotesRaw()` (twins `notes-trash.ts:50`, `note-audio-deletions.ts:30`). | Add here. | Low |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `SECURE_NOTES_SLOT` `'notes-records:v1:device'` | const | 9 | Java slot list | notes bindings |
| `SECURE_NOTES_DRAFT_SLOT` | const | 11 | Java | notes bindings |
| `LegacyStorage` | type | 15 | `Storage` DOM type | delete with #1 |

## Proposed end state
~15 lines: slot constants, `SecureNotesStore.open(vault,initial,onStage)` without legacy sources, draft helpers, `readSavedNotesRaw`. Merge with `notes-store.ts` into one notes bindings module.

## Verification
`test/native-secure-slots.test.mjs`, `test/notes-owner-retirement.test.mjs`, `notes-coordinator` refinement, canonical-notes browser specs; Android update-retention check for `notes-records:v1:device`.
