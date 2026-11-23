# specs/quint/refinement/services/plan-admission-ports.mjs
- Lines: 94 | Kind: harness support: **source transplant** (slices `connection-ui.tsx`, strips types, evaluates in `vm` with a hand-built global box) | Verdict: PORT (then DELETE most of it)
- Covers: builds the executable plan-admission closure and its controlled ports for `plan-admission-grace.mjs`. Duplicates: none. Importers: `plan-admission-grace.mjs:7` only (grep).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 15-25 | T2 / T10 | Text pins in `apps/app/src/runtime/connection-ui.tsx` (all present today, 1 hit each): `'function readPlanAdmission('` → `'/** Notice shown when Cloud inference'`; `'function signInClient('` → `'/**\n * A new key was stored'`; line pins `'function stopEntitlementRefresh('`, `'function detachService('`; `'async function admitCloudResident('` → `'/**\n * Reads the account and plan again'`; `'function residentBindingController('` → `'/** The packaged-runtime refusal.'`; `'  async residentRedeem('` → `'  /** Checks the plan again'` (method body wrapped into `globalThis.redeemer`). Strips `^export ` and TypeScript types. | PORT: these six functions + `residentRedeem` move to `apps/app/src/runtime/plan-admission.ts` exporting `readPlanAdmission`, `admitCloudResident`, `residentBindingController`, `signInClient`, `stopEntitlementRefresh`, `detachService`, `residentRedeem`, each taking a deps object (cloud client factory, credential store, `verifyService`, storage, clock, `update(state)`, bind/clear provider ports). Then this file shrinks to a fixture that builds those deps. | High |
| 2 | 43-60 | D3 | The `box` enumerates ~40 free variables the sliced code reads (`state`, `cloud`, `service`, `active`, `operation`, `entitlementRefresher`, `redeemedPlanEnd`, `queueResidentRebind`, `work`, …): a precise inventory of `connection-ui.tsx` module-global state these functions depend on. | Use it as the dependency list for the extracted module. | — |
| 3 | 14 | — | The shared parts (`cloud-resident-binding.ts`, `subscription-entitlement.ts`) are bundled by real import: keep that half. | Keep. | — |
| 4 | 26-29 | B5 | Input list mixes the sliced UI file, metafile inputs and raw vendor paths for receipt binding. | Shrinks automatically after the port (metafile inputs only). | Low |
| 5 | 35 | — | `Clock extends Date` replaces global `Date` in the box: becomes an injected `now()` after the port. | — | — |

## Proposed end state
~40-line fixture constructing typed deps for an imported `plan-admission.ts`; no `vm`, no `stripTypeScriptTypes`, no
text anchors. Blocked on the `connection-ui.tsx` split (stage F); until then any comment edit near these anchors must
update this file in the same commit.
