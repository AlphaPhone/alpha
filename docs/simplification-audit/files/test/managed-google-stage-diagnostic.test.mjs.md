# test/managed-google-stage-diagnostic.test.mjs
- Lines: 22 | Kind: integration-ish (real native Cloud port + host + broker, fake fetch) | Verdict: MERGE 2 cases into `test/integration/managed-google-broker.test.mjs`
- Covers: the failing stage (signal/fetch/response-json/identity/accounts) is reported precisely without secret text. Duplicates: `managed-google-transport-code.test.mjs` uses the identical fixture. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 19 | B2 / T5 | Removes `AbortSignal.any` to test a capability fallback that cannot occur in the shipped runtimes. | Delete. | None |
| 2 | 20-21 | - | fetch / response-reader TypeErrors keep their stage; HTTP vs invalid account payload distinct. | Carry (one table). | Low |
| 3 | 22 | T4 | Logger-failure invariance, third copy. | Delete (kept once in merged file). | None |
| 4 | 1-17 | C4 / T9 | Copy of the transport-code fixture; tsx re-exec; minified one-liners (D8). | Shared helper in merged file. | None |

## Proposed end state
File deleted; two rows in the merged file's stage table.
