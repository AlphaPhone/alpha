# test/browser/selected-content-readiness.spec.ts
- Lines: 57 | Kind: Playwright journey (`chromium`), files seeded via `registerPlugin('AlphaFiles').importFile`, `BrowserFiles.prototype.readSelected` patched to hold the excerpt (T6); 3 tests | Verdict: **MERGE** into `journeys/files.spec.ts` ("ask about a file" section)
- Covers: a selected text file offers Ask Alpha only after its readable excerpt arrives. An unsupported binary shows "Open or download this file." with no Ask. A selected image offers local text extraction and an image preview in the review. Duplicates: `selected-content-question.spec.ts` (text Ask review). Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 20-24 | T6 | It overwrites `BrowserFiles.prototype.readSelected`, a product class, to hold the read. | Hold the read at the files plugin boundary (`harness/plugins/files.ts` `holdRead()`), or drop the hold and assert only "Ask appears with the excerpt". | Low |
| 2 | 18-19, 37-38, 48-50 | T6 / C3 | The same `registerPlugin('AlphaFiles').importFile` seeding is repeated 3 times, and in `selected-content-question`, `selected-document-accessibility` and `responsive-surfaces`. | `harness/plugins/files.ts` `importFile(page, file)`. | none |
| 3 | 3-10 | – | `openStoredFile` navigates Files → Internal storage → Open name through the UI. | Move to `harness/nav.ts` and reuse. | none |

## Proposed end state
Three short steps in the files journey's "ask about a file" section, through the UI: a text file offers Ask after the
excerpt arrives, an unsupported file has no Ask, and an image offers Extract text locally. It uses the shared
`importFile` and `openStoredFile`.
