# apps/app/src/prototype/scan-link-review.ts
- Lines: 28 | Role: "Links (n)" disclosure in the scan text review: lists URLs found in the current OCR text (shared `scannedLinks`) and opens one only on an explicit click (Android: `DailyApps.perform({action:'browser'})`). | Verdict: KEEP (minor cleanup)
- Importers: 1 — `scan-review.ts:5` (`createScanLinkReview`).
- Text/path pins: `specs/quint/refinement/services/scan-review-dialogs.mjs` (source list), `test/browser/scan-links.spec.ts` (copy "Open link", "Opening browser…", "Opened the browser.", "Couldn’t open", aria "Open <url>", "Scanned link status"), `test/support/feature-parity.mjs:414`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7, 9, 16-17 | D12 | Inline styles on summary, list, row and anchor, with `var(--acct,#00f)` hex fallback (outside the palette test). | Classes in `scan-dialog.css` (`.scan-links`, `.scan-link`); summary style shared with `scan-event-review.ts:6` (same `cursor:pointer;min-height:44px;padding-top:12px`). | Low (visual). |
| 2 | 14 | C6 | `links.length===10?' max':''` — 10 is the shared module's cap, re-stated here. | Export the cap from plugin-files (`SCANNED_LINK_LIMIT`) upstream, or compute "max" by asking for 11. Owner/upstream decision. | Low. |
| 3 | 22 | — | `.then(ok,fail).finally` with generation token — correct and specific; keep. | — | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| summary style | const (inline) | 7 | `scan-event-review.ts:6` | `.scan-dialog summary` CSS |

## Proposed end state
Same logic (~26 lines), styling in CSS, link cap named once.

## Verification
`npm run test:browser -- scan-links`; Quint `scan-review-dialogs` replay (source list only).
