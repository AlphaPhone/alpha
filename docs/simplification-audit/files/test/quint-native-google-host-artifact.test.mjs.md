# test/quint-native-google-host-artifact.test.mjs
- Lines: 31 | Kind: Quint wrapper (services index) + an env-gated tooling check of the pinned Bun loader (`checkNativeGoogleHostLoaderCompatibility`) | Verdict: DELETE case 1; MERGE case 2 into `test/tooling/agent-build.test.mjs`
- Covers: the native Google host candidate binds emitted and compiled bytes and keeps the previous pair (18 traces); pinned Bun 1.4.2 keeps loader semantics over 13 graph inputs. Duplicates: services index runs case 1. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-21 | T4, T5 | Aggregate duplicate; lines 11-20 inspect model `expect` values. | Delete. | None |
| 2 | 23-31 | T9 | Skips unless `ALPHA_QUINT_BUN` is set; only `browser.yml:73` sets it, so it never runs locally. | Keep as a tooling check of the agent build; say in one place which CI lane provides Bun. | Low |
| 3 | 29 | B5 | Pins `graphInputsChecked === 13`. | Drop. | None |

## Proposed end state
Case 2 lives with the other agent-build tooling tests; this file is deleted.
