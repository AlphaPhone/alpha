# specs/quint/refinement/application/browser-album-storage.mjs
- Lines: 332 | Kind: Quint refinement harness, orchestration (two real Chromium tabs, real IndexedDB + Web Locks, esbuild bundle of real modules, plus renderer batch via `photos-window.mjs`) | Verdict: KEEP, SIMPLIFY
- Covers: Photos custom-album CAS (create/rename/add/remove/delete) bound to media mutation revisions across two tabs, lock ordering vs a queued Trash in the other tab, and the rendered multi-select "add to album" batch skipping a stale item, against `BrowserAlbumStorage.qnt` (101 lines, live). Duplicates: `photos-owned-album-dialog.mjs`, `photos-window.mjs` share the renderer fixture; Playwright Photos specs cover single-tab album UI. Callers/importers: `index.mjs`, `test/quint-browser-album-storage.test.mjs` (which also calls the exported `checkBrowserAlbumWithoutLocks`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 33-66 | (good) | Bundles the real `browser-camera.ts`, `documents.ts`, `preference-documents.ts`; only `compareExchange` is wrapped to hold the CAS. No text slicing. | Keep. | – |
| 2 | 26-32 | B5 | Hashes the prepared upstream `browser-document-store.ts` and asserts `.source.json` `baseCommit`/`sourceFiles`/`files`. Same provenance check is copied in ~10 harnesses and in `test/fixtures/browser-external-handoff.mjs`. | Delete; `checkClientFeatures()` once per run. | None |
| 3 | 67-70 | B5 | `captureInputs` over metafile inputs. | Drop. | None |
| 4 | 106-129 | T3 | `checkBrowserAlbumWithoutLocks` is not a trace replay; it is an assertion test (no Web Locks ⇒ album writes refused, favorite still works) exported for the wrapper test. | Keep the behaviour (it is a real browser-support refusal) but move it into `journeys/camera-photos.spec.ts` as a step with `navigator.locks` removed, or keep as a second `test()` in the single runner. | Low |
| 5 | 292-296 | T8 | Polling loop with fixed 20 ms sleeps (max 30) for the album choice; and a 30 s manual timeout race. | Use `expect.poll`-style wait helper from support. | Low |
| 6 | 6 | C7 | Imports `chromium` from `playwright` while other harnesses import from `@playwright/test`. | One import source. | None |
| 7 | – | Runtime | Each of 4 scenarios launches a context with two pages; wrapper timeout 420 s. | Formal lane only when Photos/album/document-store files or the model change. | – |

## Proposed end state
~290 lines with provenance/hash code removed and the no-locks check moved out; same four orchestration scenarios.
This is already the "imports real modules" shape and needs no product change.
