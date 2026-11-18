# test/google-workspace-return.test.mjs
- Lines: 62 | Kind: unit (bundles real `google-workspace-return.ts`, `cloud-protocol.ts`, `google-accounts.ts` through `test/fixtures/browser-source.mjs`; native port and HTTP are stubs) | Verdict: REWRITE as cases in `journeys/inbox.spec.ts` (Gmail connect)
- Covers: renderer side of the Gmail App Link return: only an exact redirect is sent, the native return is consumed once, a stale owner after an account switch publishes nothing, staging stays manual, a late listener after unmount consumes nothing. Duplicates: `google-connection-return.test.mjs`, `workspace-return-fallback.test.mjs`, `google-connections-resource-budget.test.mjs` (same module family). Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-13 | B2 / A7 | `nativeGoogleWorkspaceReturnAvailable` header probe is delete-candidate B283 (the methods ship in the same APK). | Delete the case with the probe. | Low |
| 2 | 50-53 | A1 / B2 | "Older client without optional return method" tests a fallback for a client that cannot exist in one build. | Delete with the fallback in `google-accounts.ts`. | Low |
| 3 | 14-18 | T3 | Redirect allowlist table duplicates the native `GoogleWorkspaceReturn.parse` rejection list (the authority). | Drop; native Gradle test is the authority. | Low |
| 4 | 20-35, 54-62 | T3 | Concurrency/ownership cases drive `watchGoogleWorkspaceReturn` with hand-timed promises. | Carry three to `journeys/inbox.spec.ts` with the native AlphaConnection fake: (a) connect → return `connected` refreshes accounts once; (b) `denied` shows the refusal; (c) account switch before consume shows nothing for the old owner. | Medium |

## Proposed end state
File deleted. Three Gmail-connect cases in `journeys/inbox.spec.ts` on the shared Capacitor bridge fake (AlphaConnection
`prepare/consume/subscribe`). The exact-URL rules stay on the native side.
