# apps/app/src/browser/development-identity.ts
- Lines: 25 | Role: development profile identities (local/cloud/remote, owner/agent ids, namespace) and their consistency checks. | Verdict: SIMPLIFY (dev module)
- Importers: 11 (`development-actions`, `-agent-document`, `-connection`, `-digest-document`, `-digests`, `-execution-document`, `-workflows`, `digest-live-sources`, `digest-storage`, `workflow-drafts`, `runtime/connection-ui.tsx`). Text/path pins: 20 browser specs (dev-*, digest-*, journeys d/j03/j05, `*-migration` (A1)), `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7, 12 | B4 (P1) | `!devSurfacesEnabled\|\|!browserDevProfile` and `if(!devSurfacesEnabled)throw` — flag re-checked inside a dev-only module. | Delete behind the dev boundary. | Low |
| 2 | 10 | D5 (P1) | `developmentDefaultReply=devSurfacesEnabled?'Development reply…':''` — string fold to keep the text out of the production bundle. | Plain constant once the module is only reachable through the dev entry (bundle audit keeps the backstop). | Medium |
| 3 | 16, 19 | C3 | Namespace/session comparison written twice (`assertDevelopmentIdentity`, `verifyDevelopmentIdentity`). | `sameIdentity(a,b)`. | None |
| 4 | 22-25 | B3 (P6) | `developmentOwnerRecovery` verifies before and after capture/reset; used only by `connection-ui.tsx:3688` recovery (backup, D3). | Delete with the dev recovery dialogs. | Low |
| 5 | — | C3 | Should own the namespace regex now copied in three document files, and the selection check copied in actions/connection/digests. | Add `assertDevelopmentNamespace`, `assertDevelopmentSelection`. | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `DevelopmentIdentity` | type | 8 | none | keep |
| `account?:'first'\|'second'` | type | 8 | `DevelopmentAccount` (`development-account-document.ts:6`) | import it |

## Proposed end state
~20 lines in `dev/` with the shared namespace/selection assertions.

## Verification
All `test/browser/dev-*` and digest specs, journeys a/d.
