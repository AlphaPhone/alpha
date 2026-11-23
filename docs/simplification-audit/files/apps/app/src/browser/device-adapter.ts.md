# apps/app/src/browser/device-adapter.ts
- Lines: 11 | Role: monkey-patches the prototype Component to drive quick-settings tiles from the browser device store (dev builds only) | Verdict: SIMPLIFY (then MOVE to apps/app/src/dev/)
- Importers: 1 (main.tsx:33, called only under `if(devSurfacesEnabled)` at main.tsx:156). Text/path pins: none besides inventory; test/support/feature-parity.mjs (exact inventory).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10 | A4/B4 | `devSurfacesEnabled?'Needs recovery':'Device settings unavailable. Open a device setting to recover them.'` — main.tsx:156 only installs this adapter when devSurfacesEnabled is true, so the else string is dead. | Replace with the literal `'Needs recovery'`; drop the build-flags import. | None. |
| 2 | 7-10 | D2 | Wraps `componentDidMount`, `componentWillUnmount`, `renderVals` on the prototype. | Move into the hook registry when D2 lands; until then move the file to dev/. | Medium (order-dependent). |
| 3 | 6 | C2 | Inline `registerPlugin<{setSensor;setNetwork;setBrightness}>('AlphaDevice')` type; AlphaDevice typed again in prototype/settings-adapter.ts:114, agent-adapter.ts:83, camera-adapter.ts:103. | One typed `alphaDevice` module (C2). | Low. |
| 4 | 10 | D10 | Tile behaviour keyed on display labels (`'Wi-Fi'`, `'Agent can listen'`...). | Key on tile ids if the prototype exposes them. | Low; label copy is user-visible. |
| 5 | 10 | B1 | `.catch(()=>this.toast(...))` fine (specified fallback). | Keep. | - |

## Local types and helpers
| Name | Kind (type/interface/helper/const) | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| fields label→field map | const | 10 | none | stay |

## Proposed end state
Dead production string removed (devSurfacesEnabled import gone); stays an 11-line dev adapter, moved to dev/ with main.tsx import updated. Typed AlphaDevice from a shared plugin module. Estimated lines after: 10 (current 11).

## Verification
test/browser/dev-controls-accessibility.spec.ts, home-launcher.spec.ts (dev profile quick settings).
