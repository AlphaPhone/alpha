# test/connection-step-contracts.test.mjs
- Lines: 148 | Kind: mixed: transplant (slices of `connection-ui.tsx`, `native-connection.ts`, `cloud-delegation-ui.tsx` run in `vm`) + integration over the real `local-agent.ts` via `test/fixtures/browser-source.mjs` (lines 109-136) + one source-order assertion (80-82) | Verdict: DELETE transplants; MERGE the two `local-agent.ts` cases into `test/integration/resident-runtime.test.ts`
- Covers: plan end date not carried forward (`onView`); `retire()`/`activate()` disconnect the resident client; local-agent 401 is not a Cloud sign-in refusal; browser secret fallback to memory only in a private window; Stop reads the conversation list once per connection; shutdown wait polls with backoff; delegation Cancel reads Cloud state first. Duplicates: `connection-presentation-state.test.mjs:643` (same `onView` slice), `connection-recovery-state.test.mjs` (error mapping), `test/browser/dev-cloud-scenarios.spec.ts`. Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11-17 | T2 | Generic `between()`/`load()` slicer evaluating fragments with free globals. | Delete. | Low |
| 2 | 58-66 | A3 | Cases on `kind:'remote'` (paired) connections. | Delete with C4. | Low |
| 3 | 80-82 | T1 | Index of a string inside `send()`. | Delete. | Low |
| 4 | 87-105 | — | `durableSecretsWithFallback`: exported from `native-connection.ts` already, so the slice is unnecessary. Private-window fallback and "a failed durable removal is reported, never faked" are real rules. | Import and keep as an integration case in `test/integration/connection-cloud.test.ts` (IndexedDB fake from `fake-indexeddb` or the memory backend). | Medium |
| 5 | 109-136 | — | Real `LocalAgentProtocol` and `awaitLocalAgentStopped` with an injected bridge: already integration. | MERGE into `test/integration/resident-runtime.test.ts`. | Low |
| 6 | 140-148 | A3 | `delegationCancelStep` from `cloud-delegation-ui.tsx` (hosted delegation). `delete-candidates.md` lists delegation pieces under C4. | Delete with the delegation UI; if the UI stays, import the exported function. | Low |
| 7 | 21-41 | — | Plan-end not carried forward after renewal; the entitlement's own end wins. | Integration case once `onView` lives in an importable admission module (stage F). | Medium |

## Proposed end state
File deleted. `local-agent.ts` cases (row 5) and the secrets fallback (row 4) move as-is with real imports; plan-end
(row 7) follows the `connection-ui.tsx` split. Remote/delegation cases go with C4.
