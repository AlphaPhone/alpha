# specs/quint/refinement/services/plan-admission-grace.mjs
- Lines: 107 | Kind: Quint refinement driver over a **sliced** `connection-ui.tsx` plus the bundled shared `cloud-resident-binding.ts` and `subscription-entitlement.ts`, run in a `vm` context | Verdict: PORT
- Covers: `PlanAdmissionGrace` (live, `manifest.json:3371`): Cloud resident plan admission and offline/billing-outage grace bound to the credential, past plan end gives no grace, other-account record ignored, rejected sign-in forgets grace, redeemed end precedence, held plan read after credential replacement refused. Duplicates: none. Callers: `services/index.mjs:5,73`; `test/quint-plan-admission-grace.test.mjs` (pins `traces===30`, 9 fields, 8 scenarios, 6 witnesses, 2 canaries).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7, 31 | T10 / T2 | Executes a transplant built by `plan-admission-ports.mjs` from text slices of `apps/app/src/runtime/connection-ui.tsx` (see that report). | PORT: extract the plan-admission functions from `connection-ui.tsx` into `runtime/plan-admission.ts` with explicit dependencies (stage F split of `connection-ui.tsx`), then import it. | High: any edit to `connection-ui.tsx` comments breaks it today |
| 2 | 95-98 | B5 | Self-test canaries: alters an observation and asserts `deepEqual` throws; pushes a past-end write and asserts the guard throws. They test the harness, not the product. | Delete; drop `coverage.canaries` and the test's `canaries.length===2` pin. | Low |
| 3 | 86-94 | — | Witness reachability assertions over real observations: useful (proves the bounded walks reach the interesting states). | Keep. | — |
| 4 | 21-26 | — | `assertAdmissionEffects` is exported but only used here (grep: no other importer). | Make it module-private. | Low |
| 5 | 53-67 | — | Scenarios at two end boundaries plus 12 seeded walks: 30 traces. | Keep. | — |

## Proposed end state
Same scenarios and witnesses, driving an imported `plan-admission.ts` with injected Cloud client, credential store,
storage and clock instead of a `vm` box of ~40 globals. No canaries.
