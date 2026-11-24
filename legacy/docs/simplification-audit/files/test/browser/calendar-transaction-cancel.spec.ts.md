# test/browser/calendar-transaction-cancel.spec.ts
- Lines: 30 | Kind: Playwright, chromium (dev), 1 test × 2 (`event`/`response`); opens stand-in dialogs by module call and patches `calendarDocument.edit` (s4 r5) | Verdict: DELETE
- Covers: Cancel in the web modal editor or guest-response dialog after preparation, before commit, returns `cancelled` and leaves the stored event unchanged. Duplicates: `calendar-storage-migration.spec.ts:40-51` (dismiss aborts write, same two dialogs), `calendar-agent-transaction-cancel.spec.ts` (same `edit` patch). Callers/importers: chromium only; imports `calendar-draft-readiness.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-12 | T6 / P7 | `calendar.edit(...)` / `calendar.editResponse(...)` called directly to open the web stand-in's dialogs. | Delete. | Low |
| 2 | 14-20 | P3 | `calendarDocument.edit` replaced to hold after `prepare`. | n/a | None |

## Proposed end state
File deleted.
