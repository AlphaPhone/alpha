# test/alpha-client-sensitive.test.mjs
- Lines: 49 | Kind: integration-lite (real `AlphaClient`, in-memory transport) | Verdict: MERGE into `test/integration/alpha-client.test.mjs`
- Covers: a sensitive view (password vault) refuses agent turns and sends nothing; a thread-selection change retires an outstanding proposal without leaking the thread id. Duplicates: none found. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 18-30 | - | Privacy rule at the client boundary. | Keep. | Medium if dropped |
| 2 | 32-49 | - | Context revision bump and no thread id in the outgoing envelope. | Keep. | Medium |
| 3 | 9-16 | C3 | Second copy of the synthetic transport (see `alpha-client-consumed-approvals`). | One fixture in the merged file. | - |

## Proposed end state
Gone as a file; both cases live in `test/integration/alpha-client.test.mjs` beside the consumed-approval cases.
