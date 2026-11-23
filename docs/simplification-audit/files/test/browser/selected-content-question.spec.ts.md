# test/browser/selected-content-question.spec.ts
- Lines: 10 | Kind: Playwright journey (`chromium`), file seeded by `registerPlugin('AlphaFiles').importFile` in the page, `alphaClient.send` monkeypatched to count sends (T6); 2 tests (light/dark) | Verdict: **MERGE** into `journeys/files.spec.ts` ("ask about a file" section)
- Covers: Files → open a text file → Ask Alpha shows "Ask about selected content" with the full excerpt. Cancel keeps the file open. An edited excerpt and question become the composer text "question / Source: name / excerpt", and nothing is sent until the owner sends. Duplicates: `selected-content-readiness.spec.ts` (same review dialog). Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4 | T6 | It imports `/src/platform-plugins.ts` to import a file, and replaces `alphaClient.send`, a product singleton, to count sends. | Import through the Files UI picker (`harness/plugins/files.ts`). Prove "no send" by asserting that the resident agent plugin received no turn (`agent.posts` is empty). | Low |
| 2 | 2 | T7 | The theme loop adds no assertion that depends on theme. | One theme. | none |

## Proposed end state
One step in `journeys/files.spec.ts`: open a text file, Ask Alpha, Cancel, Ask again, edit the excerpt and question, Use
in conversation. The composer holds the composed text, and the agent received nothing.
