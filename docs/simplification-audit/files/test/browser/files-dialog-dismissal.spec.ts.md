# test/browser/files-dialog-dismissal.spec.ts
- Lines: 26 | Kind: Playwright, chromium, dev mode. A UI journey with in-page reads of `alphaClient.getState().context.selectedObject` (T6) and a synthetic `<dialog>` injected into the DOM (s4/r13) | Verdict: **MERGE into `journeys/files.spec.ts`**
- Covers: the Rename dialog takes focus and stays above the dock. Back closes an outer native review first, then the sheet. Escape restores focus to the opener. Home keeps the unsent composer draft. The file is unchanged, and the agent selection context is unchanged by dismissal. Duplicates: `files-dialog-accessibility.spec.ts` (focus/Escape on New folder); the Back-ownership rule is in the owned-dialog/accessibility specs. Callers: the chromium project. Helper: `calendar-draft-readiness.ts` (`guardCalendarFixture`, imported as `guardNoMedia`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1 | D11 | `guardCalendarFixture as guardNoMedia` is a calendar helper renamed at import to mean "no media". | Use the harness network/media fence (`harness/app.ts` auto-fixture) instead. | none |
| 2 | 20 | T6 | A synthetic `<dialog aria-label="Owned outer review">` is built in the page to test Back ordering. That is not a product dialog. | Delete that step; Back ordering over real stacked dialogs is covered once in the accessibility journey. | Low |
| 3 | 13, 22 | T6 | `alphaClient.getState().context.selectedObject` is compared before and after. | Drop it, or replace it with a visible check (the file is still selected / open). | Low |
| 4 | 16-17 | — | Dialog bottom above the dock is a real layout check. | Keep. | none |
| 5 | 18 | B5 | A screenshot with no assertion. | Drop it. | none |
| 6 | 4 | T7 | The theme loop has no theme-specific assertion. | Drop it. | none |
| 7 | 3 | C3 | An inline external-network abort route; 69 copies exist (research). | Use the harness auto-fence. | none |

## Proposed end state
One test, "Rename and Delete dialogs restore their opener and keep the file and the Home draft", in the "Files
dialogs" block of `journeys/files.spec.ts`. It has no synthetic DOM and no `/src` reads.
