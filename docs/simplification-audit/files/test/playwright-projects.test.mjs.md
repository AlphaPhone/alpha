# test/playwright-projects.test.mjs
- Lines: 47 | Kind: tooling and inventory (loads the real `playwright.config.ts` and routes every `test/browser/*.spec.ts` through its projects) | Verdict: DELETE (replace with a load-time check in `playwright.config.ts`)
- Covers: `.production.spec.ts` and `production-surface.spec.ts` run only in `production`; `.local.spec.ts` runs in no default project and only in `live`; storage specs run in chromium, firefox and webkit; every `STORAGE_SPECS` entry exists. Duplicates: none (Playwright's own `--list` shows the same routing). Callers/importers: `npm test`; imports `scripts/storage-specs.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 21-32, 40-47 | T5 | It tests the test runner's configuration, which is test machinery, by recomputing the routing with its own copy of the filename rules (`production`, `live` regexes at 9-10). | Delete. | low |
| 2 | 34-39 | T1/A7 | "The storage inventory names existing development specs only" is a file-list check. Its only value: a renamed or deleted spec silently drops out of firefox and webkit. | Move it into `playwright.config.ts` as a load-time `throw` when a `STORAGE_SPECS` path does not exist (3 lines), and move `scripts/storage-specs.ts` next to the config (`research/scripts.md:674`). | none |
| 3 | — | cross-file | `STORAGE_SPECS` lists specs that D1 and D3 delete (`*-storage-migration.spec.ts` ×6, `cloud-account-migration`, `calendar-backup-restore`, `device-storage-migration`). With the journey consolidation the list becomes about 6 journey files. | Prune it in the same change that deletes or merges those specs. | none |

## Proposed end state
Deleted. `playwright.config.ts` owns the storage list and throws on a missing entry. Project routing is checked by running
`npx playwright test --list` in CI if anyone wants it, not by a node test that re-implements the routing.
