# scripts/maps/test-recovery-renderer.ts
- Lines: 25 | Kind: browser end-to-end script (raw Playwright `chromium.launch`, needs `npm run dev:maps` already running on port 5194 and the real regional gateway) | Verdict: REWRITE as cases in `test/browser/journeys/maps.spec.ts` (chromium project, test-mocks), then DELETE
- Covers: Maps shows "Regional Maps is unavailable. Submit a search to retry" when capabilities fail, retries exactly once on the next search, and a failed route shows the service error, clears the stale route, and recovers on the next submit. Duplicates: partly `test/browser/upstream-map-plane.spec.ts:57` ("configured renderer recovery") and `managed-maps-unavailable.production.spec.ts` (Cloud provider refusals). Callers/importers: **none** (whole-repo grep for `test-recovery-renderer` finds nothing outside the audit docs); imports `scripts/fixtures/playwright.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | A7/T9 | Orphan test script; its coverage is zero today. | Delete after carrying the cases. | None. |
| 2 | 4-8 | T7 | Hand-launched browser instead of the Playwright harness; depends on a manually started dev server and real data. | Journey spec with `page.route` fixtures for `/capabilities`, `/search`, `/place`, `/route` on the regional base URL (no real gateway needed). | Low. |
| 3 | 23-24 | B5 | Writes an evidence JSON nobody reads. | Drop. | None. |

Cases worth carrying: (a) capabilities failure shows the retry message and makes exactly one request until the user
submits a search; (b) route failure shows the service-connection message and removes the previous route summary;
(c) the next submit after recovery shows a route again.

## Proposed end state
Deleted; three cases live in `journeys/maps.spec.ts` using a shared regional-provider fixture (helper:
`test/browser/fixtures/regional-maps.ts` serving a tiny canned place/route set).
