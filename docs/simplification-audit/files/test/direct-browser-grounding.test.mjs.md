# test/direct-browser-grounding.test.mjs
- Lines: 77 | Kind: unit-to-integration (real `DeviceActions` bundled by `test/fixtures/device-action-policy.mjs` via `browser-source.mjs`; `approve` stubbed to record calls) | Verdict: MERGE into `test/integration/device-actions.test.mjs`
- Covers: an agent `browser_navigate` proposal auto-dispatches only when the current authored message names exactly that destination (host, path, query, fragment), never for negations, quotes, multiple targets, credentials, http, foreign/retired proofs, workflows, ask-first, cancellation or duplicates, and at most once. Duplicates: none for the URL grammar; other `device-action-policy` users cover non-browser proposals. Callers/importers: `npm test`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-24, 69-77 | - | Security-relevant grammar (a page or agent cannot make the phone open a URL the owner did not type). Real module; table-driven already. | Carry the two tables and the punctuation/multiline cases. | - |
| 2 | 60-66 | T3 | Reaches into `actions.browserAttempts` (internal map) to seed 128 entries and assert its size. Tests an eviction detail. | Keep one behavioural assertion (live proofs are not evicted), drop size checks. | Low. |
| 3 | 59 | T3 | Mutates `proposals.get(...).requestKey` directly to simulate A->B->A. | Express through two real requests in the merged fixture. | Low. |
| 4 | 4 | - | Fixture `device-action-policy.mjs` survives (6 importers; target integration file uses it). | Keep fixture. | - |

## Proposed end state
A "browser navigation grounding" block in `test/integration/device-actions.test.mjs`: the reject table, the accept table,
query/fragment exactness, the bypass list, once-only under concurrency.
