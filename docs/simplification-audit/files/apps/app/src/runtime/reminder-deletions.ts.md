# apps/app/src/runtime/reminder-deletions.ts
- Lines: 17 | Role: binds the shared reminder action journal (cancel/complete/snooze/edit receipts) to slot `reminder-deletions:v1:device` and its browser document. | Verdict: SIMPLIFY (rename; MERGE into `reminders/`)
- Importers: `browser/daily.ts:3`, `browser/deleted-note-origins.ts:5`, `browser/deletion-recovery.ts:3`, `browser/reminder-store.ts:1`, `prototype/reminder-adapter.ts:9`.
- Text/path pins: Quint `reminder-adapter-fixture.mjs:28`, application/native manifests (note: `browser-deletion-poll.mjs`, `browser-journal-retention.mjs`, `browser-reminder-orphan.mjs` name `browser/reminder-deletions.ts`, a different file); tests `reminder-deletions.test.mjs`, `quint-reminder-decision`, `quint-reminder-intents`; browser specs `browser-reminder-edit-recovery`, `reminder-action-storage`, `reminder-decision-review`, `reminder-delete-review`, `reminder-timing-review`; `feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | — | D11 | file and exports say "deletion" but hold every pending reminder action (L4, L6). A `browser/reminder-deletions.ts` also exists. | Rename to `reminders/action-journal.ts`; keep the slot string `reminder-deletions:v1:device` exactly. | Low (many path pins) |
| 2 | 5 | A7 | `PendingReminderDeletion=PendingReminderAction` alias: 0 users. | Delete. | None |
| 3 | 11-17 | D4 | five renamed aliases of journal methods. | Export the journal. | Low |

## Local types and helpers
None beyond the alias.

## Proposed end state
~8 lines in `reminders/`, exporting `reminderActionJournal`.

## Verification
`test/reminder-deletions.test.mjs`, Quint reminder decision/intents tests, the reminder browser specs listed.
