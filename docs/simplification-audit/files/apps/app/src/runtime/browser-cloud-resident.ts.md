# apps/app/src/runtime/browser-cloud-resident.ts
- Lines: 88 | Role: development-only "browser Cloud resident" transport: POSTs to the loopback `/__alpha-browser-cloud` dev host for resident binding and provider-key operations, and widens the managed-service route policy for staging/sign-in hand-off | Verdict: MOVE to `apps/app/src/browser/dev/cloud-resident.ts` (dev module) + SIMPLIFY
- Importers: prototype/agent-calendar-adapter.ts, runtime/cloud-protocol.ts, runtime/cloud-voice.ts, runtime/connection-ui.tsx, runtime/development-cloud-voice.ts, runtime/google-connection-ui.tsx, runtime/local-agent-storage.ts, runtime/local-agent.ts, runtime/native-connection.ts (9 production modules branch on `browserCloudResidentEnabled`). Text/path pins: `specs/quint/refinement/application/google-calendar-link-publication.mjs`, `specs/quint/services/manifest.json` sources; `test/browser-provider-transport.test.mjs`, `test/cloud-resident-authority.test.mjs`, `test/fixtures/google-account-panel.mjs`, `test/google-connections-resource-budget.test.mjs`; `scripts/browser-cloud-dev-bridge.ts` is the host side; feature-parity inventory.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole file | D6/D5 | Dev-only module in `runtime/`; nine production modules import `browserCloudResidentEnabled` and fork on it (e.g. local-agent.ts:101, :554). | Move under `browser/dev/` and register it as an alternative `LocalAgentBridge` / route-policy provider at the dev composition root so production modules stop branching (research P6). | Medium (owner: is `npm run dev:cloud` still used? research Q2). |
| 2 | 5 | D7 | `import.meta.env!==undefined&&…` Node-import shim. | Read `devSurfacesEnabled`-style flag from `build-flags.ts`; drop the undefined check. | Low; Node tests importing this file break (they should not). |
| 3 | 12, 41-43 | C3 | Two fetches to the same endpoint with the same headers, `redirect:'error'` and `AbortSignal.timeout(120000)`, built separately. | One `postDevHost(body, signal)` helper with the timeout constant. | None. |
| 4 | 12, 41 | C3 | Uses `AbortSignal.any` directly while the rest of the renderer goes through `anyAbortSignal` (abort-signal.ts). | Consistent with abort-signal decision (dev desktop browsers have it; fine to keep direct). | None. |
| 5 | 18-34 | A7 | `BrowserProviderStatus`, `BrowserProviderReveal`, `BrowserProviderInputMap`, `BrowserProviderOperation`, `BrowserProviderResultMap` exported; 0 importers outside this file. | Unexport. | None. |
| 6 | 60-64 | B1 (keep) | `catch{…throw Error('Unavailable')}` maps every failure to fixed copy so no provider/key text leaks. | Keep, comment already explains. | — |
| 7 | 57-59 | B3 (keep) | Field-by-field validation of the dev host response — host is a process boundary. | Keep, format. | — |
| 8 | 69-76, 78-88 | D10 | Route-policy widening for staging (rewrites hostname to production to reuse the policy). | Move with the module; production `managedServiceRequest` is then called directly by native-connection.ts. | Low. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `browserCloudResidentEnabled` | const flag | 5 | other dev flags: `browserLocalAgentEnabled` local-agent.ts:69, `developmentBridgeAllowed` local-agent-storage.ts:9, `developmentSessionsAllowed` alpha-client.ts:185 | `build-flags.ts` |
| `/__alpha-browser-cloud` POST | helper | 12, 43 | `/__alpha-local-agent` POSTs in local-agent.ts:104,109,117, local-agent-storage.ts:11 | one dev bridge client in `browser/dev/` |
| `OWN_KEYS_NOT_SET_UP` | const | 8 | used by connection-ui.tsx | keep (copy) |

## Proposed end state
~70 lines in `browser/dev/cloud-resident.ts`, flag from build-flags, one POST helper, private types; production modules receive the dev transport by injection rather than importing the flag.

## Verification
`test/browser-provider-transport.test.mjs`, `test/cloud-resident-authority.test.mjs`, `scripts/browser-cloud-dev-bridge.ts` manual dev run (`npm run dev:cloud`), `scripts/audit-production-bundle.ts` (must still strip it).
