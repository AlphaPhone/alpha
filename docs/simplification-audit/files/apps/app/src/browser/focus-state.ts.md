# apps/app/src/browser/focus-state.ts
- Lines: 22 | Role: dev: reads simulated workflow focus blocks from alpha.dev.app.workflows to drive DND/notice holding | Verdict: SIMPLIFY + MOVE to apps/app/src/dev/
- Importers: 4 (device.ts, notifications.ts, simulated-workflows.ts, workflow-focus.ts). Text/path pins: inventory only; test/support/feature-parity.mjs (exact inventory).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2 | C1 | `type Bag=Record<string,any>` (one of 15 in browser/). | Import shared Bag or type the run. | None. |
| 2 | 7 | A7 | `activeFocusBlocks` exported but only used in this file (git grep -w: 0 elsewhere). | Unexport. | None. |
| 3 | 5 | C3 | `focusChanged` dispatches `alpha:device-settings`+`focus` — same pair in device.ts and device-preferences.ts:17. | One `deviceSettingsChanged()` helper in device-preferences.ts. | None. |
| 4 | 8, 10-18 | D5/B1 | Product notifications/device import a dev module that returns [] unless browserDevProfile; `catch{return []}` swallows corrupt store. | Product code asks an injected focus provider (default: none); dev registers this module. | Medium (DND behaviour in dev specs). |

## Local types and helpers
| Name | Kind (type/interface/helper/const) | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| focusChanged | helper | 5 | device-preferences.ts:17 changed(), device.ts:52,56 | device-preferences.ts |

## Proposed end state
Dev module registered as a focus provider; product device/notifications call `focusProvider.active()` defaulting to false. Estimated lines after: 18 (current 22).

## Verification
test/browser/dev-workflow-focus.spec.ts, dev-notifications.spec.ts.
