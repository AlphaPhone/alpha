# apps/app/src/maps/map-plane.ts
- Lines: 60 | Role: Alpha subclass of the upstream MapLibre `MapPlane` (fonts, worker, accent, route/selection padding for Alpha's sheets) and `resolveMapColors`, which turns `var(--token)` theme colours into concrete rgb() for MapLibre | Verdict: SIMPLIFY
- Importers: 1 app (prototype/maps-adapter.ts:11). test/browser/map-label-contrast.spec.ts:9 and test/browser/upstream-map-plane.spec.ts:17 import it in-page; test/map-theme-colors.test.mjs:7 loads it.
- Text/path pins: test/map-theme-colors.test.mjs:72-74 reads the source and asserts `/region\.kind==='global'\?colors:resolveMapColors\(container,colors\)/` and the absence of `mapReady =`/`data-map-ready` (T1) — any reformatting of line 51 must keep that exact substring or delete that assertion; specs/quint/application/manifest.json:9500,9537 (symbol `MapPlane`); test/support/feature-parity.mjs:323.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10, 22, 25, 30, 37 | C6 | `throw new Error('Map theme colors are unavailable.')` written five times | `const unavailable = () => new Error('Map theme colors are unavailable.');` and `throw unavailable()` | None (test matches `/unavailable/`) |
| 2 | 32-38 | B3 | After the browser computed `probe`'s colour, the code re-parses `rgb(...)`/`rgba(...)`, checks every channel with a regex, `Number.isFinite`, ranges 0-255 and 0-1 and channel count. `getComputedStyle().color` always serialises a valid colour; the only realistic failure is an unsupported value, which `probe.style.color` being empty (line 30) already catches | Keep a single check that the serialisation starts with `rgb` (MapLibre needs rgb/rgba); delete the channel validation (lines 33-36) | Medium: test/map-theme-colors.test.mjs:68-69 feeds fake `computed` values `'rgb(999, 0, 0)'`, `'rgba(1, 2, 3, 2)'`, `'rgb(, , )'` through a stubbed `getComputedStyle` — those cases test the stub, not a browser (T3); delete those cases with the validation |
| 3 | 49-58 | D8, D9 | Constructor is one 400+-character `super(...)` call with an inline 7-line `selectionPadding` closure that queries three DOM selectors | Extract `function sheetAwarePadding(container: HTMLElement)` returning the closure; build the options object in a named `const options = {...}`; call `super(container, region, onError, colors, options)` | Low; keep the pinned `region.kind==='global'?colors:resolveMapColors(container,colors)` text or update the test |
| 4 | 51 | C6 | `accent:'#1616d8'` — a hard-coded colour that is not in the product palette (`--alpha-map-light-route` is `#0000FF`, dark `#4A58FF`) while every other map colour comes from the palette; test/theme-palette.test.mjs requires renderer colours to come from the record | Owner question: should the accent come from `--alpha-map-*-route` via `resolveMapColors`, or be added to `theme.palette`? | Low |
| 5 | 46-47 | A8 | "(plugin-maps 5176c4523c)" — commit reference in a comment | Delete the hash; keep the behavioural sentence | None |
| 6 | 2 | D13 | deep relative import | alias | Low |
| 7 | — | MERGE target | `basemap.ts`'s `globalBasemap` (5 lines) moves here (see that report) | add | Low |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `resolveMapColors` | helper | 8-44 | none (theme variables are produced by `alphaThemeVariables`, product/alpha-product.ts:71, but resolving to concrete rgb is unique) | stays |
| `MapPlane` | class | 48-60 | upstream `MapPlane` (subclassed) | stays |
| selection padding closure | helper | 51-58 | none | named function in this file |

## Proposed end state
~55 lines including the moved `globalBasemap`: `resolveMapColors` with one error factory and one serialisation check, a named padding helper, a readable options object, then the subclass constructor. Comments without commit hashes.

## Verification
test/map-theme-colors.test.mjs (update the source-text assertion and drop the fake-serialisation cases), test/browser/map-label-contrast.spec.ts, test/browser/upstream-map-plane.spec.ts, test/browser/global-basemap.spec.ts; quint application map-plane-ownership refinement; `npm run verify`.
