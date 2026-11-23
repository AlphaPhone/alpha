# test/browser/fixtures-empty-runtime.spec.ts
- Lines: 60 | Kind: Playwright, chromium (dev server). `page.route` swaps the served `prototype/fixtures.js` for `fixtures.empty.js` to imitate the production alias (P4-lite), then walks 10 views and the simulated shade | Verdict: **DELETE**
- Covers: with empty fixtures, every live view renders with no page error, no fixture sentinel text ("Jordan Park", "218 GB free", …) and no "undefined"; the Files root shows the storage browser; the simulated notification shade shows "No notifications", no Enclave lock tile and a Flashlight tile with no on/off claim. Duplicates: `production-surface.spec.ts:202` ("deferred apps are absent and root views show honest unconnected states") runs the real flag-off bundle, which actually resolves `fixtures.empty.js`; `production-surface.spec.ts:14` and `scripts/audit-production-bundle.ts:34` check the same fixture-name sentinels on the built bundle. Callers: the chromium project.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-19 | P4 / T4 | It imitates the production module alias on the dev server, which builds a third variant of the product. The production project already tests the real alias. | Delete. | Low |
| 2 | 6 | C6 | The sentinel regex duplicates `production-surface.spec.ts:14` and `audit-production-bundle.ts:34` (three lists, slightly different). | Keep one list, in the audit script, and import it from the production spec. | none |
| 3 | 28 | T8 | `waitForTimeout(250)` per view. | Deleted with the file. | none |
| 4 | 47-60 | D6 | The shade test drives the dev-only simulated shade (`?shell=launcher`), which moves to `dev/` (U-R1). On Android the shade is the OS. | Delete. If the owner wants "no Enclave lock tile / neutral Flashlight" guarded, that belongs to the quick-settings tile spec on the production lane. | Low |
| 5 | 37-45 | T4 | "Files root shows the storage browser" is also asserted by every Files journey that clicks Internal storage. | Delete. | none |

## Proposed end state
Delete the file. `production-surface.spec.ts` (to become `journeys/production-gating.production.spec.ts`) keeps the
real-bundle "honest unconnected views" test and imports the one sentinel list.
