# apps/app/src/maps/basemap.ts
- Lines: 8 | Role: the public OpenFreeMap basemap constant (`globalBasemap`) | Verdict: MERGE into apps/app/src/maps/map-plane.ts
- Importers: 1 (prototype/maps-adapter.ts:13). No test, script or spec imports it.
- Text/path pins: test/support/feature-parity.mjs:316 (modules inventory). test/browser/upstream-map-plane.spec.ts asserts the rendered attribution text, not the file.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-8 | NEW (tiny single-consumer file) | `export const globalBasemap:GlobalBasemap = { kind:'global', styleUrl:'https://tiles.openfreemap.org/styles/bright', ... }` — a 5-line constant in its own module; map-plane.ts already owns Alpha's plane configuration and imports from the same upstream `map-plane.ts` | Move the constant (with its one-line comment) into map-plane.ts and import `globalBasemap` from there in maps-adapter.ts:13; delete this file and its feature-parity entry | Low |
| 2 | 1 | D13 | deep relative type import | alias | Low |

Copy to keep byte-for-byte: the attribution string `'OpenFreeMap · © OpenMapTiles · Data from OpenStreetMap'` (user-visible) and the style URL.

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `globalBasemap` | const | 4-8 | none | apps/app/src/maps/map-plane.ts |

## Proposed end state
File deleted; its 5 lines live at the top of map-plane.ts. Estimated lines after: 0 (+5 in map-plane.ts).

## Verification
test/browser/global-basemap.spec.ts, test/browser/upstream-map-plane.spec.ts (attribution link), `npm run verify` (feature-parity inventory, typecheck).
