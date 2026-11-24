# test/browser/dev-calendar-assistant.spec.ts
- Lines: 122 | Kind: Playwright journey (chat → device-action proposal → review dialog → journal → receipt) over an inline bridge emulating a **paired local development agent**, chromium dev build | Verdict: **REWRITE** as the "assistant Calendar action" cases of `journeys/calendar.spec.ts` (merged with `dev-calendar-recurring-assistant.spec.ts`)
- Covers: with Calendar open, asking the assistant produces a `device_action` proposal (create, read/share, update, delete, or cancelled create); the selected event's private description is not sent to the agent; the review dialog shows what will change; Confirm applies it through the action journal and uploads one receipt; delete is queued with a 10-second Undo and finalised; results survive reload. Duplicates: `dev-calendar-recurring-assistant.spec.ts` (fixture lines 12-78 are verbatim the same), `calendar-proposal-review.production.spec.ts`, `calendar-agent-all-day-review.spec.ts`, `calendar-approval-queue.spec.ts`. Callers/importers: none. 5 tests.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 46-47, 80-86 | A3 (C4) | Connects through the "Local development agent" pairing form (`/api/auth/pair`, pairing code). The paired remote/local connection is deleted product-side (C4, D5). | Run on the resident: `harness/plugins/agent.ts` answers `/api/client-devices/*` and conversation POSTs. | Medium: the spec stops working when C4 lands. |
| 2 | 3, 101 | P15 | Imports `apps/app/src/runtime/device-record-presentation.ts` into the Playwright process to compute the card title. | Hard-code the expected visible title. | none |
| 3 | 98, 108, 110, 113, 120 | P2 | Reads `calendarDocument.readRaw()` (browser stand-in store) to check results. | Assert in the Calendar list/detail view after reload. | Low. |
| 4 | 12-78 | P6 / C5 | 66-line inline bridge duplicated verbatim in the recurring spec. | Agent plugin options `proposal(operation)`, `journal` recorder. | none |
| 5 | 111 | P2 | Calls `Capacitor.nativePromise('AlphaActionJournal','recoverDeletion')` directly. | Reload and assert the receipt row in Activity. | Low. |
| 6 | 14 | B4 | `localStorage.getItem(...)===null&&localStorage.setItem(...)` inside an `if(!localStorage.getItem(...))`. | Seed through the harness. | none |
| 7 | — | P7 | The review dialog and execution are the browser `AlphaCalendar` stand-in (`browser/calendar.ts executeAgent`); the proposal, journal and receipt orchestration are product renderer code. | Keep the journey, accept the stand-in for the native calendar execution. | Medium (owner question in chunk summary). |

## Proposed end state
In `journeys/calendar.spec.ts`, one parametrised "assistant Calendar action" case table: create-confirm, create-cancel, update, delete-with-Undo, share (read), on the resident harness, asserting the visible review, the private-description redaction in the recorded request, the visible result after reload, and one receipt upload.
