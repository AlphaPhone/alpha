# test/browser/helpers/resident-agent-plugin.ts
- Lines: 90 | Kind: Playwright init-script model of the Android `Agent` plugin | Verdict: **MERGE** with `test/browser/resident-stub.ts` into `harness/plugins/agent.ts`
- Covers: Agent plugin headers, listener callbacks, view-event subscription and emission, `setGoogleAgentAccess`, optional `providerStatus`, and the navigation/device-context routes via `native-navigation-protocol.ts`. Duplicates: `resident-stub.ts` and the agent parts of `flag-off-android.ts` (research P18: two resident fakes). Callers/importers: 15 specs, `helpers/delivery-fixture.ts`, `helpers/native-cloud-plan-fixture.ts`; source-pinned by the live Quint harnesses `refinement/application/account-sheet.mjs` and `cloud-connection-notices.mjs`; text read by `test/resident-agent-fixture-provider-status.test.mjs` (T5, delete in that chunk).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 16-21 | A8 | Comment cites commit `e15f0b735` and `#651`. | Describe behaviour only. | none |
| 2 | 80 | B1 | `try{JSON.parse}catch{body=input.body}`: the renderer always sends JSON or nothing. | Parse or fail. | Low. |
| 3 | 38-44 | D10 | `methods()` mixes the spec's names with implicit ones; specs must remember to use the returned `nativeCallback`. | Owned by `harness/bridge.ts` so specs never build headers. | none |

## Proposed end state
One `harness/plugins/agent.ts` (this model + `resident-stub.ts` + navigation protocol) registered through `installBridge`.
Live Quint pin lists updated in the same commit.
