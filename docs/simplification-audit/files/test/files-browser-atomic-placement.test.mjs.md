# test/files-browser-atomic-placement.test.mjs
- Lines: 147 | Kind: integration of upstream modules in real Chromium (esbuild bundles `.eliza/client-features/plugins/plugin-files/src/browser/{files,storage-volume}.ts`, launches Playwright Chromium from node:test, drives real IndexedDB) | Verdict: DELETE (upstream follow-up)
- Covers: upstream `BrowserStorageVolume.trash/restore` keep the exact row and the Trash journal when the IndexedDB `place` is refused by a concurrent peer write (deleted Trash folder, renamed file, restore-name collision). Duplicates: none in this repo; `test/files-browser.test.mjs:139-178` covers related Trash-record races against a hand-written fake library. Callers/importers: `npm test` glob; calls `checkClientFeatures` from `scripts/prepare-client-features.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 14-21 | T5 | Both modules under test are upstream plugin-files code, unmodified by Alpha. | Move the case upstream (plugin-files browser tests); delete here. | Medium: this is the only real-IndexedDB proof of the race. |
| 2 | 47-70 | T3 / T6 | Monkey-patches `library.place` in-page to hold and observe the placement: a unit-style seam inside a browser costume. | Upstream version should keep this seam (it is the only way to interleave the peer write). | Low |
| 3 | 11, 22-31 | cost / T9 | Launches its own Chromium (90 s timeout) and routes a fake origin from node:test instead of running in the Playwright suite. | Goes with the file. | Low |

## Proposed end state
File deleted; upstream follow-up "Files trash/restore placement races on IndexedDB refusal" filed with this file
as the starting point. Alpha keeps user-level Trash coverage in `journeys/files.spec.ts` (trash, restore to origin,
collision keeps both), which drives the same code through the UI.
