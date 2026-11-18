# apps/app/src/runtime/local-agent-storage.ts
- Lines: 81 | Role: development-only stores over the `/__alpha-local-agent` dev-server bridge: device slot store, workflow draft store, action journal (with notification/deletion/reminder recovery), and a CAS digest store. Nothing here runs in a production build (the `operation` throws). | Verdict: MOVE to `apps/app/src/browser/` (dev module, e.g. `browser/development-storage.ts`)
- Importers: 4 (`browser/digest-storage.ts`, `prototype/workflow-authoring.ts`, `runtime/connection-ui.tsx:50`, `runtime/hosted-digest-ui.tsx:285` dynamic). Text/path pins: `scripts/test-local-agent.ts:156`, `scripts/test-local-digest-storage.ts:6`, `specs/quint/native/manifest.json:13`, `specs/quint/services/manifest.json:2608`, `specs/quint/refinement/services/development-digest-pending-probe.mjs:5`, `test/browser/host-reminder-recovery.spec.ts:5,8`, `test/browser/workflow-notification-recovery.spec.ts:9,20,42`, `test/dev-surface-gates.test.mjs:88`, `test/support/feature-parity.mjs:543`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-81 | D6 / D11 | A dev-only module in `runtime/` named like a product store; production imports it statically from `connection-ui.tsx` and `prototype/workflow-authoring.ts`. | Move to `browser/development-storage.ts`; production code receives these stores only through the one dev entry point (DECISIONS D6). | Medium: many path pins (list above) must move together. |
| 2 | 9 | C6 / D5 | `developmentBridgeAllowed` expression copied verbatim from `local-agent.ts:71`, including the Node-test `import.meta.env!==undefined` shim. | Define once in `build-flags.ts` (`developmentBridgeAllowed`) and import. | Low. |
| 3 | 11 | C3 | Third copy of the `/__alpha-local-agent` POST (`local-agent.ts:104,109,117`). | One `devBridgeFetch(body, signal)` in the dev bridge client (browser/). | Low. |
| 4 | 30, 45 | C3 | Same 10-element binding tuple `JSON.stringify([input.scope,entry.record.ownerId,…,entry.operationId])` built twice, then the same `binding!==input.bindingHash||await actionScope(JSON.stringify(effect))!==entry.operationHash` check. | Local `async function checkBinding(input, entry, effect, label)`. | None. |
| 5 | 56-62 | A1 | `advancesPendingDigest` accepts `prior.phase===undefined` (legacy record without phase) — see hosted-digests report. | Accept only `'review'` once `phase` is required. | Low (dev only). |
| 6 | 57-61 | B1 | `catch{return false;}` on `JSON.parse(expectedValue)` of bytes this store wrote. | Let it throw. | Low. |
| 7 | 10 | C1 | `operation:(input:Record<string,unknown>)=>Promise<any>`. | Type the dev bridge request/response per operation (dev-only; low priority). | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `developmentBridgeAllowed` | const | 9 | `local-agent.ts:71` (verbatim) | `build-flags.ts` |
| `operation` (dev bridge POST) | helper | 10-13 | `local-agent.ts:104,109,117`, `browser-cloud-resident.ts` `browserResidentCall` | `browser/development-bridge.ts` |
| `advancesPendingDigest` | helper | 56-62 | `hosted-digests.ts` `digestPendingDiscardable` phase rule | dev module, reuse phase rule |
| binding tuple check | helper (inline) | 30-31, 45-46 | same tuple in `device-actions.ts` journal binding | local helper |

## Proposed end state
Moved to `browser/development-storage.ts` (~70 lines), importing `developmentBridgeAllowed` from `build-flags.ts` and a shared dev-bridge fetch; binding check deduplicated. `runtime/` keeps no dev stores; `vite.config.ts` stub list may then cover it like `mock-admission`.

## Verification
`test/browser/host-reminder-recovery.spec.ts`, `workflow-notification-recovery.spec.ts`, dev digest journeys; `scripts/test-local-digest-storage.ts`; Quint `development-digest-pending-probe.mjs` (update path); `scripts/audit-production-bundle.ts` must still find no dev bridge string in production output.
