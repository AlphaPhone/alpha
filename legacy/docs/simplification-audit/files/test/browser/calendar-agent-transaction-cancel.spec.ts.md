# test/browser/calendar-agent-transaction-cancel.spec.ts
- Lines: 19 | Kind: Playwright, chromium (dev), 1 test; module-in-page with monkey-patched `calendarDocument.edit` (s3 r2) | Verdict: DELETE
- Covers: `BrowserCalendar.cancelAgent` after the confirmed review but before commit leaves the stored calendar byte-identical. Duplicates: `calendar-storage-migration.spec.ts:21-30` (cancel while read queued), `calendar-transaction-cancel.spec.ts` (same `edit` patch for presentation dialogs). Callers/importers: chromium only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-11 | T6 / P3 | Replaces `calendarDocument.edit` to hold after `prepare`; drives `executeAgent`/`cancelAgent` directly. Stand-in semantics (P7). | Delete. | Low: agent-cancel-before-commit in the web stand-in loses coverage; native plugin owns it on Android. |

## Proposed end state
File deleted.
