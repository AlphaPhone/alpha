# test/browser/product-recovery-entry.spec.ts
- Lines: 41 | Kind: Playwright, chromium, `?tools=1`; UI journey through Browser bookmarks and Photos albums recovery dialogs, seeded through legacy localStorage keys | Verdict: REWRITE seeding (current document store) and MERGE into `journeys/browser.spec.ts` and `journeys/camera-photos.spec.ts`; owner decision on whether damaged-store recovery stays
- Covers: damaged bookmarks and damaged photo albums show an in-app "Recover" entry (not Device controls) that downloads the exact damaged bytes and resets only after confirmation; healthy stores show no recovery entry. Duplicates: `preference-storage-migration.spec.ts:27-34` (bookmarks via Device controls), `password-provider-storage.spec.ts:13-18` (provider), `reset-only.production.spec.ts` (production variant). Callers: chromium only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4-7, 11, 24 | A1 (C6) | Damage is created by writing `alpha.browser.bookmarks.v1` / `alpha.browser.albums.v1` to **localStorage**, which only the legacy import in `domain-document.ts:43-47` reads (current data is in IndexedDB; `preference-storage-migration.spec.ts:14` asserts the localStorage key is never written). After C6 this seed produces a healthy empty store and the tests fail. | Seed unrecognised bytes into the current document store (harness `damageDocument(key)`), which `capture()` reports as `format:'unrecognized'`. | Medium. |
| 2 | 2-3 | A8 | Comment calls these "test-mocks recovery fixtures" but the page uses `?tools=1`, not `?mode=dev`. | Correct or drop. | None. |
| 3 | 17, 29 | C3 | Download-stream-to-string code duplicated in three specs. | Harness `downloadText()` helper. | None. |
| 4 | 35-41 | — | Healthy-store case is cheap and useful. | Keep as an assertion in each journey. | None. |
| 5 | 17, 29 | D3? | "Download … backup" of damaged bytes: DECISIONS D3 deletes app-data backup/export; this is damaged-store recovery, not backup. | Owner question. | — |

## Proposed end state
If damaged-store recovery stays: one case in each of the browser (bookmarks) and photos (albums) journeys: damaged current-store bytes → in-app Recover → download equals the bytes → reset after confirmation → empty healthy state; healthy stores show no entry. If it goes with D3/C6, delete this file with `domain-recovery.ts`'s download path.
