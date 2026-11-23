# test/browser/permitted-photos.spec.ts
- Lines: 44 | Kind: Playwright, chromium; UI over `helpers/photos-bridge` (Capacitor `AlphaPhotos`/`AlphaPhotoLibrary` fake) | Verdict: MERGE into `journeys/camera-photos.spec.ts` (library access section)
- Covers: full access shows the library with no access row and no automatic permission request; selected access shows one "Allow all photos" row that opens the system sheet; Settings → Privacy → Permissions shows Selected and opens Android settings without granting more; denied access asks only on tap and loads after approval; revocation clears rendered Favorites. Duplicates: `post-sign-in-setup.production.spec.ts` (Photos step in access setup), `photo-permitted-batch.spec.ts` (retirement on revocation). Callers: chromium only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6, 15, 17, 25-26, 33, 37 | C3 | `mediaFixture.calls.filter(c=>c.method===X).length` repeated eight times. | A `calls(method)` reader on the bridge harness. | None. |
| 2 | 7-9 | A8 | Asserts a removed search box and `listPermitted` call are absent ("are gone"): a tombstone check. | Drop. | None. |
| 3 | 11-18, 28-38 | T4 | Selected and denied cases both assert the row, no auto request, then one request on tap. | One parametrised case over {selected, denied}. | None. |
| 4 | 42 | P2 | Revocation via `mediaFixture.emit()` is the native event boundary. | Keep. | None. |

## Proposed end state
Three cases: (1) full access: no row, no request; (2) selected/denied: row shown, no automatic request, tap requests once and (denied) loads the library; (3) Settings permissions row opens Android settings, and a revocation event empties Favorites. Uses `helpers/photos-bridge` (keep).
