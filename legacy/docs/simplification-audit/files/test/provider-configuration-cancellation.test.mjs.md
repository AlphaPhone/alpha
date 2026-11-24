# test/provider-configuration-cancellation.test.mjs
- Lines: 59 | Kind: unit (real `runProviderConfiguration` from `apps/app/src/runtime/abort-signal.ts` with fake ports) + source-text (regex over `local-agent.ts`, `connection-ui.tsx`, `scripts/browser-cloud-dev-bridge.ts`) | Verdict: MERGE 4 behaviour cases into `test/integration/connection-cloud.test.ts`; DELETE the 2 regex tests
- Covers: cancelling provider-key setup revokes the native lease before validation can commit, never dispatches keys after an early cancel, and a failed dispatch releases its lease. Duplicates: `test/provider-key-manager-bridge.test.mjs:55-61` (cancel before lease), `test/browser/provider-key-reconnect.production.spec.ts`. Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-22, 34-38, 55-59 | T3 | Four cases of one exported function with fake ports. Security-relevant (keys must not be saved after Back). | Keep as the cancellation section of the connection-cloud integration file. | Low |
| 2 | 23-32, 39-53 | T1 | Eleven regexes that pin call shapes (`browserResidentCall('residentOwn',...,signal)`, `signal.throwIfAborted();const providerStatus=...`). | Delete. | Low |
| 3 | 4 | D11 | `runProviderConfiguration` lives in `abort-signal.ts`; a provider-configuration helper in an abort utility module. | Note for the product chunk (move next to `local-agent.ts`). | Low |

## Proposed end state
Four cases (cancel before commit, positive commit, cancel before reservation, failed dispatch releases) in
`test/integration/connection-cloud.test.ts`, merged with `provider-key-manager-bridge`'s lease case. File deleted.
