# test/google-calendar-link-status.test.mjs
- Lines: 66 | Kind: integration (real `AgentCalendar`, real `assertAppRecordRequestAllowed`, bundled real `linkGoogleCalendar`; synthetic agent port) | Verdict: MERGE into `test/integration/calendar-google.test.mjs`
- Covers: for an already active sync, "Sync on" only when the background dispatch moves between two readbacks, "Waiting" when it does not, and "Synced" only when no linked event on the destination is conflicted or quarantined ("N held"; unreadable links are "Unconfirmed"). Duplicates: `google-calendar-connect.test.mjs` part A (same harness shape; its "dispatch the resume started reads Sync on" case overlaps). Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-11 | C5 | Third copy of the `google-accounts.ts` esbuild bundle. | Share one in the merged file. | none |
| 2 | 23-33 | C5 | A second, read-only sync-control double. | Use the merged file's double with a read-only mode. | none |
| 3 | 40-66 | — | Four distinct status rules; all worth keeping. | Carry all four. | none |

## Proposed end state
Four cases in the merged Calendar/Google integration file, on the shared agent-port double.
