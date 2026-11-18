# scripts/ci/upstream-reachability.json
- Lines: 26 | Kind: data (recorded GitHub compare of `develop...<pin>`) | Verdict: KEEP (consider moving next to `upstream.lock.json`)
- Covers: offline record that the pinned `vendor/eliza` commit is reachable from upstream `develop`, judged by `assessDevelopReachability` in `scripts/pinned-upstream-source.ts:32-90`. Written by `scripts/verify-upstream.ts --record-reachability` (lines 19-41). Readers: `scripts/pinned-upstream-source.ts` (`REACHABILITY_RECORD`), `test/upstream-reachability.test.mjs` (stale check). `head` equals current `upstream.lock.json` commit (8876e369…), so it is current.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5,8,14-25 | B5 / A7 | `baseCommit`, `command` and `pullRequests` are written but never read (the reader's interface lists `pullRequests` as `unknown[]` only). | Drop the unread fields from the writer and the file, or keep `pullRequests` only if humans use it (owner). | Low |
| 2 | path | D11 | It is pin metadata, not a CI script, yet lives in `scripts/ci/`. | Optional: move to repo root beside `upstream.lock.json` (one constant in `pinned-upstream-source.ts`). | Low |

## Proposed end state
Same record, minus unread fields, regenerated on every pin advance by `verify-upstream.ts --record-reachability`.
