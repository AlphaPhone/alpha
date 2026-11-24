# specs/quint/refinement/application/cloud-plan-recheck.mjs
- Lines: 151 | Kind: Quint refinement harness, source transplant (slices `connection-ui.tsx`, writes a generated JS file, runs it in `vm`) | Verdict: PORT
- Covers: resident Cloud plan recheck on return/network edges in `apps/app/src/runtime/connection-ui.tsx`: one-minute limit across failures and successes, one immediate read per offline->online edge, hidden document keeps the permit, credential change voids the permit, owner work aborts the read. Duplicates: none found. Callers: `test/quint-cloud-plan-recheck.test.mjs`, `index.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 16-36 | T10 / T2 | Slices `connection-ui.tsx` at 13 anchors: `export const PLAN_RECHECK_INTERVAL_MS`, `let lastPlanRecheck =`, `let planManagementReturn =`, `function planCheckScope()`, `let networkLostUnder:`, `let planRecheck:`, `async function recheckResidentPlan()`..`/** Bind or unbind`, `async function work(`..`/** Release only this operation`, `  networkChanged(`..`  openCloudAccount(`, `  recheckPlanOnReturn()`..`  /** The owner asked to check Cloud again`, and the line `  useEffect(()=>{const visible=()=>{if(!document.hidden)`. Rebuilds a fake `connectionController` object from fragments. | PORT with the `connection-ui.tsx` split (D1): extract a `plan-recheck.ts` module exporting `createPlanRecheck({now, admit, scope, isOffline, onUpdate})` with `networkChanged`, `recheckOnReturn`, `cancel` and `inspect()`; `connection-ui` composes it and owner `work()` calls `cancel()`. The harness imports it. | M |
| 2 | 44-63 | T2 | `vm.createContext` declares ~25 module-private names (`residentBinding`, `entitlementRefresher`, `queueResidentRebind`...) that the slice references. Every new reference in the sliced code breaks the harness. | Disappears with the extracted module. | M |
| 3 | 126-130 | B5 | Writes the generated source to a temp file only to hash it as a "generated source". | Drop with the port. | L |
| 4 | 13-14 | T10 / broken-later | Inputs include `index.mjs` and `test/quint-application-refinement.test.mjs`; deleting the aggregate breaks `captureInputs`. | Remove these entries. | M |

## Proposed end state
A small `plan-recheck` module with injected clock/admission/visibility ports, imported by the harness; same seven cases.
No vm, no temp file, inputs = module graph + model.
