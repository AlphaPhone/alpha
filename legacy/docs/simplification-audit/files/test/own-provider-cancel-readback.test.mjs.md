# test/own-provider-cancel-readback.test.mjs
- Lines: 90 | Kind: transplant (type-strips the `connectionController` methods between `  async configureLocal(` and `  /** Stops the running agent` in `runtime/connection-ui.tsx`, `eval`s them inside four `new Function` sandboxes with hand-made ports) | Verdict: DELETE (carry 3 behaviours into `journeys/connection-cloud.spec.ts`)
- Covers: Own API keys / Cloud provider switching: a cancelled key check never claims the new key was saved; a late cancelled status cannot overwrite a newer Cloud selection; a committed selection with a lost response is read back without replaying; signed-out Cloud choice opens sign-in without selecting Cloud or deleting Own keys; a late saved-credential read cannot reopen sign-in after dismiss/Own. Duplicates: `test/browser/own-provider.production.spec.ts`, `local-provider-settings.spec.ts`, `provider-key-reconnect.production.spec.ts`; `test/own-provider-host.test.mjs` (host side of cancel). Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-8 | T2, D7 | Slice at `  async configureLocal(` (one of two readers of that marker) and `eval`. | Delete. | None |
| 2 | 14-22, 44-52, 65-72, 79-84 | T2, C4 | Four separate sandboxes each redeclare `operation`, `sending`, `providerStatusGeneration`, `update` and different subsets of ports. | Gone. | None |
| 3 | 25-33 | - | Cancel during a key check: no "saved" claim; late status cannot override a newer Cloud choice. | Journey: enter a key, Cancel while the (mocked) validation is pending, assert the switch still shows the old provider and no "saved" toast; then choose Cloud and let the old validation finish. | Medium |
| 4 | 60-75 | - | Signed-out Cloud choice opens sign-in and keeps Own keys. | Journey assertion. | Low |
| 5 | 40-58, 77-90 | - | Lost-response readback and late credential read races. | Drop; the host-side fences in `own-provider-host.test.mjs` (integration) cover custody, and the UI outcome is the same journey state. | Low |

## Proposed end state
Deleted. `journeys/connection-cloud.spec.ts` (from `own-provider.production.spec.ts` + `local-provider-settings.spec.ts`) covers: cancel during key validation leaves the old provider and no saved claim, and choosing Cloud while signed out opens sign-in without removing Own keys.
