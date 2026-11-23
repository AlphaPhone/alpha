# test/browser/dev-controls-accessibility.spec.ts
- Lines: 24 (3 call sites, 10 tests: 8 viewport/theme/scale combinations + 2) | Kind: Playwright `chromium`, dev build with `tools=1`; layout/contrast checks of the developer toolbar | Verdict: **MERGE** into `journeys/dev-surface.spec.ts` (1 case)
- Covers: the Device controls toolbar and dialog stay readable, 44 px targets, inside the viewport, do not cover Back to apps, Escape returns focus; profile switching between development and app profiles; role storage failure message; toolbar clearance and absence from mock mode. Duplicates: none for the product (this is a developer surface, D6). Callers/importers: `chromium` project.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2 | T7 | 2 widths × 2 themes × 2 scales = 8 full app boots for one developer dialog. | One combination (360 px, dark, 150 %). | none |
| 2 | 4 | P3 | Text scale set by calling `BrowserDevice.prototype.setTextScale` in-page. | Use `?textScale` or the Display setting. | Low |
| 3 | 5, 8, 17 | T1-like | Exact colours (`rgb(0, 0, 255)` toolbar, black/white dialog). | Keep only bounds/overlap checks; colour belongs to the a11y helper's contrast rule. | none |
| 4 | 14-18 | P3 | `IDBObjectStore.prototype.put` patch for `alpha.browser.roles.v1`. | Delete the failure arm; keep the profile switch. | none |
| 5 | 20-24 | production gating | Toolbar absent in mock mode. | Carry. | none |

## Proposed end state
`journeys/dev-surface.spec.ts` smoke: dev toolbar visible with "Dev data", opens Device controls, every button reachable, Escape returns focus, does not cover Back to apps; "Use development profile"/"Use app profile" switch; toolbar absent with `?mode=mock`. Delete the file.
