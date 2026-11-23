# test/browser/files-dialog-accessibility.spec.ts
- Lines: 22 | Kind: Playwright, chromium, dev mode. A real keyboard journey (r11, no `/src` imports) | Verdict: **MERGE into `journeys/files.spec.ts`**
- Covers: the New folder dialog takes focus on open, traps Tab and Shift+Tab, Escape dismisses without creating and returns focus to the Files options button, and Create makes the folder and returns focus. Duplicates: the generic owned-dialog focus rules in the accessibility specs; `files-dialog-dismissal.spec.ts` covers the Rename and Delete dialogs. Callers: the chromium project.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2 | T7 | A light/dark loop doubles the run with no theme-specific assertion. | Drop the theme loop; the accessibility sweep owns contrast per theme. | none |
| 2 | 2-22 | T7 | A single-test file. | Combine it with `files-dialog-dismissal` and `files-dialog-large-text` as one "Files dialogs" block. | none |

## Proposed end state
One test, "New folder dialog owns focus and Escape creates nothing", in the "Files dialogs" block of
`journeys/files.spec.ts`.
