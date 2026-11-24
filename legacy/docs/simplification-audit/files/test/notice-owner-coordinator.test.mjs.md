# test/notice-owner-coordinator.test.mjs
- Lines: 13 | Kind: unit of upstream, run as a child process (`execFileSync(node --import=tsx -e <script>)` over `.eliza/client-features/packages/contracts/src/notice-routes.ts`) | Verdict: DELETE
- Covers: upstream `NoticeOwnerCoordinator` retries transient suspension and fences sign-out after failure, and a busy reconnect publishes no null owner. Duplicates: `test/notice-owner-startup.test.mjs` (uses the same coordinator with the controller), Quint `specs/quint/refinement/services/cache.mjs` references the coordinator. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3 | T5 | Tests code generated from `vendor/eliza` (`@elizaos/contracts`); upstream should own it. | Delete; list as upstream follow-up (D14). | Low |
| 2 | 3-12 | T9 | The real test is a 9-line string evaluated in a spawned `node` process, asserting the child printed `PASS`. | Gone with the file. | None |
| 3 | 3-11 | D8 | Entire test body is one string literal of minified statements. | Gone. | None |

## Proposed end state
Deleted. The product-visible consequence (a sign-out retires notices; a busy reconnect does not) belongs in `journeys/notifications.spec.ts` if any spec should carry it; the coordinator's own tests belong upstream.
