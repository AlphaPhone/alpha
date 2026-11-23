# specs/quint/legacy/files-browser/check-files-browser-refinement.mjs
- Lines: 402 | Kind: Quint refinement harness (historical, legacy family): Vite dev server + Chromium mount of the flag-off Files UI, replayed against `test/fixtures/quint/FilesBrowserComparison.qnt` (model `FilesBrowserReplay`) | Verdict: DELETE; carry three cases into `journeys/files.spec.ts`
- Covers: visible Files flows over real IndexedDB storage (collision rename on move, Trash/Restore/Empty with cancel, Images/Downloads grouping), the Files agent runner refusing a stale reviewed identity after a same-path rewrite, preview identity retiring on Back, and an external removal dropping a mounted selection; plus three *expected mismatches* against historical profiles.
- Duplicates: `test/browser/files-bulk.spec.ts` (move to `Move here`, `(1)` collision names, Trash, Empty Trash cancel/confirm at lines 14-30), `test/browser/dev-connection-actions.spec.ts:45` (reviewed identity vs rename), `test/files-reviewed-proposal.test.mjs`, live models `application/FilesBrowserController`, `FilesTree`, `FilesPreview`, services `FilesAndSharing`.
- Callers/importers: `specs/quint/refinement/legacy/index.mjs:3,142` (legacy family aggregate, run by `scripts/check-quint-refinement.ts` only when `legacy` is requested), `test/quint-legacy-files-browser-refinement.test.mjs:4` (in `npm test`, ~27 s per research §2.10).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 13-14, 230-233, 272-275, 392-400 | P6 / T4 | Models a superseded design (`ef9fbf7cd7`). Three of four outputs are `assert.rejects(... /Source\/model trace mismatch/)`: it passes only if today's code differs from the historical profiles. Protects no current requirement. | Delete. | None |
| 2 | 306-341, 374 | B5 / T10 | Hashes every file under `apps/app/src`, `.eliza/client-features`, two vendor plugin trees and configs (`captureInputs`), then a Vite transform asserts five watched files (`main.tsx`, `browser/files.ts`, `prototype/selection-adapter.ts`, `.eliza/.../files-browser-adapter.ts`, `storage-volume.ts`) served byte-identical to the hash and were all loaded. Evidence ceremony; pins file paths, so any move in stage F breaks it. | Delete. | None |
| 3 | 26-51, 53-83, 239-244, 282 | T6 | Seeds and reads state through `page.evaluate` backdoors: `window.__alphaModules['/src/platform-plugins.ts']` storage plugin, `Component.prototype.filesAgent.run/reviewedIdentities` from `prototype/model.js`, `alphaClient.getState().context`. Unit calls in a browser costume; reaching into `Component.prototype` couples to the `model.js` split. | Journey seeds through the shared fixture; agent path driven through the chat/approval UI. | — |
| 4 | 173-234 | — | Move with name collision keeps both files (`shared.bin` + `shared (1).bin`), Trash → Restore returns the same file to its folder, Empty Trash cancel keeps item, confirm removes it. Already in `files-bulk.spec.ts:14-30`; the restore-to-original-folder step is the only increment. | Carry "restore returns the file to its original folder" into `journeys/files.spec.ts` if `files-bulk` does not assert it. | Low |
| 5 | 236-276 | — | Reviewed move refuses with no identity, refuses after an external same-path rewrite (`Moved 0 of 1.`), accepts a fresh identity. Partly covered by `dev-connection-actions.spec.ts:45` and `test/files-reviewed-proposal.test.mjs`. | Carry "stale review after same-path rewrite is refused, fresh review succeeds" into `journeys/files.spec.ts` (or the agent-approval journey), driven from the visible proposal card, not `filesAgent.run`. | Medium (safety rule) |
| 6 | 278-304 | — | External removal (trash + empty from another writer) reaches the mounted selection via the storage-change notification: the `Deselect` row disappears and toolbar Delete is disabled. Not found in any `test/browser/files-*.spec.ts` (`files-bulk.spec.ts:82` only covers share-busy disabling). | Carry into `journeys/files.spec.ts`. | Medium (only coverage) |
| 7 | 281-289 | — | Preview identity (`selectedObject`) retires on Back. Reads `alphaClient` state, not UI. | Carry only if the chat-context journey does not already assert "Back from a document drops it from chat context". | Low |
| 8 | 349-371 | — | Per-page fences: `fenceNetwork`, no downloads, `navigator.share` never called, no page errors. Same guards the shared Playwright fixture already applies. | Goes with deletion. | None |
| 9 | 7-11 | — | Imports `scripts/prepare-client-features.ts`, `scripts/quint-lib.ts` (`filesWithin`, `sha256`), `test/browser/flag-off-android.ts`, `test/browser/helpers/page-modules.ts`, `refinement/check-traces.mjs`; each has other live importers, so deleting this orphans none. | None. | None |
| 10 | 329-347 | P1 | Cost: own Vite dev server + Chromium, three page sessions, four Quint checker runs, inside `node --test` verify. | Removed with deletion. | — |

Product files read as text / hashed: everything under `apps/app/src`, `.eliza/client-features`,
`vendor/eliza/plugins/plugin-native-passwords/src`, `vendor/eliza/plugins/plugin-native-system/src`,
`vendor/eliza/packages/core/src/utils/uuid.ts`, `apps/app/index.html`, `vite.config.ts`, `package.json`,
`package-lock.json`, `upstream.lock.json`. Markers/regex: none sliced; watched-path set (5 files) and the mismatch
regex `/Source\/model trace mismatch/`. Backdoor specifiers: `/src/platform-plugins.ts`, `/src/prototype/model.js`,
`/src/runtime/alpha-client.ts`. All five watched product files still exist today.

## Proposed end state
Delete this file, `files-browser/README.md`, `legacy/FilesBrowser.qnt` (+ manifest entry),
`test/fixtures/quint/FilesBrowserComparison.qnt`, `test/quint-legacy-files-browser-refinement.test.mjs`, and the
`FilesBrowser` entry + `filesBrowserDifferences` in `specs/quint/refinement/legacy/index.mjs` (that file goes whole
when the legacy family retires). Before deleting, add to `journeys/files.spec.ts` on the shared fixture: (a) external
removal drops a selected row and disables Delete, (b) stale reviewed move after same-path rewrite is refused and a
fresh review succeeds, (c) restore returns to the original folder if not already asserted. Lower the `legacy` floor in
`test/quint-checker.test.mjs` in the same change.
