# test/browser/dev-workflow-dates.spec.ts
- Lines: 30 (8 KB) | Kind: Playwright, chromium; local workflow simulator dated sources + module-in-page tests of legacy `NotesStore`, `note-dates`, `workflow-dated-sources` | Verdict: DELETE
- Covers: simulator "Today's notes / Overnight inbox / This week's calendar…" date windows across DST; legacy Notes creation/edit timestamps and no-op edit receipts. Duplicates: canonical Notes date behaviour in `canonical-notes.spec.ts`. Callers: chromium only. Helpers: `helpers/legacy-notes.ts`, `app-navigation.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-17 | P7 | Five-source loop runs the dev executor over seeded `alpha.dev.app.inbox` and `alphaphone:notes:v2`. | Delete with the simulator. | Low. |
| 2 | 10, 19-26 | A1 | `alphaphone:notes:v2` and `runtime/notes-store.ts` `NotesStore` are the legacy Notes engine (A2/D1). Lines 22-26 construct `new NotesStore({getItem,setItem},…)` with an in-memory map: unit tests (T3). | Delete with the legacy engine. | Low: canonical Notes has its own date handling. |
| 3 | 18, 28-30 | T6 | `workflowDateRange`, `datedRows`, `readDatedWorkflowSource` called in-page with a fake `api`. | Delete. | None. |
| 4 | 18 | A1 | Title says "legacy notes keep unknown creation dates". | Gone. | None. |

## Proposed end state
Deleted with the simulator and the legacy Notes engine. If canonical Notes must prove "edits keep exact dates across reload", add that case to `journeys/notes.spec.ts`.
