# test/browser/document-excerpt-sensitive.spec.ts
- Lines: 23 | Kind: Playwright, chromium. A user journey (Files → open → Ask Alpha → review), seeded through `registerPlugin('AlphaFiles').importFile` in the page (P2, s1/r10) | Verdict: **MERGE into `journeys/files.spec.ts`**
- Covers: a selected document's excerpt that contains a verification code is refused with "Remove secrets first", the review stays open, and only the edited excerpt reaches the draft. Duplicates: the same credential screen is tested for page excerpts in `web-summary-note.spec.ts` and `context-selection.spec.ts`, and for notification questions in `workflow-notice-taps.spec.ts`. Callers: the chromium project.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7 | P2 | The file is seeded by importing `platform-plugins.ts` in the page and calling `importFile`. | Seed through the harness's Files fixture (`seed.files([...])`) at the bridge. | none |
| 2 | 4-22 | T4 | The secret screen is shared code, tested from three entry points. The document entry is the only one that also proves "Source: errands.txt" framing. | Keep one test here. Make sure `context-selection` keeps only the screen rules, not the entry. | none |

## Proposed end state
One test, "an excerpt with a verification code is refused until edited", inside the "Ask Alpha about a file" block of
`journeys/files.spec.ts`. It uses the harness file seed and has no `/src` import.
