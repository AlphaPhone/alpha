# Chunk test-19: Playwright specs `notifications-handle` … `product-recovery-entry` (30 files, 3,405 lines)

Per-file reports are in `files/test/browser/<name>.md`. Every file was read in full.

| File | Lines | Project | Kind | Verdict | Target |
|---|---|---|---|---|---|
| notifications-handle.spec.ts | 246 | chromium | UI gestures (pointer + CDP touch), 1 `/src` import | MERGE | `journeys/home-shell.spec.ts` (4 cases); 200 % case → `journeys/accessibility.spec.ts` |
| one-calendar.spec.ts | 129 | chromium | UI over controller-patching fixture | MERGE | `journeys/calendar.spec.ts` (3 cases) |
| operation-review-accessibility.spec.ts | 18 | chromium | module-in-page (`BrowserReviews.confirm`) | REWRITE | `journeys/accessibility.spec.ts` + `journeys/settings.spec.ts` (1 case each) |
| own-provider.production.spec.ts | 571 | production | production journey, big native fake | MERGE (15 → ~8 cases) | `journeys/connection-cloud.spec.ts` (production) |
| owner-gmail-read-state-absent.spec.ts | 69 | chromium | UI over patched store/controller | MERGE | `journeys/inbox.spec.ts` (1 parametrised case) |
| owner-maps-attribution-refusals.spec.ts | 88 | chromium | UI over in-page provider, tautological expected values | MERGE | `journeys/maps.spec.ts` (2 cases) |
| owner-settings-review.spec.ts | 64 | chromium | UI navigation, 1 `/src` read | MERGE | `journeys/settings.spec.ts` (2 cases) |
| password-entry-back.spec.ts | 37 | chromium | UI (dev vault) | MERGE | `journeys/settings.spec.ts` (Passwords step) |
| password-manager.spec.ts | 300 | chromium | UI dev + native vault, `/src` probes | MERGE (delete transfer part, D3) | `journeys/settings.spec.ts` (Passwords, 6 cases) |
| password-provider-setup.spec.ts | 132 | chromium | UI over `AlphaDevice` fake | MERGE (10 → 3) | `journeys/settings.spec.ts` (Passwords) |
| password-provider-storage.spec.ts | 18 | chromium+ff+webkit | module-in-page; legacy-key seed | DELETE | 1 case → `journeys/settings.spec.ts` |
| permitted-photos.spec.ts | 44 | chromium | UI over photos bridge | MERGE | `journeys/camera-photos.spec.ts` (3 cases) |
| photo-agent-review-leave.spec.ts | 21 | chromium | UI + direct `deviceLibraryAgent().runView` | MERGE | `journeys/camera-photos.spec.ts` (1 case) |
| photo-album-accessibility.spec.ts | 41 | chromium | keyboard journey | MERGE | `journeys/camera-photos.spec.ts` + accessibility |
| photo-albums.spec.ts | 30 | chromium+ff+webkit | 1 UI journey + 2 store unit tests | MERGE test 1 / DELETE 2-3 | `journeys/camera-photos.spec.ts` |
| photo-batch.spec.ts | 173 | chromium | UI + store unit + fiber walk + python3 | MERGE 5 cases / DELETE rest | `journeys/camera-photos.spec.ts` |
| photo-delete-accessibility.spec.ts | 33 | chromium | keyboard journey | MERGE (4 variants → 1) | `journeys/camera-photos.spec.ts` |
| photo-email.spec.ts | 54 | chromium | UI over prototype/controller patches | MERGE | `journeys/inbox.spec.ts` (2 cases) |
| photo-filter-fallback.spec.ts | 9 | chromium | unit in a browser costume | DELETE | — |
| photo-order.spec.ts | 60 | chromium | legacy v1 IDB seed + store unit + 1 grid walk | REWRITE | `journeys/camera-photos.spec.ts` (1 case, current-store seed) |
| photo-overlay-contrast.spec.ts | 40 | chromium | `?mode=mock` + hand-written contrast maths | MERGE | `journeys/accessibility.spec.ts` (1 case) |
| photo-permitted-batch.spec.ts | 82 | chromium | UI over bridge + prototype patches | MERGE (9 → 3) | `journeys/camera-photos.spec.ts` |
| photos-clean-controls.spec.ts | 149 | chromium | UI journeys + plugin probes | MERGE / DELETE test 2 | camera-photos, `journeys/chat.spec.ts`, `journeys/files.spec.ts` |
| photos-grid-density.spec.ts | 59 | chromium | UI pinch + layout maths | MERGE | `journeys/camera-photos.spec.ts` (1 case) |
| photos-pending-read.production.spec.ts | 68 | production | production journey with fixed sleeps | MERGE | `journeys/camera-photos.spec.ts` (production, 2 cases) |
| post-sign-in-setup.production.spec.ts | 162 | production | production journey | KEEP | becomes `journeys/startup-permissions.spec.ts` (production) |
| post-sign-in-setup.spec.ts | 232 | chromium (own Vite server) | dev:cloud renderer journey | MERGE 2 cases / DELETE rest | `post-sign-in-setup.production.spec.ts` |
| preference-storage-migration.spec.ts | 34 | chromium+ff+webkit | module-in-page, legacy bytes | DELETE | 2 cases → `journeys/browser.spec.ts` |
| privacy-per-connection.spec.ts | 230 | chromium | UI over inline fake + `/src` reads | MERGE (drop `remote`, D5) | `journeys/connection-cloud.spec.ts` + settings |
| product-recovery-entry.spec.ts | 41 | chromium | UI recovery, legacy-key seed | REWRITE seed + MERGE | `journeys/browser.spec.ts`, `journeys/camera-photos.spec.ts` |

Counts: KEEP 1, DELETE 3 (`password-provider-storage`, `photo-filter-fallback`, `preference-storage-migration`), MERGE/REWRITE 26.

## Behaviours that lose coverage if the DELETEs happen without replacement
- **Damaged-store recovery** (exact-byte download, then confirmed reset) for bookmarks, albums and the password provider. All three specs that cover it (`product-recovery-entry`, `preference-storage-migration:27-34`, `password-provider-storage:13-18`) create the damage through the **legacy localStorage keys**, which only the C6 legacy import reads. Once C6 lands, these tests seed nothing and fail, and no test creates damage in the current IndexedDB document store. A harness `damageDocument(key)` seed is needed before the C6 deletion if recovery stays.
- **Browser photo store fences** (stale album/media revisions, invalid batch requests, IndexedDB abort rollback, cursor validation): only module-level tests in `photo-albums`, `photo-batch`, `photo-order` cover them. This is the browser development store (Android uses native Photos), so I accept the loss; say so in the PR.
- **Photo paging order with tied dates**: today proven only on a legacy v1 database. The rewrite must seed current rows with controlled dates.
- **dev:cloud browser sign-in**: deleting `post-sign-in-setup.spec.ts` leaves the development Cloud bridge renderer with no end-to-end check (the APK path stays covered).
- **Portable filter fallback** (`photo-filter.ts`): no other test checks its pixels; it runs only where `ctx.filter` is missing (not Chromium/Android WebView).
- **Operation-review owner/abort fences** for internal callers: dropped; the user-reachable cancel paths stay.

## Shared helpers worth keeping or creating
- `helpers/photos-bridge.ts`: keep; add options `{rows, holdRead}` and a `calls(method)` reader (8 copies of `mediaFixture.calls.filter` here).
- New `seedPhoto(page, {color,width,height,date})`: replaces the `importBrowserPhoto` canvas seed repeated in 9 specs of this chunk.
- New `downloadText(download)`: three copies of stream-to-string.
- Harness `androidBack()`, `goHome()`, `touchDrag()`, CDP `pinch()`, `noMedia()` (replaces `guardCalendarFixture as guardNoMedia` imported from a calendar spec in 3 files).
- Typed bridge handlers for `ElizaPasswords`/`AlphaDevice` (two inline fakes in `password-manager` and `password-provider-setup`), the own-provider `Agent` lease fake (`own-provider.production` 90 lines) and permission plugins (`post-sign-in-setup.production`).
- `helpers/one-calendar.ts`: keep while `dev-calendar-preferences.spec.ts` imports it; port from controller patches to bridge stubs. Its `specs/quint/legacy/google-connect` importer retires with P6.
- One contrast helper (`photo-overlay-contrast` re-implements WCAG maths that `accessibility-audit.ts` already has).

## Cross-file actions
- Remove `password-provider-storage`, `photo-albums` and `preference-storage-migration` from `scripts/storage-specs.ts` (the cross-browser lane). They are development-store or legacy tests running in three browsers.
- D3: delete `ElizaPasswordTransfer` export/import with its test lines (`password-manager.spec.ts:211-222`) and the product code (`apps/app/src/passwords/password-manager.ts:8,58,249-262`).
- D7: delete the test-only export `passwordManagerHoldsEntries` (`password-manager.ts:159`; nothing in the product calls it).
- C6: when the `browser-camera.ts` v2→v3 upgrade and the `domain-document.ts` legacy path are deleted, rewrite the seeds in `photo-order` and `product-recovery-entry` first (same PR).
- D5/C4: drop the `remote` scenario from `privacy-per-connection` when the remote connection kind goes.
- `photo-batch.spec.ts` shells out to `python3` to read a zip: replace it with Node so the browser suite does not depend on Python.
- `post-sign-in-setup.spec.ts` starts a second Vite dev server per worker. Deleting it removes the cold start (up to 60 s waits).
- Fixed sleeps to remove: `photos-pending-read` (5), `photo-batch:138`, `notifications-handle:179`, `post-sign-in-setup.production:129`.

## Owner questions
1. Does damaged browser-store recovery ("Download … backup" of damaged bytes, then reset) stay after D1/D3/C6? It is not app-data backup, but every test of it depends on the legacy localStorage import.
2. Is the portable photo-filter fallback (`apps/app/src/browser/photo-filter.ts`) needed at all, given that Android's WebView supports `ctx.filter`? If not, delete it with `scripts/test-photo-filter-png-reference.ts`.
3. Does the dev:cloud browser renderer (`scripts/dev-cloud.ts`, `browser-cloud-dev-bridge.ts`) need its own end-to-end sign-in check, or is the production APK path enough?
4. Is the browser photo library (`apps/app/src/prototype/browser-camera.ts`, IndexedDB) a shipping surface or development-only? The answer decides whether its revision fences deserve integration coverage.
