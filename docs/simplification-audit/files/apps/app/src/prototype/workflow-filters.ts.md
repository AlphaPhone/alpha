# apps/app/src/prototype/workflow-filters.ts
- Lines: 39 | Role: Workflows filter sheet (type and status radio groups, refresh, Done) as an imperative `<dialog>`, plus `workflowFilterLabel`. | Verdict: SIMPLIFY (small)
- Importers: 1 — `apps/app/src/prototype/automations-adapter.ts:5` (`openWorkflowFilters`, `workflowFilterLabel`, types).
- Text/path pins: `test/automations-unified.test.mjs:71` (lists this path with export names `openWorkflowFilters`, `workflowFilterLabel` for its transplant), `test/fixtures/scheduled-task-controls.mjs:27` (stubs the module by path), `test/support/feature-parity.mjs:440`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-6 | A7 | `export const WORKFLOW_TYPES`, `export const WORKFLOW_STATUSES` — no importer outside this file (`git grep` apps/test/specs/scripts). | Unexport. | None. |
| 2 | 3-6, `automations-adapter.ts:32-34` | C6 | Labels exist twice: here (`['reminders','Reminders']…`, `['all','All']`) and `automations-adapter.ts:34` `filterNames={all:'All',reminders:'Reminders',prompts:'Prompts',workflows:'Workflows',schedules:'Schedules',active:'Active',inactive:'Inactive'}`; the `Filter` type there unions the same ids. | Export one `WORKFLOW_FILTER_LABELS` record + the two id unions from this file; automations-adapter imports them. (`'All types'` vs `'All'` for the type group is intentional copy — keep both strings.) | Low. |
| 3 | 13-17, 35-37 | C4 | Imperative dialog lifecycle (`previous` focus, `alpha-back` capture, `pagehide`, `visibilitychange`, `resize`, `oncancel`, `onclose`, backdrop click, `holdPhoneInert`) duplicated across ~40 modules (twin: `video-edit-review.ts:8,64-65,74`). | Use the shared `openOwnedDialog` helper proposed in `video-edit-review.ts.md` #1. | Medium (shared). |
| 4 | 14 | C3 | Copies phone theme tokens onto the dialog (`for(const key of ['bg','fg','mut','line','s2','acc','acct'])dialog.style.setProperty(...)`) because the dialog is appended to `document.body` outside `.os`. | Append inside `.os` (as `video-edit-review.ts:74` does) or put the tokens on `:root`; delete the copy loop. | Low (visual check). |
| 5 | 19 | C3 | `glyph(name)` builds a `data-alpha-icon` span with `iconStyle`; similar icon-span builders in `media-review-controls.ts:2-6` (`mediaToolIcon`), `browser/browser-surface.ts:27`, `browser/calendar-editor.ts:12`. | One `iconSpan(name)` in `icon-style.ts`. | Low. |
| 6 | 24-30 | KEEP | Radio-group roving tabindex and arrow-key handling are accessibility behaviour. | Keep. | — |
| 7 | 33 | D9 | `refresh.onclick=()=>{if(!input.current()){close();return;}close();input.refresh();}` — both arms call `close()`. | `close(); if(input.current()) input.refresh();` | None. |
| 8 | 37 | B1 | `try{…dialog.showModal();…}catch(error){close();throw error;}` — cleanup then rethrow; correct. | Keep. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `WorkflowTypeFilter`, `WorkflowStatusFilter` | type | 3-4 | `automations-adapter.ts:32-34` `Filter`/`filters` | this file (exported) |
| `WORKFLOW_TYPES`, `WORKFLOW_STATUSES` | const | 5-6 | `automations-adapter.ts:34` `filterNames` | this file, one labels record |
| `glyph` | helper | 19 | `mediaToolIcon`, `browser-surface.ts:27`, `calendar-editor.ts:12` | `icon-style.ts` |
| `button` | helper | 20 | `video-edit-review.ts:17` | shared DOM helper |
| `close`/`back`/`visibility`/`position` | helper | 16-18 | ~40 dialog modules | `openOwnedDialog` |

## Proposed end state
~32 lines: shared dialog lifecycle and icon helper, one labels record used by automations-adapter too, no theme-token copy. Behaviour, copy and ARIA unchanged. Est. lines after: 32.

## Verification
Playwright workflow list specs that open filters (`workflow-dialog-layout.spec.ts`, automations journeys); `test/automations-unified.test.mjs` (T2; update its export list or delete per D10).
