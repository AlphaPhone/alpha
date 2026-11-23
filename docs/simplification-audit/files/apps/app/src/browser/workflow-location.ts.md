# apps/app/src/browser/workflow-location.ts
- Lines: 23 | Role: dev workflow simulator — one-shot "away from Home?" location condition using the location simulation config and saved places | Verdict: SIMPLIFY
- Importers: 1 — `browser/simulated-workflows.ts:7` (dev-only; stubbed `simulated-apps`). Text/path pins: `test/browser/dev-location.spec.ts`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8 | A4 / research P8 | `throw Error(devSurfacesEnabled?'Choose a saved Home place in Device controls → Location.':'Save a Home place in Maps saved places…')` — the module is reachable only when `devSurfacesEnabled` is true (installSimulatedWorkflows returns early otherwise, `simulated-workflows.ts:23`), so the second string is dead | Keep only the dev string; drop the `devSurfacesEnabled` import | none |
| 2 | 12-15 | C4 | retire-event list `['launcher-home','alpha:device-state','pagehide','alpha:dev-incoming-call']` + visibilitychange add/remove — the same owned-operation lifecycle as `notice-action.ts:4-9 beginNoticeAction` | use `beginNoticeAction()`-style shared lifecycle | low |
| 3 | 15 | C3 | `document.hidden||document.documentElement.dataset.devBackground==='true'` (13 bare devBackground checks in browser/) | `foregroundBlocked()` | none |
| 4 | 7, 18-19 | B3 / P6 | Home+radius snapshot compared before and after the fix — intended race fence in a dev fixture | keep (it produces a user message), no change | — |
| 5 | 13, 20-22 | — | twin of `workflow-trigger-runtime.ts:55` inside/outside/unknown radius test (`distance+accuracy<=radius?true:distance-accuracy>radius?false:null`) | one `placeSide(position,place,radius)` helper beside `maps/route-distance.ts` | low |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| radius side test | helper (inline) | 20-21 | workflow-trigger-runtime.ts:55 | `maps/route-distance.ts` |

## Proposed end state
~21 lines, no build-flag import, shared lifecycle and side helper.

## Verification
`test/browser/dev-location.spec.ts` (asserts the Device-controls copy).
