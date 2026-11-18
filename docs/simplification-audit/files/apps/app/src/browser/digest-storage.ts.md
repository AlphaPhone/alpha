# apps/app/src/browser/digest-storage.ts
- Lines: 58 | Role: dev: CAS digest store over a BrowserDomainDocument, scoped to the development identity | Verdict: SIMPLIFY + MOVE to apps/app/src/dev/
- Importers: 1 (runtime/hosted-digest-ui.tsx). Text/path pins: specs/quint/refinement/application/hosted-digest-refresh.mjs, test/browser/dev-digest-storage.spec.ts, test/browser/digest-inbox-migration.spec.ts; test/support/feature-parity.mjs (exact inventory).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 23-35 | A1 | Legacy prefix scan: "All inbox slots migrate together ... Never update the old keys" reading every `alpha.browser.hosted-digests:v1:*` localStorage key; no writer exists (git grep localStorage.setItem: none for this prefix). | Delete lines 23-35 legacy lambda; pass no legacy. | digest-inbox-migration.spec.ts tests the import; delete it with A1. |
| 2 | 12, 19 | C3/C6 | Two inline parses of `alpha.connection.selection.v1`. | `readConnectionSelection()`. | None. |
| 3 | 47-56 | B3 (P6) | verify+check before and after every read/edit/capture/reset (four checks around one capture). | One verification at entry, one inside the edit transaction. | Low (dev). |
| 4 | 36-45 | B3 | `validate` called on every value read including inside check() per slot. | Validate once per read. | None. |
| 5 | 11 | D5 | `if(!browserDevProfile)` inner guard. | Delete when dev-only. | None. |

## Local types and helpers
| Name | Kind (type/interface/helper/const) | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| State | type | 27 | many local State types | stay |
| check | helper | 17-22 | development-workflows.ts:20 check | dev/development-identity.ts `assertDevelopmentConnection(identity)` |

## Proposed end state
~30 lines: identity/selection check helper shared with development-workflows, domain document without legacy, single verification per op. Estimated lines after: 30 (current 58).

## Verification
test/browser/dev-digest-storage.spec.ts, hosted-digest-refresh Quint harness (pins path).
