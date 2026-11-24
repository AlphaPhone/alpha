# test/native-google-fetch-input.test.mjs
- Lines: 10 | Kind: unit of the upstream `createNativeGoogleCloudPort` through `test/support/managed-google-agent.mjs`, which re-declares Alpha's origin and User-Agent (a test-side copy of product config) | Verdict: MERGE case 1-2 header assertions into `test/integration/native-google-host.test.mjs`; DELETE the rest
- Covers: the native port sends the exact validated URL as a string with only Accept/Authorization/User-Agent(/Content-Type), `redirect:'error'`, unchanged body bytes; refuses off-origin URLs and wrong credential references; a retired owner after fetch is refused without retry. Duplicates: test 4 = `native-google-agent-host.test.mjs` test 3; `Authorization` and `redirect` are also asserted in every request of that file's fake. Callers/importers: `npm test` glob; `test/support/managed-google-agent.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2 | T9 | Self re-exec under `--conditions=eliza-source --import tsx`, with a Bun escape hatch nothing uses. | Drop with the merge. | Low |
| 2 | 3, 5 | C6, T5 | The port under test is the upstream one configured by `test/support` (origin, UA string duplicated from `scripts/native-google-product-host.ts`); a drift in the product file is not caught. | Assert the exact headers/URL through the product host's `request` spy instead. | Low |
| 3 | 9-10 | T5 | Retirement-after-fetch and wrong-reference refusal are upstream port rules. | Delete; upstream follow-up. | Low |
| 4 | 1-10 | D8 | Whole tests on single 400-character lines. | Gone with the merge. | None |

## Proposed end state
File deleted. One case in the native Google host integration asserts that a Gmail read and a send reach Cloud with the
exact URL string, Alpha's User-Agent, `redirect:'error'` and the exact JSON body.
