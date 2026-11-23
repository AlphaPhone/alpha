# apps/app/src/browser/digest-authorization-document.ts
- Lines: 30 | Role: dev-only per-connection document holding a pending Cloud delegation request | Verdict: MOVE to apps/app/src/dev/ (or DELETE with the dev simulator)
- Importers: 1 (digest-delegation-ui.tsx). Text/path pins: test/browser/digest-authorization-migration.spec.ts; test/support/feature-parity.mjs (exact inventory).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 22 | A1 | `new BrowserDomainDocument(browserDocuments,key,()=>localStorage.getItem(key))` legacy reader; `subscribe` also listens to `storage` events named `legacy` (26). | Drop the legacy lambda and the storage listener with the envelope removal. | digest-authorization-migration.spec.ts asserts import; delete with it. |
| 2 | 6, 25-28 | C4 (P3) | Own BroadcastChannel facade (`typeof BroadcastChannel==='undefined'?null:...`). | Use `observedDocument(key,{event})` from preference-documents.ts. | Low. |
| 3 | 6 | B2 | `typeof BroadcastChannel==='undefined'` in browser-only code. | Construct unconditionally. | None. |
| 4 | 8-18 | B3 (P7) | Hand validator of data only this module writes; `validate({pending:next})` re-validates the caller's typed value (25). | Keep read validation; drop write-side validate. | Low. |
| 5 | 21 | D5 | `if(!browserDevProfile\|\|...)` inner dev guard. | Delete when module is dev-only. | None. |
| 6 | 24-28 | B3 (P6) | check-act-check around each call. | One check at entry and one inside edit. | Low. |

## Local types and helpers
| Name | Kind (type/interface/helper/const) | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| DigestAuthorization | type | 5 | digest-delegation-ui imports it as Pending | stay |
| validate | helper | 8-18 | none | stay |
| /^[a-f0-9]{64}$/ scope regex | const | 13,16,21 | digest-live-sources.ts:7 | dev/ids |

## Proposed end state
Thin dev document built on observedDocument; no legacy, no BroadcastChannel guard, single check per op. Owner decision (research §7 Q3): the whole development simulator may be deleted; if kept, move to apps/app/src/dev/. Estimated lines after: 18 (current 30).

## Verification
test/browser/digest-authorization-migration.spec.ts (likely deleted with A1), dev-digest-*.spec.ts.
