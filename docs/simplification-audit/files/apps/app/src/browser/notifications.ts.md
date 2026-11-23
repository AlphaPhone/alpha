# apps/app/src/browser/notifications.ts
- Lines: 239 | Role: web AlphaNotifications plugin: own/calendar/external/workflow/hosted notice listing, actions, cross-app policy and dev event composer | Verdict: SPLIT
- Importers: 2 (clock.ts, register.ts). Text/path pins: LemmaScript-files.txt (noticeRoute, retainDismissed); specs/quint/application/manifest.json; refinement boundaries.mjs; test/browser-notification-clear.test.mjs (slices source, T2); test/gesture-zones-single-instance.test.mjs (reads source); 5 browser specs; test/support/feature-parity.mjs (exact inventory).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 17-19 | C1 | `Notice`, `DeviceEvent`, `Selection` re-declared (notification-store.ts:5-7). | Import from notification-store.ts. | None. |
| 2 | 16 | D4 | `const apps=browserApps` alias. | Use browserApps. | None. |
| 3 | 21 | C3 (P5) | `locked` duplicates notice-action.ts `noticeActionBlocked` (which this file already imports as `notificationAction`). | Import foregroundBlocked. | None. |
| 4 | 2 | D11 | `beginNoticeAction as notificationAction` rename alias. | Import by its name. | None. |
| 5 | 194-211 | D12/C4 | `show()` injects a 12-rule `<style>` into every dialog and copies 5 theme tokens. | Move rules to a CSS file imported once; dialog kit for lifecycle/theme. | Low; layout specs. |
| 6 | 88-103, 192-193, 212-224 | A5/D6 | Device-event injection (`inject`, `deviceEvents`, `removeDeviceEvent`, `compose`) is only reachable from dev controls (device-controls.tsx:46) and specs. | Move the composer to dev/; keep inject/deviceEvents only if the product cross-app path needs them (browser has no external apps in product: apps.ts filters to dev profile). | Medium: dev-notifications, notification-action-lifecycle specs inject events. |
| 7 | 219 | B4 | `status.textContent=result.collected?'Posted':'Posted'` — both branches identical. | `status.textContent='Posted'`. | None. |
| 8 | 225-238 | A4/D5 | `controls()` dialogs and `openNotificationAccess` etc. only open in testMocks builds; product delegates to AlphaDevice.openSettings. | Move test-mocks dialogs to dev/. | Low. |
| 9 | 230, 237, 238 | C2 | `registerPlugin<{openSettings...}>('AlphaDevice')` typed inline 3×. | Typed AlphaDevice module. | None. |
| 10 | 132 | D8 | `open()` is a 700-char one-liner with 7 branches; `dismiss()` (133-148) is the formatted twin. | Route via `noticeRoute()` switch like `clear()` does. | Low. |
| 11 | 161, 173, 179, 186 | B1 | `catch{/* ... */}` — per-row outcome stays unavailable; specified. | Keep. | - |

## Local types and helpers
| Name | Kind (type/interface/helper/const) | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| Notice/DeviceEvent/Selection | type | 17-19 | notification-store.ts:5-7 | notification-store.ts |
| Identity | type | 20 | none | stay |
| locked | helper | 21 | notice-action.ts:2 etc. | foreground.ts |
| trim/record/noticePolicy | helper | 22-23,56 | none | stay |

## Proposed end state
Product plugin (~150 lines): listing, open/dismiss/clear routed by noticeRoute, policy methods; dev composer + test-mocks controls in dev/notification-composer.ts; styles in CSS. Estimated lines after: 150 (current 239).

## Verification
LemmaScript (noticeRoute/retainDismissed), test/browser-notification-clear.test.mjs (rewrite, T2), dev-notifications.spec.ts, reminder-notification-dismissal.spec.ts, context-selection.spec.ts, workflow-notice-lifecycle.spec.ts.
