# apps/app/src/browser/deletion-recovery.ts
- Lines: 22 | Role: pure reconstruction of an agent deletion's journal outcome from the saved calendar/reminder deletion entry. | Verdict: KEEP
- Importers: 1 (`browser/deletions.ts:2`). Text/path pins: `specs/quint/application/manifest.json:2535`, `specs/quint/refinement/application/browser-reminder-orphan.mjs`, `test/browser-deletion-recovery.test.mjs`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7 | C3 | Owner key `'agent:'+JSON.stringify([r.origin,r.ownerId,r.agentId,r.sessionId,r.installationId,r.enrollmentId])` — one of many session-identity tuples (research a–m §4). Must match the writer `runtime/deletion-owner.ts`. | Export the owner-key builder from `runtime/deletion-owner.ts` and call it here. | Low |
| 2 | 6 | C1 | Journal binding compare uses the inline `journalBinding` type. | `JournalBinding`. | None |
| 3 | 15, 18 | C6 | `'browser-reminders'`, `'local'` source ids repeated (also `daily.ts`, `calendar.ts`). | Export source-id constants. | None |

## Local types and helpers
None new.

## Proposed end state
22 lines; owner key from one builder.

## Verification
`test/browser-deletion-recovery.test.mjs`, Quint `browser-reminder-orphan`.
