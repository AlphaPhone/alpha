# test/browser/workflow-dialog-layout.spec.ts
- Lines: 23 | Kind: Playwright spec, chromium, 10 tests (2 themes × 5 dialogs); dialogs opened by module import | Verdict: MERGE into `journeys/accessibility.spec.ts` (compact large-text dialogs)
- Covers: at 360×430 and 150 % text, the workflow result, urgency, history, calendar recovery and clock-alarm dialogs fit horizontally, keep 44 px actions on screen, use the theme background, scroll with End, and close. Duplicates: the accessibility sweep (`accessibility-sweep.spec.ts`) checks target size and overflow for reachable states. Callers/importers: none. Listed as a pin in `cross-file-actions.md` U-R7.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-11 | T6 | Four of five dialogs are opened by importing `/src/browser/workflow-*.ts` / `calendar-recovery.ts` and calling them directly. | Reach each dialog through its UI (workflow run with a Write-result step, urgency step, Workflow history button) or add these states to the sweep catalogue. | Low. |
| 2 | 3, 11 | A3/D3 | `calendar` case opens App calendar recovery (`calendar-recovery.ts`, backup/salvage), deleted with U-R7 / D3. | Drop the case. | None. |
| 3 | 7 | T6 | Text scale set via `BrowserDevice.prototype.setTextScale`. | Use `harness/text-scale.ts`. | None. |
| 4 | 4 | T7 | Every dialog in both themes. | One theme here; the sweep owns the theme matrix. | None. |

## Proposed end state
Add the four surviving dialogs as states in the accessibility sweep, or one compact-dialog step in
`journeys/accessibility.spec.ts` that opens them through visible controls and checks fit, 44 px actions, End scroll and
close. Calendar recovery case removed. File deleted.
