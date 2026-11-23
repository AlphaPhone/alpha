# test/browser/dev-workflow-files.spec.ts
- Lines: 53 (12 KB) | Kind: Playwright, chromium; local workflow simulator Files read + module-in-page tests of the `BrowserFiles` stand-in | Verdict: DELETE
- Covers: simulator "Read files" step reads text/binary metadata, recency ordering, cancel and rename during a held read, size limits, invalid UTF-8; `BrowserFiles` import/rename/move/byte reads and rollback. Duplicates: `dev-files.spec.ts` (byte exactness, rename, races, partial-folder rollback through the Files UI), `dev-incoming-attachments.spec.ts` (`workflowFiles`). Callers: chromium only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4-9, 24-26 | P7 | Simulator runs on files imported through `registerPlugin('AlphaFiles').importFile` in-page. | Delete with the simulator. | Low. |
| 2 | 7, 37-38 | P3 | `Blob.prototype.arrayBuffer` replaced to hold reads. | Gone. | None. |
| 3 | 31-36 | T6 | Opens `indexedDB` directly and writes 2,000 raw rows into `alpha.browser.files.v1`. | Gone. | None. |
| 4 | 44-53 | T6, T4 | `new BrowserFiles()` unit tests of import/rename/move/rollback; `dev-files.spec.ts` covers the same through UI. | Delete. | Low. |
| 5 | 28 | A1 | "legacy files retain unknown dates". | Delete (D1). | None. |

## Proposed end state
Deleted. Files behaviour stays covered by `journeys/files.spec.ts` (from `dev-files.spec.ts`).
