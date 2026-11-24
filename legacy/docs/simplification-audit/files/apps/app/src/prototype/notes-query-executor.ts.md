# apps/app/src/prototype/notes-query-executor.ts
- Lines: 82 | Role: executes the agent's native notes query (choose one local note, share it), plus a notes search executor and a name-targeted notes edit executor | Verdict: SIMPLIFY (delete two dead executors) — and DELETE entirely with legacy notes
- Importers: `agent-adapter.ts:35,1050` (`executeNotesQuery` only); `scripts/test-notes-query-flow.ts:7`.
  Text/path pins: `test/support/feature-parity.mjs:398`. No Quint manifest pin.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 25-62, 63-82 | A7 | `executeNotesSearch`, `executeNamedNotes`, `matchNotesContent`, `matchNotesName`, `ApplyExactNotes`, `ReviewResult`, `fold`, `instant` have **no caller** (whole-repo `git grep`: only this file; no hit in `scripts`, `test`, `specs`; upstream cannot import app code). The `notes_search`/`notes_named` operations are not dispatched anywhere in `apps/app/src`. | Delete lines 25-82 (~57 lines) and the now-unused imports (`resolveNamedTarget`, `NamedTargetOperation`, `NotesSearchOperation`, `NotesOperation`, `NotesResult`, `namedTargetValidators`, `validateForegroundReviewResult`, `ForegroundReviewResult`, `noteMatchesText`, `reviewNamedNote`, `reviewNoteTitles`). Then `notes-query-review.ts` `reviewNoteTitles`/`reviewNamedNote` become dead (cross-file). | Low. If the owner plans Home name-targeted notes edits, record it in DECISIONS.md instead. |
| 2 | 13-24 | A1 (P10) | `executeNotesQuery` is called only when `this.notesSourceMode==='legacy'` and `notesStore` exists (`agent-adapter.ts:1047`: "Select Previous notes to review this device-record request"). It is an Older-notes-only feature. | Delete the whole file with the P10 decision (plus `agent-adapter.ts:1046-1052`, `scripts/test-notes-query-flow.ts`, `notes-query-review.ts`). | Owner decision. |
| 3 | 14-15, 21-22 | B3 | `current();await store.assertCurrent();current();` and `stable();await store.assertCurrent();stable();` sandwiches repeated 3× (check-act-check). | One `checkpoint = async () => { stable(); await store.assertCurrent(); stable(); }`. | None. |
| 4 | 11 | C1 | `type Store=Pick<SecureNotesStore,…>` — fine, local. | Keep. | — |
| 5 | 1, 4-6 | D13 | Deep `.eliza/client-features/...` relative imports. | `@eliza/*` alias. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `Store` | type | 11 | none | stays |
| `fold` | helper | 25 | NFKC case folds elsewhere (`notes-view` search) | delete (#1) |
| `instant` | helper | 26 | note timestamp readers in `runtime/notes-view` | delete (#1) |
| `ReviewResult` | type | 37 | `NotesOrganizeReceipt` (`notes-organize-executor.ts:28`) | delete (#1) |

## Proposed end state
If Older notes stays: ~25 lines (`executeNotesQuery` only, one checkpoint helper). With the P10 decision: file deleted.

## Verification
`scripts/test-notes-query-flow.ts` (run through the scripts test lane), Playwright `test/browser/notes-query-review.spec.ts`, feature-parity test, `npm run verify` (typecheck catches dangling imports).
