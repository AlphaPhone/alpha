# apps/app/src/prototype/notes-share-adapter.ts
- Lines: 22 | Role: Share / Copy text / Email draft actions for the open note (one snapshot of the selected note) | Verdict: MERGE into the notes view owner (keep behaviour)
- Importers: `main.tsx:148` only.
  Text/path pins: `test/support/feature-parity.mjs:401` only. No Quint pin.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-8 | D2/C5 | One of ~11 `views.notes.render` wrappers (research P2/P11). | Merge into the notes view owner's render pipeline. | Order: must run after `notes-document-adapter` (reads `view.canExportText`/`view.exportText`, line 13) — keep that order. |
| 2 | 11 | C3 | `error instanceof DOMException&&error.name==='AbortError'` — `isAbortError` twin (`note-recorder.ts:81` and others). | Shared `isAbortError`. | None. |
| 3 | 12-13 | NEW (JSON identity) | Staleness by `JSON.stringify(selected())===identity`. | Same treatment as other JSON-identity checks (compare revision). | Low. |
| 4 | 13 | B1 | `catch{return false;}` inside `current()` — "selection gone" is the specified result. | Keep. | — |
| 5 | 16 | A5? | `view.shareSheet=false` overrides a prototype share sheet. Undo layer over `model.js` (A6). | Remove `shareSheet` from the model's notes render instead. | Low; check `subview-accessibility.ts` POPUPS reads `out.shareSheet`. |
| 6 | 4 | C1 | `type Bag`. | Shared types. | — |
| 7 | 3 | D13 | Deep `.eliza` relative import. | Alias. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `Bag` | type | 4 | 60× | shared types |
| `failure` | helper | 11 | toast-on-error helpers in several adapters | stays |

## Proposed end state
~15 lines inside the notes view owner (`share`, `copyText`, `shareMail`), same copy and order. Standalone file deleted.

## Verification
Playwright Notes share/copy/email-draft journeys, feature-parity test (inventory update).
