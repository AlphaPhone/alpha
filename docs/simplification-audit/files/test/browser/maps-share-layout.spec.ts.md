# test/browser/maps-share-layout.spec.ts
- Lines: 9 | Kind: unit test in a browser (T6): calls `BrowserDevice.prototype.setTextScale` and `shareMap` from `/src` directly; project `chromium`, 2 tests (light/dark) | Verdict: **MERGE** into `journeys/maps.spec.ts` (share step, large text)
- Covers: the common Share panel opened for a long unbroken map title at 150% text stays inside a 360px viewport with 44px buttons and closes. Duplicates: `dev-maps-share.spec.ts` (Maps uses the common panel and copies its link) opens the same panel through Maps (T4). Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5 | T6 | Opens the panel by calling `shareMap` directly, so it never checks Maps' Share button reaches it. | Open a place in Maps and tap Share, after setting text scale through the harness `setTextScale` (`accessibility-states.ts`). | none |
| 2 | 3 | T4 | Theme loop only changes the screenshot. | One theme. | none |
| 3 | 5-8 | D8 | Whole test on two lines. | Normal formatting on move. | none |

## Proposed end state
One step in the Maps share journey (together with `dev-maps-share`'s copy-link case): at 150% text and 360px wide, Share
opens from a place with a very long name, every button is at least 44px and on screen, and Close works.
