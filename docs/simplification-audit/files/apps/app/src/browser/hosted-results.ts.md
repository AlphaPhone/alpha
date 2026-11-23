# apps/app/src/browser/hosted-results.ts
- Lines: 55 | Role: web AlphaHostedResults plugin: redacted ledger of hosted digest result notices | Verdict: SIMPLIFY
- Importers: 3 (notifications.ts, register-hosted-results.ts, runtime/hosted-digest-ui.tsx). Text/path pins: specs/quint/application/manifest.json; refinement browser-hosted-result-notice.mjs (pins `hostedResultsDocument`), hosted-digest-refresh.mjs; 8 browser specs incl. journey-f-hosted-result.spec.ts; test/support/feature-parity.mjs (exact inventory).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 12 | A1 | `()=>localStorage.getItem(key)` legacy reader. | Drop with envelope. | Low. |
| 2 | 13, 23, 26 | C4 (P3) | Own BroadcastChannel facade + `typeof BroadcastChannel` guard (B2). | observedDocument(key,{event:'alpha:hosted-notices-changed'}). | Low; event name kept. |
| 3 | 15 | C3 | SHA-256→hex inline (`hash`). | lib `sha256Hex`. | None. |
| 4 | 16 | C3 | `canonical()` canonical-JSON; twin runtime/owner-reminder-notification-protocol.ts:28. | lib `canonicalJson`. | None. |
| 5 | 17 | C3 (P5) | `blocked=()=>document.hidden\|\|...devBackground==='true'\|\|!!browserScreenLocked()` — identical to notice-action.ts:2 `noticeActionBlocked` (already imported module). | Import `noticeActionBlocked` (renamed foregroundBlocked). | None. |
| 6 | 35 | B1 | `try{retained=...}catch{}` — intended (retained=false). | Keep with comment. | - |
| 7 | 20 | A7 | `export class BrowserHostedResults` — no importer outside (only the instance is used). | Unexport. | None. |

## Local types and helpers
| Name | Kind (type/interface/helper/const) | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| hash | helper | 15 | ~25 sites (C3) | lib/crypto.ts sha256Hex |
| canonical | helper | 16 | runtime/owner-reminder-notification-protocol.ts:28 | lib/json.ts canonicalJson |
| blocked | helper | 17 | notice-action.ts:2, notifications.ts:21, location.ts:11 (negated), password-provider.ts:23, review.ts:10 | foreground.ts |

## Proposed end state
Plugin keeps ledger logic; storage via observedDocument; shared sha/canonical/foreground helpers. Estimated lines after: 48 (current 55).

## Verification
journey-f-hosted-result.spec.ts, dev-hosted-results.spec.ts, notification-route-lifecycle.spec.ts, browser-hosted-result-notice Quint harness.
