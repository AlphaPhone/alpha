# specs/quint/refinement/services/inbox-list-paging.mjs
- Lines: 99 | Kind: Quint refinement harness (drives the injected Inbox list observer; 12 variant schedules + 2 cache-restore + invalidation) | Verdict: PORT (with `inbox-list-paging-ports.mjs`)
- Covers: Inbox list paging: stale reply after folder/account change, repeated cursor ends paging, failed page keeps the list, single flight, read-ahead join, saved list restore, against `InboxListPaging.qnt`. Duplicates: Playwright Inbox list specs cover visible paging but not stale-reply ordering. Callers: `services/index.mjs`, `test/quint-inbox-list-paging.test.mjs` (T4).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 30-34 | T10 | Depends on the text-transplanted implementation and asserts the generated IIFE equals a temp file ("Exact executable source after capture"). | After the product extraction, import `createInboxList` directly; delete the temp-dir, generated files and equality check. | Medium |
| 2 | 84-89 | B5 / T5 | "Negative oracle canaries": pushes a fake duplicate request to prove `assertPagingEffects` throws and mutates an observation to prove `deepEqual` fails. Tests the test. | Delete. | Low |
| 3 | 90-92 | — | Witness predicates over observed states (`SavedListShownWitness` etc.) are real reachability evidence. | Keep. | — |
| 4 | 93-98 | B5 | `coverage` object (`providerRequests`, `canaries`, named scenario list) consumed only by the aggregate. | Drop. | Low |
| 5 | 1-99 | D8 | Minified-style single-line statements. | Prettier pass. | Low |

## Proposed end state
~60 lines: build the extracted list controller with fake Gmail search port, run the same schedules and witnesses, `checkTraces`. Product needs an exported list/paging module with a `snapshot()` (see the ports report).
