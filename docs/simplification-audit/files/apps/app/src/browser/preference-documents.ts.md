# apps/app/src/browser/preference-documents.ts
- Lines: 27 | Role: generic observed-document factory + seven preference documents | Verdict: SIMPLIFY (generalise into the shared observedDocument)
- Importers: 10 (browser-surface, clock, device-preferences, device, password-provider, preference-recovery, prototype/browser-adapter, prototype/browser-camera, prototype/camera-adapter, prototype/settings-adapter). Text/path pins: specs/quint/application/manifest.json; refinement bookmarks-hydration.mjs, browser-album-storage.mjs, google-access-publication.mjs; test/browser-camera-storage.test.mjs, test/calendar-connect-policy.test.mjs; ~22 browser specs import it; test/support/feature-parity.mjs (exact inventory).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-17 | C4 (P3) | This is the best instance of the observable-document facade; calendar-store, reminder-store, notification-store, hosted-results, workflow-notices, digest-authorization-document, development-account-document each re-implement it. | Export `observedDocument(key,{event,guard?})` (guard = reminder-store's guardPendingReminderChanges hook) and use it in all 8. | Medium: event names are a cross-module contract; keep them. |
| 2 | 3 | B2 | `typeof BroadcastChannel==='undefined'?null:` guard. | Construct unconditionally. | None. |
| 3 | 7 | A1 | `()=>localStorage.getItem(key)` legacy reader per document. | Drop with envelope. | Coordinated with domain-document.ts. |
| 4 | 6 | D11 | Local function named `document` shadows the global `document`. | Rename `observedDocument`. | None. |

## Local types and helpers
| Name | Kind (type/interface/helper/const) | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| document() | helper | 6-17 | calendar-store.ts:11-34, reminder-store.ts:6-28, notification-store.ts:13-39, hosted-results.ts:12-26, workflow-notices.ts:7-9, digest-authorization-document.ts:6-28, development-account-document.ts:11-36 | export here as observedDocument |

## Proposed end state
Exports observedDocument + the seven documents (and their keys). No legacy reader. Estimated lines after: 26 (current 27).

## Verification
preference-storage-migration.spec.ts (A1 deletion candidate), album-storage-migration.spec.ts, browser-signins.spec.ts, bookmarks-hydration Quint harness.
