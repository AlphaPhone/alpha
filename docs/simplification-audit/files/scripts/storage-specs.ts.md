# scripts/storage-specs.ts
- Lines: 43 | Kind: Playwright config data (file list + regex) | Verdict: DELETE (replace with a `@storage` tag); until then MOVE next to `playwright.config.ts`
- Covers: names the 38 browser specs that run on Chromium, Firefox and WebKit (storage contracts across engines). Duplicates: none. Callers/importers: `playwright.config.ts:5` (`storageSpecPattern`), `scripts/qualify-head.ts:45` (`STORAGE_SPECS`), `scripts/ci/affected.ts:28` (path special-case); `test/playwright-projects.test.mjs:5` (T5: tests the list).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2-41 | D10 / T7 | A hand-kept list of spec paths that every spec rename, merge or deletion must edit; the journey consolidation (≈35 `journeys/<area>.spec.ts`) will invalidate nearly every entry. | Tag the cross-engine storage tests in their journey files (`test('…', {tag: '@storage'}, …)`) and set `grep: /@storage/` on the firefox/webkit projects. Delete this file, the regex, the `affected.ts` special-case and `playwright-projects.test.mjs`; `qualify-head.ts` uses `--grep @storage`. | Low |
| 2 | 4, 6, 8, 9, 10, 11, 16, 18, 19, 40 | A1 / D3 / D4 | Entries for features DECISIONS deletes: `*-storage-migration` specs (legacy readers, D1), `calendar-linked-storage` / `calendar-sync-settings` (client linked-sync stack, D4, if renderer-only), `calendar-backup-restore` (D3), `cloud-account-migration` (D1/D5). All files still exist in the worktree today. | Remove with the specs; do not tag them. | — |
| 3 | 42-43 | D10 | Regex rebuilt from the list by slicing path prefix/suffix. | Gone with the tag. | — |

## Proposed end state
No file. Storage journeys carry `@storage`; Firefox/WebKit projects run `grep: /@storage/`.
