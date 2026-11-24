# test/browser/large-text-layout.spec.ts
- Lines: 28 | Kind: Playwright layout check, `chromium` (`/?mode=dev&workflows=agent`), 2 tests (light/dark loop); text scale set by `import('/src/browser/device.ts').BrowserDevice.prototype.setTextScale` (T6) | Verdict: DELETE (carry one step into `journeys/accessibility.spec.ts`)
- Covers: at 150 % text the Home Inbox card, Files category cards, Browser address/Tabs controls and Workflows labels do not overflow; Browser toolbar Tab order; text scale survives reload. Duplicates: `accessibility-sweep.spec.ts` (clipping at 200 %/300 % over every view and both themes), `large-text-overlap.spec.ts` (Home cards, Files). Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10, 17, 22, 27 | T4 | Overflow checks at 150 % are a subset of the sweep's clipping rule at higher scales. | Delete. | Low. |
| 2 | 10, 19, 25, 27 | - | Four `page.screenshot` calls to the output folder with no assertion. | Delete. | - |
| 3 | 25 | T8 | `waitForTimeout(450)`. | Gone. | - |
| 4 | 26 | - | The text scale survives a reload (`--browser-text-scale` = 1.5) is checked only here. | Carry as one step in the accessibility journey, set through Settings rather than the prototype import. | Low. |
| 5 | 3-27 | D8 | Whole test is statement soup on ~10 lines. | Gone. | - |

## Proposed end state
File deleted. `journeys/accessibility.spec.ts` sets text size through Settings and asserts it persists across reload; overflow is left to the sweep.
