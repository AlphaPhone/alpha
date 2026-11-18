# test/power-launch-state.test.mjs
- Lines: 20 | Kind: unit (pure function `protectedPowerLaunchState` from `apps/app/src/runtime/power-launch-state.ts`) | Verdict: MERGE into `test/integration/resident-runtime.test.ts`
- Covers: the renderer reports to native whether a Power launch may wait for the initial restore and which canonical Cloud account (env, user, org) constrains it. Duplicates: none (`git grep protectedPowerLaunchState` finds only `main.tsx`, the module and this test). Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-20 | T3 | Three table-driven cases of a pure function. It is the only check that staging/unverified accounts never produce an `accountRef` (security-relevant for D7 Power invocation). | Fold the three cases into the resident integration file; keep the refusal matrix. | Low |

## Proposed end state
File deleted; its three cases live in `test/integration/resident-runtime.test.ts` next to the other Power/resident checks.
