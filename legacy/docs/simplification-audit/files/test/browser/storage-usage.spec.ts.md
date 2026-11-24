# test/browser/storage-usage.spec.ts
- Lines: 8 | Kind: Playwright chromium + firefox/webkit (listed in `scripts/storage-specs.ts:18`), 6 tests (1 + loop of 5); Files UI with `navigator.storage.estimate` faked, files added/removed through `registerPlugin('AlphaFiles')` in-page (s2 r13) | Verdict: MERGE into `journeys/files.spec.ts` (cross-browser storage lane)
- Covers: Files shows "N free of M" from the origin estimate and refreshes on return; when the estimate is missing, rejected, negative, infinite or over quota, it shows exact app-file bytes ("5 B in 1 app file" for "Café") that survive reload and drop to zero after delete. Duplicates: none found for the fallback; Files header cases in `standalone-shell.spec.ts`. Callers/importers: chromium; `scripts/storage-specs.ts` re-runs it on firefox/webkit; imports `./app-navigation`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7 | P2 | Adds and deletes the file through `registerPlugin('AlphaFiles').importFile/delete` instead of the Files UI. | Use Files → Add (file chooser) and Files → Delete permanently. | Low |
| 2 | 6 | T4 | Five invalid-estimate kinds exercise one validation branch; each run costs a page boot on three browsers (15 runs). | Keep two: `missing` and `over-quota`. | None |
| 3 | 4, 7 | D8 | Each test is one 600+ character line. | Format. | None |
| 4 | — | P1 | Membership in `scripts/storage-specs.ts` is by path; moving the cases must update that list. | Update the list (or tag `@storage`). | None |

## Proposed end state
Two cases in `journeys/files.spec.ts` tagged for the firefox/webkit storage lane: "storage estimate is shown and refreshes" and "an unusable estimate falls back to exact app-file bytes across add, reload and delete" (parameterised over `missing` and `over-quota`), driving add/delete through the Files UI. Delete this file and its `storage-specs.ts` entry.
