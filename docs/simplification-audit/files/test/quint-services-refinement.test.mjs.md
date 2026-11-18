# test/quint-services-refinement.test.mjs
- Lines: 49 | Kind: Quint aggregate (all services campaigns) | Verdict: DELETE (T4)
- Covers: Runs every services refinement campaign in a child process and checks the receipt set equals the services manifest models. Duplicates: Every campaign it runs also has its own `test/quint-*.test.mjs` wrapper (about 36 per research) or forward-replay wrapper. Callers/importers: npm test (`scripts/run-node-tests.ts` glob `test/*.test.mjs`), so `npm run verify` and the `browser.yml` verify job; `specs/quint/refinement/services/README.md:41`..

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11 | P1/cost | 2400 s budget; comment says the campaign ran past 880 s. | Delete; per-model rows in the runner run each campaign once and in parallel. | Low |
| 2 | 16-32 | T9 | `node --import=tsx -e` inline program with fd-3 result channel and log tail reader. | – | Low |
| 3 | 40-44 | carry | Two useful checks: every services manifest model produced a receipt, and the known duplicate models (`GoogleAccounts`, `IdentitySession`, `InboxCoordinator`). | The manifest-driven runner gets "every model has a row" by construction. Resolve the three duplicate-model campaigns in the manifest instead of pinning them. | Low |

## Proposed end state
- Deleted. Coverage completeness comes from the runner reading the manifest.
