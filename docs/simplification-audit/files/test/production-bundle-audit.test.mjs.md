# test/production-bundle-audit.test.mjs
- Lines: 131 | Kind: tooling integration (real `scripts/audit-production-bundle.ts` API and CLI over temp bundle directories) | Verdict: KEEP trimmed (move to `test/tooling/production-bundle-audit.test.mjs`)
- Covers: the release gate AGENTS.md names: a production bundle fails on any denylist marker, fixture images, source maps, a missing or contradictory `build-flags.json`; a recorded test-mocks bundle is exempt only when expected. Duplicates: none (`npm run audit:bundle` runs the real build). Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 22-28 | T1 | Test 1 asserts six literals are in the exported `DENYLIST` constant (the comment admits it exists to catch an entry being removed). | Delete. | Low |
| 2 | 23, 30-38 | A3 | `SIMULATION_MARKERS` includes Wallet markers (`4000 1234 5678 9017`, `Card scanned`, `Simulated payment`) for a deleted feature (D2) and repeats test 1's constant check. | Keep the "hidden fixture strings still fail" case with two neutral markers; drop the constant membership loop. Whether the Wallet strings stay in `DENYLIST` is a scripts-chunk call (cheap insurance). | Low |
| 3 | 49-61 | keep | Every denylist entry fails a bundle (one temp dir per entry; ~100 dirs). | Keep; build one bundle with all entries in separate files to cut fs churn. | Low |
| 4 | 63-100 | keep | Images/source maps, test-mocks exemption both ways, missing flags record, CLI exit codes 0/1/2. | Keep. | Low |
| 5 | 102-131 | T4 | Leaked dev password provider / gateway and legacy key-dialog copy are already individual denylist entries covered by #3. | Delete or keep one CLI stderr check. | Low |

## Proposed end state
About six cases: clean pass (API+CLI), every entry denied, image/sourcemap denied, test-mocks exemption only when
recorded and expected, missing record fails, usage errors exit 2. Lives under `test/tooling/`.
