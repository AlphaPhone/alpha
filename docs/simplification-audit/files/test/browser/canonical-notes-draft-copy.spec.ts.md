# test/browser/canonical-notes-draft-copy.spec.ts
- Lines: 39 | Kind: Playwright, `chromium` project, UI journey with in-page clipboard stub | Verdict: **MERGE** into `journeys/notes.spec.ts`
- Covers: when a canonical save fails, the editor offers Copy draft and Discard; Copy draft reports clipboard refusal, then succeeds, copying "title\n\nbody", while the editor text stays and the saved record and POST count do not change. Duplicates: the failed-save part overlaps `canonical-notes.spec.ts:209` ("canonical failed save retains the owner draft…"); Copy draft is only here. Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4-39 | T4, T7 | Same setup as the failed-save test in `canonical-notes.spec.ts`. | Merge the two into one "failed save keeps the draft" test: Unsaved state, Copy draft (refused, then copied), Discard returns committed text, no extra POST. | Low. |
| 2 | 9-15 | none | Clipboard stub via `Object.defineProperty(navigator,'clipboard')` is a browser-API boundary, acceptable. Could use `context.grantPermissions(['clipboard-write'])` for the success half. | Keep a stub only for the refusal case; put it in `harness/` as `clipboard({refuse})`. | Low. |

## Proposed end state
One merged failed-save test in the notes journey covering Unsaved, Copy draft refusal and success with exact text,
Discard, and unchanged server state. Delete this file.
