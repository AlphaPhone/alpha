# test/dc-lite-keys.test.mjs
- Lines: 70 | Kind: transplant-light integration: esbuild bundles the real `apps/app/src/prototype/dc-lite.js` after two string `.replace()`s of its imports (`iconStyle`, `templateHtml` swapped for a synthetic `<sc-for key=…>` template), then renders a `DCLogic` subclass with React in JSDOM; test 2 is source-text over `template.html` | Verdict: REWRITE as a step in `journeys/settings.spec.ts`; DELETE test 2
- Covers: the template engine's keyed `<sc-for>` keeps a focused button (same DOM node) through group/row insertions, distinguishes same-label rows by key, and removes retired rows; Settings uses group and row keys. Duplicates: the same keyed-focus property is driven end to end for other views by `test/browser/browser-list-focus.spec.ts`, `maps-list-focus.spec.ts`, `notes-photos-list-focus.spec.ts`; no Settings equivalent. Callers/importers: `npm test` glob. The research table called this "real IO"; it is not, it is JSDOM.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11-17 | T2 | Import lines rewritten by exact string match; a reformat of the two import lines silently stops replacing and the bundle fails. | Delete. | Low |
| 2 | 10 | T3 | Synthetic template, not the product template: tests the engine in isolation. | Use the real Settings view in Chromium. | Low |
| 3 | 66-70 | T1 | Regex that `template.html` contains the two `key=` attributes. | Delete; the journey step proves it. | Low |
| 4 | 19-64 | — | Focus retention under keyed insertions in Settings is a real accessibility property. | Journey step: focus "Text size" in Settings › Display, cause a group insertion (e.g. toggle a setting that adds a row), assert the same control keeps focus. Reuse the helper in `browser-list-focus.spec.ts`. | Low |

## Proposed end state
File deleted; one Settings step in `journeys/settings.spec.ts` (or the shared list-focus journey once the three
`*-list-focus.spec.ts` merge into `journeys/accessibility.spec.ts`).
