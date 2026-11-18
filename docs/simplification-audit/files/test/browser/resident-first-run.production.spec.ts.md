# test/browser/resident-first-run.production.spec.ts
- Lines: 243 | Kind: Playwright, `production` project, real UI over `flag-off-android.ts` + `resident-stub.ts` (fresh access, empty keystore, native email sign-in) with two extra `nativePromise` wrappers (permission ports, lifecycle request binding); 6 tests | Verdict: **MERGE** sign-in cases into `journeys/connection-cloud.spec.ts` (production project) and the permission sequence into `journeys/startup-permissions.spec.ts` (production project)
- Covers: first run shows a neutral loading screen (startup shell inert, hidden, transparent; no Home) until the sign-in page opens; native email sign-in stores the key, reads the plan, binds the provider, then restarts the resident, in that order, with no browser hand-off; the access sequence asks Notifications → Microphone → Camera → Location → Calendar → Photos → Files with no Skip, reading each grant back; the first request is answered and lifecycle requests carry the owner and bound credential; Cancel while verifying, an expired session, and a 401 on the account read all leave no key and the resident running without AI; a provider restart that fails once clears its stale error. Duplicates: signed-out state overlaps `production-surface.spec.ts` P-43 matrix (`signed-out`); accessibility of the sign-in page is `accessibility-sign-in.production.spec.ts`; `native-cloud-signin.spec.ts` covers the dev-build sign-in UI. Callers/importers: imports `flag-off-android`, `resident-stub`, `helpers/startup-frames`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 113 | T8 | `waitForTimeout(500)` while the first start is held. | Assert the inert/hidden shell directly (already polled for `firstStart.release`). | none |
| 2 | 19-42 | C3 | Permission-port wrapper that adds headers and fakes seven OS grants; startup-permission specs (other chunks) need the same. | Move to `harness/plugins/permissions.ts` with a `freshAccess` option. | Low |
| 3 | 43-66 | – | Lifecycle binding wrapper checks method/owner/body/Accept of `/api/status` and `/api/cloud/warm`. Real native-boundary contract; keep. | Fold into the agent fixture as an opt-in recorder. | none |
| 4 | 77-82, 363-367 | T7 | Long lists of "this retired control is absent" checks. | Keep the ones tied to an owner rule (no "Use local apps without AI"); drop the rest — the production-gating checks cover dev surfaces. | Low |
| 5 | 224-227 | A8 | Orphan comment block describing where other behaviour is tested. | Delete. | none |
| 6 | 142 | – | Regex `/^(All set|All set)$/` repeats one alternative. | `'All set'`. | none |

## Proposed end state
`journeys/connection-cloud.spec.ts` (production) owns: loading screen until sign-in, sign-in order of operations + first answer,
Cancel/expired/401 leave no key, recovered provider restart. `journeys/startup-permissions.spec.ts` (production) owns the
seven-step Allow sequence with read-back. Both use shared agent and permission fixtures. File deleted.
