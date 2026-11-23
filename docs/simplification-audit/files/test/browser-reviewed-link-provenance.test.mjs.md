# test/browser-reviewed-link-provenance.test.mjs
- Lines: 34 | Kind: transplant (T2; whole `prototype/note-web-source-adapter.ts` with imports regex-removed, plus one line of `agent-adapter.ts` starting `'    api.openReviewedWebSource='`, run with a fake DOM) | Verdict: DELETE; carry one case to `test/browser/journeys/notes.spec.ts`
- Covers: a note's saved web source opens in Browser only after one explicit tap on the review dialog's Open button, once; a retired selection blocks it. Duplicates: `specs/quint/refinement/application/note-web-source-dialog.mjs` (Quint replay of the same dialog); Playwright `web-summary-note.spec.ts`, `journey-j05-web-research-note.spec.ts` (web source notes). Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-13 | T2, T10 | Takes exactly one source line (`indexOf('\n',start)`) of `agent-adapter.ts`; Prettier would split it and break the test. | Delete. | none |
| 2 | 15-17 | T3 | Fake `Element`/`document` and `children[0].children.at(-1).children[0]` positional DOM walk. | Delete. | none |

## Proposed end state
Delete. Journey case: open a note with a saved web source, tap "Source", nothing navigates; tap Open in the dialog, Browser opens the exact URL once; a second tap does nothing.
