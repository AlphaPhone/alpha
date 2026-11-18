# scripts/test-inbox-saved-drafts.ts
- Lines: 32 | Kind: unit with module mocks (real `apps/app/src/runtime/inbox-local-store.ts` bundled with `@capacitor/core`, `native-connection`, `json-domain-document` replaced) | Verdict: DELETE (carry one case)
- Covers: browser drafts go to the browser document store and never to the Cloud credential bridge; grant isolation by slot; compare-exchange conflict preserves content; invalid slots (`cloud:production`, short owner tuple) refused; on native, calls route to `secureConnectionStore`. Duplicates: browser save/conflict/isolation through the real UI in `test/browser/dev-inbox.spec.ts`, `inbox-unsaved-recovery.spec.ts`, `test-inbox-drafts-browser.ts`. Callers: `test/inbox.test.mjs:10`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 16-23 | T3/T4 | Round trip, grant isolation and conflict are covered by journeys. | Delete. | L |
| 2 | 24-25 | — | Refusal of non-draft slots (`cloud:production`) is a security rule (a draft write must never reach the Cloud credential slot). | Carry into `test/integration/inbox-provider.test.ts` (real import). | L |
| 3 | 26-28 | T3 | Native routing asserted by a mocked `Capacitor.isNativePlatform`; proves only an `if`. Real Android routing needs instrumentation. | Delete. | L |

## Proposed end state
File and shim row deleted; one slot-refusal case lives in the inbox integration file.
