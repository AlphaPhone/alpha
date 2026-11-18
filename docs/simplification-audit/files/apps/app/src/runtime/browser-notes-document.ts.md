# apps/app/src/runtime/browser-notes-document.ts
- Lines: 68 | Role: browser (dev/web) Notes document port over `browserDocuments` with an exact archive of three legacy localStorage Notes keys, Web Locks initialisation and recovery capture/reset | Verdict: SIMPLIFY (drop the legacy archive) — owner sign-off; then MOVE to `browser/`
- Importers: prototype/agent-adapter.ts (`browserNotesPort`, `browserNotesRecovery`), runtime/note-audio-deletions.ts and runtime/notes-trash.ts (dynamic import, `readBrowserNotesRaw`). Text/path pins: `scripts/test-notes-documents-browser.ts:24`; `specs/quint/legacy/notes-view/check-notes-view-refinement.mjs:41`; ~45 Playwright specs import it in-page, incl. `test/browser/legacy-notes-access.spec.ts`, `helpers/legacy-notes.ts`, `note-audio-legacy-restore.spec.ts`, `notes-document-storage.spec.ts`, `canonical-notes.spec.ts`, `dev-workflow-*.spec.ts`; feature-parity inventory.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11-14, 20-28, 35, 45, 50, 55-65 | A1 | `legacy()` reads `alphaphone:prototype:notes:v1`, `NOTES_KEY` and `alphaphone:daily:v1` on every read/write; `assertLegacy` throws "Older Notes changed. Close older tabs…" if they move; `openBrowserNotes` imports `readLegacyDailyNotes`. The package starts with empty data; these keys only exist in old browser profiles. | Stop reading legacy keys: write `archive:{v1:null,v2:null,daily:null}` on create/reset (keeps the persisted envelope `{version:1,archive,currentRaw}` shape), delete `legacy`, `sameLegacy`, `assertLegacy`, `dailyKey`, the `LEGACY_NOTES_KEY`/`readLegacyDailyNotes` imports and the `legacyChanged`/`legacy` fields of recovery. Delete the legacy-notes specs and `prototype/legacy-notes-access.ts` "previous notes" UI in the same change. | Medium: owner must accept that old browser profiles lose the archive (README: no migration). |
| 2 | 1 | D7 | `export {DocumentNotesStore}` re-export used only by Playwright (`note-audio-delete-recovery.spec.ts`). | Delete; spec imports upstream. | None. |
| 3 | 50 | D7 | `openBrowserNotes` has no app importer (production opens via `openExistingBrowserNotes(browserNotesPort, …)` in agent-adapter); 16 test/spec importers. | Delete with the tests that need it, or move to a test helper. | Low. |
| 4 | 10 | A7 | `browserNotesKey` exported, 0 external importers. | Unexport (value `alpha.browser.notes.v1` unchanged). | None. |
| 5 | 32 | B2 | `if(!navigator.locks?.request)throw` — Web Locks exist in every supported browser/WebView. | Drop the guard. | None. |
| 6 | 33 | C6 | Lock name `JSON.stringify(['browser-document','alpha.browser.documents.v1',key])` duplicates the naming used inside `browser/documents.ts`. | Ask `browserDocuments` for a `withLock(key, fn)` instead of rebuilding its lock name. | Low. |
| 7 | 17 | D8/B3 | 300-char `decode` validator. | Format; keep (storage boundary). | None. |
| 8 | path | D11 | Browser-only module in `runtime/`. | Move to `browser/notes-document.ts`. | Low (many spec paths). |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `Archive`, `Envelope` | type | 12-13 | none | keep (shape persisted) |
| `legacy`, `sameLegacy`, `assertLegacy` | helper | 14-26 | prototype/legacy-notes-access.ts, notes-secure-store.ts `readLegacyDailyNotes` | delete |
| `decode`, `receipt` | helper | 15-27 | none | keep |

## Proposed end state
~35 lines in `browser/notes-document.ts`: `decode`, `receipt`, `browserNotesPort` (initialize/read/compareExchange) and recovery capture/reset without legacy comparison; envelope format unchanged.

## Verification
`test/browser/notes-document-storage.spec.ts`, `canonical-notes.spec.ts`, `notes-trash*.spec.ts`, `note-audio-delete-recovery.spec.ts`, `scripts/test-notes-documents-browser.ts`; delete `legacy-notes-access.spec.ts`, `note-audio-legacy-restore.spec.ts`, `helpers/legacy-notes.ts` and the legacy quint notes-view check.
