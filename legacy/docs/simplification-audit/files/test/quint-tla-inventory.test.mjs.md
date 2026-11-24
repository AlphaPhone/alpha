# test/quint-tla-inventory.test.mjs
- Lines: 113 | Kind: tooling (legacy formal-source inventory, `prepare-quint-history.ts`) | Verdict: DELETE (with `specs/quint/legacy` and `quint:prepare-history`, P6)
- Covers: Upstream TLA+ inputs are hash-authenticated and registered; history preparation fetches historical revisions shallowly without moving `vendor/eliza` HEAD; historical sources cannot hide new or changed specs. Duplicates: none Callers/importers: npm test (`scripts/run-node-tests.ts` glob `test/*.test.mjs`), so `npm run verify` and the `browser.yml` verify job.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 16-45 | P6 | Checks the inventory of 16 upstream Core TLA+ conversions and legacy view-refresh designs: historical evidence only. | Delete with `specs/quint/legacy`. | Low |
| 2 | 47-89 | P6/prereq | Also covers the MMS historical inventory that live `refinement/native/{mms,sms}-dispatch.mjs` use (`mms-historical-sources.json`). | Prerequisite: decide the MMS counterexample witnesses (ci-and-formal §6) before deleting `prepare-quint-history.ts`. If they stay, keep test 2 in `test/tooling/upstream-sources.test.ts`. | Medium |
| 3 | 41-42 | T1 | Regex over model text for `action <init>`. | – | Low |

## Proposed end state
- Gone with the legacy family and the per-verify network fetch.
