# apps/app/src/browser/notification-store.ts
- Lines: 49 | Role: notification policy document (alpha.browser.notifications.v2) with validation, cross-tab broadcast and lock-guarded init | Verdict: SIMPLIFY
- Importers: 5 (daily.ts, notification-recovery.ts, notifications.ts, workflow-focus.ts, prototype/settings-adapter.ts). Text/path pins: specs/quint/application/manifest.json; test/browser/notification-storage-migration.spec.ts (tests v1 import) + 7 notification specs; test/support/feature-parity.mjs (exact inventory).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-11 | A1 | `legacy=()=>localStorage.getItem(notificationStorageKey)??localStorage.getItem('alpha.browser.notification-policy.v1')` — no writer of either key (git grep: only this line and the migration spec). | Delete legacy reader. | Delete notification-storage-migration.spec.ts with it. |
| 2 | 13-15 | C4 (P3) | Own BroadcastChannel facade, `typeof BroadcastChannel` guard (B2). | observedDocument(key,{event:'alpha:notifications-document-changed'}). | Low. |
| 3 | 16-20 | B2/A1 | `navigator.locks?...:read()` — Web Locks guard; lock exists to serialise legacy import/initialisation. | After A1 initialisation is a plain readOrCreate; drop the lock. If kept, call navigator.locks unconditionally. | Medium: multi-tab init specs. |
| 4 | 5-7 | C1 | `Selection`, `History`, `DeviceEvent` declared here and again in notifications.ts:17-19. | Export from here; notifications.ts imports. | None. |
| 5 | 9 | A7 | `export notificationStorageKey` — no importer outside file. | Unexport. | None. |
| 6 | 22-29 | B3 (P7) | Validator + normalisation of data this module writes; `notificationState` (43-48) then compares every key to decide whether to persist "authority". | Validate on read only; initial state written once on create. | Medium. |

## Local types and helpers
| Name | Kind (type/interface/helper/const) | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| Selection | type | 5 | notifications.ts:19 | here (export) |
| DeviceEvent | type | 7 | notifications.ts:18 | here (export) |
| initialize | helper | 18-20 | none | delete after A1 |

## Proposed end state
~25 lines: observed document, exported types, read-validate, edit; no legacy, no init lock. Estimated lines after: 26 (current 49).

## Verification
dev-notifications.spec.ts, notification-action-lifecycle.spec.ts, reminder-notification-dismissal.spec.ts, workflow-notices.spec.ts.
