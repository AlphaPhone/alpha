# apps/app/src/prototype/note-web-source-adapter.ts
- Lines: 28 | Role: "Web source" dialog on a note saved from a web page (open the reviewed page, remove the link) | Verdict: DELETE with legacy notes (owner decision); otherwise MERGE into the notes view owner on `openReview`
- Importers: `main.tsx:153` only.
  Text/path pins: `test/browser-reviewed-link-provenance.test.mjs:9` reads the text (T1); `specs/quint/refinement/application/note-web-source-dialog.mjs:8` transplants it (T2/T10); `specs/quint/application/manifest.json` pins `closeCurrent, installNoteWebSourceAdapter, openReviewedWebSource, openWebSource, saveImportedNote, visibility`; `test/quint-note-web-source-dialog.test.mjs`; `test/support/feature-parity.mjs:394`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4-28 | A1 (P10) | `webSource` is one of the `LOCAL_HANDLES` that `canonical-notes-ui.ts:19,83,96` deletes from agent records, so `out.hasWebSource` is false for canonical notes; the dialog is reachable only with "Older notes" selected. | Delete with the P10 decision (file, `main.tsx:153`, template trigger `template.html:2479`, Quint model + manifest + test). | Owner decision. |
| 2 | 13-25 | C4/P12 | Copy of the modal-review scaffolding (theme token copy line 14, `alpha-back` capture, `pagehide`, `visibilitychange`, focus return) that `openReview()` provides. | If kept: use `openReview`. | Quint model pins `visibility`, `closeCurrent`. |
| 3 | 12, 19 | NEW (JSON identity) | Staleness by `JSON.stringify(note)` equality (research P13 "session identity by JSON.stringify"). | Compare a revision field when the notes owner exposes one. | Low. |
| 4 | 22 | B1 | `catch{if(!closed)status.textContent='Unconfirmed';}` — specified outcome. | Keep. | — |
| 5 | 24 | D3 | Calls `api.saveImportedNote`, which `notes-document-adapter.ts:15` patches onto `api('notes')`; cross-adapter bus. | Notes owner exposes `saveNote(patch)` explicitly. | Low. |
| 6 | 2 | C1 | `type Bag`. | Shared types. | — |
| 7 | 5-27 | D8 | 200-400-char lines. | Format. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `Bag` | type | 2 | 60× | shared types |
| `button` | helper | 18 | `notes-query-review.ts:4`, `note-source-adapter.ts:60` | `prototype/dom.ts` |

## Proposed end state
Deleted (0 lines) with Older notes; or ~15 lines inside the notes view owner using `openReview`.

## Verification
`node --test test/browser-reviewed-link-provenance.test.mjs test/quint-note-web-source-dialog.test.mjs`, Quint manifest check, feature-parity test, Playwright reviewed-link journeys.
