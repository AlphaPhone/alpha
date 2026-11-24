# test/browser/reset-only.production.spec.ts
- Lines: 25 | Kind: Playwright, `production` project, real UI; test 1 opens legacy "Previous notes"; test 2 seeds damaged bookmarks through the legacy localStorage key | Verdict: **DELETE** test 1; **MERGE** test 2 into `journeys/production-gating.spec.ts` (production project)
- Covers: test 1: production retained (legacy) Notes offers editing without import/export controls; test 2: in production, damaged browser data shows a "Data kept" notice with only Close (no backup download, no file input, no per-store reset) and leaves the bytes untouched. Duplicates: test 1 is moot once legacy Notes (D1) and import/export (D3) are deleted; absence of dev surfaces is also checked by `production-surface.spec.ts`. Test 2 is the only production check of `retained-data-notice.ts` (the dev branch is `domain-recovery.ts`). Callers/importers: imports `helpers/legacy-notes`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4-11 | A1 / A3 | Tests the absence of controls on a surface that is itself being deleted. | Delete. | none |
| 2 | 15 | A1 | Damaged data is injected via `localStorage['alpha.browser.bookmarks.v1']`, the legacy import source (C6). With the reader gone this seed never reaches the store. | Corrupt the IndexedDB domain record instead (a `harness/storage.ts` helper), then assert the same notice. | Medium: seed must change |
| 3 | 13-25 | – | Production gating of recovery (notice only, bytes kept) is a release rule worth one test. | Carry into production gating. | none |

## Proposed end state
One production step: corrupted bookmarks record → Browser → Bookmarks and history → Recover → "Data kept" with Close only → bytes
unchanged. File deleted.
