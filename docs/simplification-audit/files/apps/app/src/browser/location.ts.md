# apps/app/src/browser/location.ts
- Lines: 73 | Role: web ElizaLocation plugin: permission flow and geolocation watches gated by the device location toggle | Verdict: SIMPLIFY
- Importers: 1 (register.ts). Text/path pins: specs/quint/application/manifest.json; scripts/storage-specs.ts; test/browser/dev-location.spec.ts, location-settings-recovery.spec.ts; test/support/feature-parity.mjs (exact inventory).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3, 10, 16, 64, 68 | D6/A5 (P8) | Simulation woven into the product plugin: `simulatedCoordinates()`, constructor branch, `simulatedFix()`, simulated watches with setInterval. | Dev entry registers a `SimulatedLocation` subclass/decorator; product class only uses navigator.geolocation. | Medium; dev-location + dev-workflow-triggers specs. |
| 2 | 67 | A4/D5 | `devSurfacesEnabled?'Location is off. Turn it on in device controls.':'... quick settings.'` copy fork. | Product copy only; dev override in dev module. | Low (user-visible product string kept). |
| 3 | 11 | C3 (P5) | `foreground=()=>!document.hidden&&...devBackground!=='true'&&!browserScreenLocked()` = `!noticeActionBlocked()`. | Import shared `foregroundBlocked`. | None. |
| 4 | 43 | B2 | `typeof permission.addEventListener==='function'` — PermissionStatus is an EventTarget in all supported browsers. | Call directly. | Low (old WebViews?) — check Android WebView minimum. |
| 5 | 18, 27 | B1 | `catch{...prompt}` / `catch{/* Browsers without Permissions API */}` specified fallbacks. | Keep. | - |

## Local types and helpers
| Name | Kind (type/interface/helper/const) | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| foreground | helper | 11 | notice-action.ts:2, hosted-results.ts:17, notifications.ts:21, review.ts:10, password-provider.ts:23 | foreground.ts |

## Proposed end state
Product geolocation plugin (~50 lines) with shared foreground helper; simulation in dev/. Estimated lines after: 52 (current 73).

## Verification
dev-location.spec.ts, location-settings-recovery.spec.ts, maps specs using ElizaLocation on web.
