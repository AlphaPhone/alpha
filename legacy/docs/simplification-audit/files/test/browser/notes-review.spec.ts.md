# test/browser/notes-review.spec.ts
- Lines: 59 | Kind: Playwright spec, chromium, 5 tests (2-theme loop + 3); route-fulfilled blank page imports `/src/prototype/notes-query-review.ts` and calls its functions directly | Verdict: REWRITE as a chat-driven step in `journeys/notes.spec.ts` (or DELETE if the executor is legacy-only; owner question)
- Covers: local review dialogs shown when Alpha asks to share a note, delete/update a note by name, or share titles: disambiguation, preselection, exact preview, no record ids shown, phone held inert, focus returned, Escape/Back cancel, `showModal` failure cleanup. Duplicates: `notes-named-review.spec.ts` and `notes-query-review.spec.ts` (transplant copies). Callers/importers: none. Product callers: `notes-query-executor.ts` is called from `agent-adapter.ts:1050` with `this.notesStore`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-13 | T6 | Fulfils a fake page with `phone.css` read from disk and imports the module; no app, no user path to the dialog. | Drive it from chat: the agent fixture proposes `notes_named`/`notes_query`; the journey answers in the dialog. | Medium: depends on whether `agent-adapter`'s `notesStore` is the canonical or the legacy store |
| 2 | 23 | B2/T6 | Replaces `HTMLDialogElement.prototype.showModal` with a throwing stub. | Drop; showModal does not fail in supported engines. | None |
| 3 | 19 | ok | Layout checks (scroll, footer in viewport, 44 px targets). | Keep via shared target-size helper. | None |

## Proposed end state
One "Alpha asks about a note" step in `journeys/notes.spec.ts`: a named delete with two matches is disambiguated in the review dialog, confirm returns focus; titles share needs explicit approval. If the executor works only on legacy Notes, delete this file with it.
