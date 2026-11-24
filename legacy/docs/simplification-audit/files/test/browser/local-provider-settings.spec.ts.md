# test/browser/local-provider-settings.spec.ts
- Lines: 163 | Kind: Playwright connection/settings spec, `chromium`, 4 tests (1 loop of 2); hand-written Capacitor fake + `resident-agent-plugin.ts`; `openAccountProvider` overrides `connectionController.getSnapshot` in-page to fake a Cloud account (T6) | Verdict: MERGE into `journeys/connection-cloud.spec.ts`
- Covers: the Model provider section shows the fixed model, a rejected key is not saved, an accepted key is verified under its own lease and restarts the agent, Remove key needs confirmation and restarts without the key, the Cloud model name matches Settings, and the Account AI route is independent of provider admission. Duplicates: `local-agent-availability.spec.ts` (key save), `settings.production.spec.ts` ("Remove key"). Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 23, 26, 34, 36 | dead code | `AlphaHostedResults` header declared twice and its handler branch written twice (second unreachable). | Gone with the shared fixture. | - |
| 2 | 6-61 | T7, C3 | Third copy of the resident Capacitor fake. | Shared resident fixture with a provider-status/configure handler. | Low. |
| 3 | 65-76 | T6 | Fakes a signed-in Cloud account by wrapping `getSnapshot`. | Use the harness's Cloud sign-in stub (`resident-stub.ts`). | Medium. |
| 4 | 149-163 | T4 | Two-variant loop where only `providerStatus.configured` differs and the assertion reads it back through an import. | Keep one variant (configured), assert through the Account UI. | Low. |
| 5 | 78-138 | - | Rejected/accepted key, lease per check, confirmed removal and "page carries no key": the core provider-key behaviour. | Carry. | - |

## Proposed end state
`journeys/connection-cloud.spec.ts` "own provider key" test (reject, accept with restart, confirmed remove, no key in page) and one "Cloud route independent of admission" test with the chooser's Cloud model name as a step; on the shared resident fixture, no `/src` imports.
