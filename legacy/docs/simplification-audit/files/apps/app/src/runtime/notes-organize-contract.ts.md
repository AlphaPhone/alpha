# apps/app/src/runtime/notes-organize-contract.ts
- Lines: 68 | Role: local fork of the agent Notes organisation contract (filter/move/folder create/restore/record). | Verdict: DELETE (use upstream `plugin-assistant/src/services/device-actions/notes-organize-contract.ts`)
- Importers: `prototype/agent-adapter.ts:37` (`isNotesOrganizeOperation`, `notesOrganizeContextAllowed`), `prototype/notes-organize-executor.ts:2` (type).
- Text/path pins: `test/notes-organize.test.mjs`, `feature-parity.mjs`. (`scripts/prepare-client-features.ts:300` projects the upstream twin.)

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-68 | A2 | Upstream projected copy (188 lines) has the same operation union, `only`/`text` helpers, `notesFolderName`, `validateNotesOrganizeOperation`, `describeNotesOrganizeOperation` with the same copy ("Show notes", "Move note", "To no folder", …) and `KIND_LABELS`. Only difference: `notesOrganizeContextAllowed(context, operation?: Pick<…,'type'>)` vs local `(context, type?)`. | Switch the two importers to upstream; change `agent-adapter.ts:1057` to `notesOrganizeContextAllowed(expectedContext,organize)`; delete this file and port `test/notes-organize.test.mjs` to the upstream signature. | Low |
| 2 | 21-22 | A7 | `NOTES_ORGANIZE_CAPABILITY`, `NOTES_ORGANIZE_TYPES` exported, 0 users. `validateNotesOrganizeOperation`, `describeNotesOrganizeOperation` test-only. | Moot after delete. | None |
| 3 | — | A4 | `phone-context.ts:146-148` never negotiates `notes.organize.v1`, yet `agent-adapter.ts:1055` still dispatches organise operations. | Owner: keep the dispatcher dormant (upstream contract) or delete the executor path. | Medium |
| 4 | 6 | A8 | "PLAN.md section 3" — no such file. | Moot. | None |
| 5 | 59 | C6 | kind label map duplicated with `notes-view.ts:31` `KIND_LABEL`. | Moot (upstream owns it). | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `NotesOrganizeOperation` | type | 14-19 | upstream same name | upstream |
| `only`, `text`, `quoted` | helper | 26-27, 56 | upstream same names | upstream |
| kind→label map | const | 59 | `notes-view.ts:31`, upstream `KIND_LABELS` | upstream |

## Proposed end state
Deleted; importers use the upstream contract.

## Verification
`test/notes-organize.test.mjs` (port), notes organise executor flows, `npm run verify`.
