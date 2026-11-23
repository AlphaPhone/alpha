# test/browser/files-dialog-large-text.spec.ts
- Lines: 19 | Kind: Playwright, chromium, dev mode, 360×720. A UI journey; text scale is set through `BrowserDevice.prototype.setTextScale` in the page (P2), and the file is seeded through `registerPlugin` | Verdict: **MERGE into `journeys/files.spec.ts`**
- Covers: at 150 % text, the permanent-deletion review for a 180-character filename in Trash has no horizontal overflow, and Restore, Delete permanently and Cancel are all above the dock and on screen. Escape keeps the file. Duplicates: the accessibility sweep's large-text states cover clipping generically, but not this dialog. Callers: the chromium project.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7 | P2 | `BrowserDevice.prototype.setTextScale({percent:150})` is called in the page. | Set the text scale through the harness device fake (the `ElizaSystem` / text-scale bridge value the app reads at start). | none |
| 2 | 3 | T7 | The theme loop. | Drop it. | none |
| 3 | 16 | B5 | A screenshot with no assertion. | Drop it. | none |

## Proposed end state
One test, "the long-name permanent-delete review fits at 150 % text", in the "Files dialogs" block of
`journeys/files.spec.ts`, using `test.use({viewport:{width:360,height:720}})` and the harness text scale.
