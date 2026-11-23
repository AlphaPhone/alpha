# apps/app/src/browser/calendar-store.ts
- Lines: 36 | Role: the browser calendar document (`alpha.browser.calendar.v1`), its cross-tab broadcast, guarded edit, and source bootstrap. | Verdict: SIMPLIFY
- Importers: 7 (`calendar.ts`, `calendar-recovery.ts`, `calendar-linked-local.ts` (D4), `deleted-note-origins.ts`, `digest-live-sources.ts`, `runtime/calendar-sync-host.ts` (D4), `runtime/legacy-calendar-preservation.ts` (A1)). Text/path pins: `specs/quint/application/manifest.json:1871,2006,3275`, `specs/quint/refinement/application/browser-deletion-poll.mjs`, `specs/quint/refinement/application/calendar-preservation-confirmation.mjs` (A1), ~45 browser specs that import the path via `page.evaluate`, `test/calendar-empty-bootstrap-repro.test.mjs`, `test/fixtures/browser-daily-stores.mjs`, `test/fixtures/calendar-mounted-editor.mjs`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11 | A1 | `new BrowserDomainDocument(browserDocuments,calendarStorageKey,()=>localStorage.getItem(calendarStorageKey))` — legacy `localStorage` reader; nothing writes that key (`git grep localStorage.setItem` in apps: no `alpha.browser.calendar` writer). D1. | Drop the legacy lambda when `domain-document.ts` loses its `legacy` parameter. | Medium (format change is owned by domain-document) |
| 2 | 12-16, 18-34 | C4 / B2 | Observable-document boilerplate (`typeof BroadcastChannel==='undefined'?null:new BroadcastChannel('alpha.browser.documents.v1')`, `onmessage` key filter, pass-throughs, stringify-before/after) — same as `reminder-store.ts`, `preference-documents.ts`, `notification-store.ts`, `development-account-document.ts`. `BroadcastChannel` always exists in supported WebViews. | `observedDocument(key,{event:'alpha:calendar-document-changed',guard:guardPendingCalendarChanges,onChange:…})`. | Low (keep event names) |
| 3 | 22 | A3 | `restore()` is used only by the backup restore in `calendar-recovery.ts:8` (D3). | Delete. | Low |
| 4 | 10 | A7 | `export const calendarStorageKey` — no importer outside the file. | Drop `export`. | None |
| 5 | 36 | B3 | `prepareCalendarSource` re-checks `sourceRevision`/`events` of the document it reads; the storage read is the trust boundary, so a check is legitimate, but `calendar.ts:99` repeats it. | Keep here; drop the repeat in `calendar.ts`. | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `BrowserCalendarState` | type | 7 | `CalendarDeletionState` subset (`calendar-deletions.ts:7`); `State` alias in `calendar.ts:20` | keep here |
| `creations` receipt shape | type | 7 | creation receipts in `runtime/reminder-creations.ts` | keep |
| broadcast/refresh pair | helper | 12-16 | 8 facades (P3) | `observedDocument()` |

## Proposed end state
~20 lines: one `observedDocument` instance with the pending-deletion guard, `prepareCalendarSource`, no restore, no legacy reader. Stored bytes unchanged until `domain-document` changes.

## Verification
Quint `browser-deletion-poll`, all `test/browser/calendar-*.spec.ts` and `dev-calendar-*` specs, `test/browser/dev-calendar-cross-tab.spec.ts`.
