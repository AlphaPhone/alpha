# test/browser/calendar-draft-readiness.ts
- Lines: 30 | Kind: Playwright helper module (3 exports) | Verdict: MERGE into the shared harness (`test/browser/harness/`): `guardCalendarFixture` → `harness/media.ts` (generic no-media guard), `calendarEditorReady` → `harness/calendar.ts`; DELETE `expectSavedCalendarDraft`
- Covers: (a) `guardCalendarFixture` stubs `AudioContext`, `getUserMedia` and `HTMLMediaElement.play` so a spec cannot capture or play media; (b) `calendarEditorReady` waits for the modal editor's Save to be enabled; (c) `expectSavedCalendarDraft` polls the assistant-draft store until it matches the visible form. Duplicates: the media guard pattern is re-written inline in several specs. Callers/importers: `guardCalendarFixture` 18 specs (only 4 are Calendar: edit-draft, form-draft, modal-draft, dev-calendar-*; the rest are workflow, Gmail, Files, Photos specs); `calendarEditorReady` 7 (modal-draft, storage-migration, transaction-cancel, dev-calendar-conversion/-cross-tab/-editor, review-visual-viewport); `expectSavedCalendarDraft` 3 (edit-draft, form-draft, modal-draft).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3-7 | D11 | `guardCalendarFixture` is not Calendar-specific; 14 of 18 importers are other areas. | Rename `guardNoMedia` and move to the harness (auto fixture option `media:'forbidden'`). | None |
| 2 | 12 | P2 | Walks React fiber internals (`__reactFiber$`, `stateNode.vget('calendar').form`) to read hidden form fields. | Delete; assert visible fields after reload instead. | Low |
| 3 | 24-29 | P2 | Reads `assistantDraftStore` and `calendarDocument` via in-page import and pins binding tuples (`['calendar-creation-form','app']`). | Delete; the journey proves retention by reloading and seeing the values. | Low: the "saved before reload" wait must become a visible "Saved" draft status or a poll on reload result. |
| 4 | — | — | Survival: after DELETEs in this chunk (modal-draft, storage-migration, transaction-cancel), `calendarEditorReady` keeps 4 dev-calendar importers + `review-visual-viewport`; `expectSavedCalendarDraft` keeps 0 once edit/form-draft merge without it. | See verdict. | None |

## Proposed end state
File removed. `harness/media.ts` exports the no-media guard as a fixture option; `harness/calendar.ts` exports `editorReady(dialog)` (one line) next to `openCalendar` / `chooseEventAction` from `helpers/browser-calendar.ts`. No fiber walking, no draft-store reads.
