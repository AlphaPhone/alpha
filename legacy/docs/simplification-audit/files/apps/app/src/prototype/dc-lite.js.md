# apps/app/src/prototype/dc-lite.js
- Lines: 195 | Role: The template interpreter: parses `template-source` once into an inert DOM and, on each React render, walks it to `React.createElement` calls (`{{holes}}`, `sc-if`, `sc-for`, `sc-element`/`sc-slot`, event and attribute renames, cached inline-style parsing, icon-by-path-data substitution). | Verdict: SIMPLIFY (KEEP as the shell renderer)
- Importers: `model.js:22` (`DCLogic`). Also bundled by `test/fixtures/voice-markup.mjs:13`, `test/fixtures/workflow-execution-markup.mjs:9`; replaced by a stub in `test/dev-surface-gates.test.mjs:19`.
  Text/path pins: `test/template-style-cache.test.mjs:7-8` slices the file between the literal `'  function camel('` and `'  function props('` (whitespace-sensitive — any reformat breaks it, T2); `test/dc-lite-keys.test.mjs:12` compiles the file text from stdin; `test/chat-transcript-window.test.mjs`, `test/history-initial-state.test.mjs`, `test/home-cards.test.mjs`, `test/automations-unified.test.mjs`, `test/browser-reading-capability.test.mjs` read/slice it (research tests-host table); browser specs `browser-list-focus`, `maps-list-focus`, `notes-photos-list-focus` mention it; `apps/app/src/prototype/README.md:3`; `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 71-72 | A7 | `if (n === "aria-label" && raw === "Stop and save" && scope.notes?.rec?.primaryLabel) …` and `if (n === "d" && raw === "{{ic.stop}}" && scope.notes?.rec?.primaryIcon) …` — nothing produces `primaryLabel` or `primaryIcon` (`git grep primaryLabel\|primaryIcon` → these two lines only) | Delete both lines | None |
| 2 | 70 | D10 | View logic keyed on attribute text: `raw === "{{name}}: summarize this file" && scope.files?.pv?.askLabel` (producer: `selection-adapter.ts:180 askLabel:'Ask Alpha'`) | Change the template attribute to `aria-label="{{pv.askLabel}}"` (or have the Files owner put the label into the value the template already binds) and delete line 70 | Low: accessible name of the Files preview ask button; check `test/browser/file-email.spec.ts` / a11y tests |
| 3 | 73-89 | D9 | 17-branch `else if` chain renaming lower-case attributes (`for`→`htmlFor`, `tabindex`→`tabIndex`, …) after a separate `EVENTS` map (7) | One `ATTRIBUTE_NAMES` lookup object merged with `EVENTS`: `n = ATTRIBUTE_NAMES[n] ?? n` | None |
| 4 | 145-171 | D10 | Icons resolved by SVG path data: `scope.iconAssets?.[props(n.children[0], scope, 0).d]` (`ICON_ASSETS` keyed by `IC[key]` path strings, `model.js:5943`). Two icons with the same path collide; editing a path silently loses the icon; `props()` is computed twice for the svg (147, 149) | Key icons by name (template `data-icon="{{ic.name}}"` or `IC` values become names) and look up `iconStyle(name)` directly; compute `props(n)` once | Medium: visual; screenshot comparison per view (research P16) |
| 5 | 21-63 | D12 | Runtime inline-style parser with a 4,096-entry cache and padding/margin shorthand expansion exists because the template carries 256 KB of `style="…"` (research P16) | Keep until inline styles move to CSS classes; then delete `parseStyle`, `boxStyle`, `camel`, the cache (~45 lines) | Low now; this is the end state, not a first step |
| 6 | 5-195 | D8 | Leftover IIFE indentation (every line indented two spaces at top level), `var` mixed with `const`, ES5 callbacks | Format once (formatter commit). Must retire/rewrite `test/template-style-cache.test.mjs` first: it slices on `'  function camel('` | None at runtime |
| 7 | 182-191 | NEW (module side effect at import) | The template is parsed and the phone surface cloned at module load (`document.createElement("template")` at import time), which is why tests stub this module | Acceptable for the renderer; note only. Lazy-parse on first `render` would let Node tests import `model.js` without a DOM stub | Low |
| 8 | 192-195 | D11 | `export class DCLogic` is the base class of `Component` (`model.js`); name reflects the design tool, not the role | Rename to `TemplateRenderer` with the shell split (`shell/` folder, research §5) | Low; test bundles import `DCLogic` by name |
| 9 | 4 | A8 | Comment "renderer for the prototype's .dc.html template" — the file is `template.html` | Reword | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `EVENTS` | const | 7 | none | merged with attribute map |
| `lookup`, `interp` | helper | 11-19 | none | stays |
| `camel` | helper | 20 | none | stays (until #5) |
| `parseStyle` + `styleCache` | helper | 25-63 | none | stays (until #5) |
| `props`, `kids`, `node` | helper | 64-180 | none | stays |

## Proposed end state
~170 lines: dead notes special cases and the files `aria-label` special case gone, attribute renames in one table, `props()` computed once for icon SVGs, formatted. After icons are keyed by name, the icon branch shrinks to ~10 lines; after inline styles move to classes, the style parser goes (~120 lines total).

## Verification
`test/template-style-cache.test.mjs` (rewrite or delete before formatting), `test/dc-lite-keys.test.mjs`, `test/chat-transcript-window.test.mjs`, the a11y suites (`test/accessibility-coverage.test.mjs`), `npm run test:browser` + production variant (every screen renders through this file), `npm run verify`.
