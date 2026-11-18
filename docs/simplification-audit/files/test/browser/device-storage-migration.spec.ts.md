# test/browser/device-storage-migration.spec.ts
- Lines: 32 (9 KB) | Kind: Playwright, chromium + firefox/webkit (listed in `scripts/storage-specs.ts`); module-in-page tests of browser device-preference storage (`browser/device-preferences.ts`, `preference-documents.ts`) | Verdict: DELETE (and remove from `STORAGE_SPECS`)
- Covers: empty hydration invents nothing, two tabs keep distinct changes, partial legacy `alpha.browser.device.v1` bytes are preserved, retired location reads cannot start geolocation, Home retires a settings dialog, damaged settings recovery downloads exact bytes before reset, late hydration cannot overwrite newer sensor setting, concurrent role grants. Duplicates: `preference-storage-migration.spec.ts`, `location-settings-recovery.spec.ts` (same lane). Callers: chromium, firefox, webkit via `scripts/storage-specs.ts:4`.

Signals: 17 evaluates, 21 `/src` imports, 17 `as any`, 8 role queries.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3-9, 27-32 | T6, P7 | Hydration, cross-tab, render-cache and role races are asserted by calling stand-in modules in-page. On Android, device preferences and roles are native. | Delete. | Low for product. |
| 2 | 10-12 | A1 | "partial legacy settings preserve exact bytes" seeds `'{ "music": 20 }'` (legacy envelope). | Delete (D1). | None. |
| 3 | 13-19 | P3 | Replaces `devicePreferencesDocument.read` to hold reads. | Gone. | None. |
| 4 | 20-26 | — | Damaged settings: Device controls → "Device settings recovery" → download exact bytes → reset. A dev-surface recovery of the browser stand-in. | Delete; if the owner keeps the dev recovery dialog, one case in `journeys/dev-surface.spec.ts`. | Low. |
| 5 | — | P1 | Runs three times (chromium, firefox, webkit) on a storage double. | Removing it shortens the storage lane. | None. |

## Proposed end state
Deleted, and its line removed from `scripts/storage-specs.ts`. The name is misleading: only one of eight cases is a migration.
