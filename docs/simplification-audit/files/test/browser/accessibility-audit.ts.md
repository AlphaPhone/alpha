# test/browser/accessibility-audit.ts
- Lines: 806 | Kind: Playwright support helper (a hand-built accessibility checker, CDP plus in-page geometry) | Verdict: **KEEP, SIMPLIFY and MOVE** to `test/browser/harness/a11y.ts`
- Covers: the rule engine behind every accessibility and large-text assertion. Its parts are accessible name and focusability from the CDP AX tree (`auditTree`), page geometry, contrast, clipping, overlap and dock checks (`auditPage`), TalkBack linear order (`auditReadingOrder`), and the tab-order walk (`auditTabOrder`). Duplicates: the clipping and painted-box code is copied in `accessibility-resilience.spec.ts:392-438` and in the `camera-overlay-contrast` / `map-label-contrast` luminance maths (research tests-browser §duplication). Importers (checked with `grep`): `accessibility-audit.spec.ts`, `accessibility-lifecycle.spec.ts`, `accessibility-resilience.spec.ts`, `accessibility-sign-in.production.spec.ts`, `accessibility-sweep.spec.ts`, `accessibility-sweep.production.spec.ts`, `large-text-overlap.spec.ts`, `notifications-handle.spec.ts`. It is still needed after the deletes proposed in this chunk.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 346-357, 459-470, 643-649, 730-736 | C3 | The "box left after every clipping ancestor" walk (`painted`) is written out four times: in the overlap block, in the dock block, as a string inside `auditReadingOrder`, and inside `auditTabOrder.read`. A fifth copy is in `accessibility-resilience.spec.ts:395-404,419-428`. | Keep one `clippedBox(el)` and install it once per page with `page.addInitScript` / `exposeFunction`, or as one string the evaluate calls share. Delete the other copies. | Low. The behaviour is identical. |
| 2 | 38-48, 99-103, 652-653 | C3 | The `describe` function that reads the layer label and `outerHTML` is written three times (CDP string, `auditPage`, reading-order string). | Keep one shared function. | Low |
| 3 | 113-114, 695, 708, 756, 784 | C6 | The selectors `TABBABLE` and `INTERACTIVE`, and the dock selector `[data-alpha-layer="composer"],[data-alpha-layer="pill"] > *,[data-alpha-layer="conversation"]`, are repeated as literals 3 to 5 times. | Declare each once as a module constant and pass it in as an evaluate argument. | Low |
| 4 | 456-457 vs 342 | C3 | `type Box` and `scrolls` are declared again inside the dock block. | Keep one declaration. | none |
| 5 | 108 | B2 | `typeof el.checkVisibility === 'function'`. The audit runs only in Chromium (it needs CDP), where this method always exists. | Call `el.checkVisibility()` directly. | none |
| 6 | 59, 682 | B1 | `session.detach().catch(() => {})`. | Keep. A detach failure after the page has closed is expected and does not matter. Add a comment saying so. | none |
| 7 | 132 | D7-like | `handler()` reads the private `__reactProps$` key to find click handlers. This ties the test to React internals. | Keep (no public API gives this), but isolate it in one named function with a comment. | Medium if React changes the key format. |
| 8 | 14, 62 | A7 | `Violation`, `PageAuditOptions`, `READING_GROUPS` and `appTitle` are exported but nothing outside the file imports them (`grep -w`). | Remove `export` from these four. | none |
| 9 | 798-800 | C3 | `blocking()` is re-declared locally in `accessibility-sign-in.production.spec.ts:13` with weaker semantics (it drops the `appTitle` exception). | That spec imports this one. | none |
| 10 | 693-701 | D8 | The JSDoc for `auditTabOrder` sits on `exposedTabStopBudget`. The tab-order walk (701-793) is one 90-line function with seven mutable flags. | Move the doc comment. Split `auditTabOrder` into `walk()` and `missedStops()`. | Low |
| 11 | 3-12 | T5 / owner | The file calls itself a dependency-free axe. `auditTree`, `aria-reference` and contrast overlap with `@axe-core/playwright`. Geometry, dock, reading-order and tab-walk rules are specific to this product and have no axe equivalent. | Owner question: adopt axe-core for names, ARIA and contrast, and keep only the product-specific rules here. If not, keep the file as it is. | Medium (new dev dependency) |
| 12 | 116-117, 271, 343 | D10 | `.alpha-recovery` and `.os` roots and `[data-alpha-*]` hooks are hard-coded. These are the product's test anchors and are acceptable. | Keep. List them in the harness README. | none |

## Proposed end state
Move to `test/browser/harness/a11y.ts` and expose it through the shared `test.extend` fixture (`a11y.audit(page, profile)`), so that specs stop
composing `format([...auditTree, ...auditPage, ...auditTabOrder, ...auditReadingOrder])` by hand. That composition
appears about 15 times across this chunk's specs. Profiles: `full` (tree, contrast 24px, clipping, overlap, dock, tab, reading),
`layout` (clipping, overlap, dock, tree, tab, reading) and `dock`. Remove the four or five duplicated in-page helpers so that each
exists once. Expected size is about 550 lines, with the same rules. Absorb the contrast maths from `camera-overlay-contrast` and
`map-label-contrast` here.
