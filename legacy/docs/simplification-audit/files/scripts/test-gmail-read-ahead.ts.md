# scripts/test-gmail-read-ahead.ts
- Lines: 26 | Kind: unit (`GmailReadAhead` class and `gmail-account-selection.ts` with a Map storage port) | Verdict: MERGE two cases into the inbox integration file (`test/integration/inbox-provider.test.ts`); delete the rest
- Covers: one speculative page per cursor, in-flight join, single consumption, owner-key isolation, invalidation aborts, TTL without timers, failure not replayed, pause keeps a completed page; saved Gmail account choice isolated by environment/user/organization. Duplicates: read-ahead join and bounded prefetch are asserted through the real adapter in `test-inbox-cloud-flow.ts:133-141`; saved choice in `test-inbox-attention-flow.ts:299-323`; Home warm read in `test/browser/home-inbox.spec.ts`. Callers: `test/gmail-read-ahead.test.mjs` (child-suite shim).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-20 | T3/T4 | Most cases restate behaviour already seen through the adapter. Unique and privacy-relevant: a page prepared for owner A cannot be taken under owner B (:12-13); invalidate aborts the speculative request (:15). | Carry these two into the inbox integration file; delete the rest. | L |
| 2 | 22-24 | T3 | Account-choice isolation by owner triple; the owner-change part is the only rule worth keeping, and `home-inbox.spec.ts` "retires cached subjects on owner change" covers the visible effect. | Delete. | L |
| 3 | 1,3 | — | Extension-less imports (`gmail-account-selection`) unlike the rest of `scripts/`. | Gone with the file. | — |
| 4 | — | T9 | Shim `test/gmail-read-ahead.test.mjs` spawns it. | Delete shim. | L |

## Proposed end state
File and shim deleted. Two cases (owner-key isolation, invalidation abort) live in `test/integration/inbox-provider.test.ts`. `test/support/feature-parity.mjs` row removed with D15.
