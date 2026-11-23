# scripts/test-google-accounts.ts
- Lines: 93 | Kind: unit (real `createGoogleAccounts` from `apps/app/src/runtime/google-accounts.ts`, bundled with esbuild and imported from a `data:` URL; client is a stub) | Verdict: DELETE (carry one case)
- Covers: combined Google authorization consent sets, confirmed disconnect with one revocation + readback, lost disconnect reply, still-connected/unconfirmed, stale binding refuses any request, Cloud change during list/connect/disconnect/readback drops the result, disconnect copy text. Duplicates: `specs/quint/refinement/services/google-accounts.mjs:22-52` (same four disconnect outcomes, one revocation, readback, notifications) and `google-accounts-lifecycle.mjs` (owner switch retires pending work); consent sets also in `test-google-calendar-protocol.ts:40-50`; UI in `test/browser/gmail-grant-recovery.spec.ts`. Callers/importers: `test/google-accounts.test.mjs:1` (`import '../scripts/test-google-accounts.ts'`). The other grep hits (`google-calendar-connect.test.mjs`, `google-connections-resource-budget.test.mjs`, `fixtures/google-account-panel.mjs`, two Quint harnesses) only use the event-name string `alpha:test-google-accounts` or a comment.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 34-54 | T4 | Disconnect outcomes duplicate the Quint refinement harness, which also checks trace conformance. | Delete. | L |
| 2 | 87-93 | T1-like | Asserts exact copy strings (`Disconnect X? Mail and events stay.`) and the absence of "Eliza". Copy checks, not behaviour. | Delete. | L |
| 3 | 55-61 | — | "A changed sessionId/credentialId/client prevents any request under a stale helper" for `connect` and `list` is not traced by the lifecycle harness (that one covers the return watcher). | Carry this one case into the `google-accounts-lifecycle.mjs` harness (it already imports the real module) or into `test/integration/cloud-protocol.test.ts`. | M |
| 4 | 7-8 | C5 | Private esbuild + `data:` import loader, a twin of `scripts/fixtures/bundled-module.ts` and `test/fixtures/browser-source.mjs`. | Gone with the file. | — |

## Proposed end state
File and `test/google-accounts.test.mjs` deleted. One stale-binding case moves into the Quint lifecycle harness. The event name `alpha:test-google-accounts` used by other fixtures is just a string and is unaffected.
