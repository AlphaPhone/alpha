# specs/quint/refinement/application/reminder-open-intent.md
- Lines: 27 | Kind: harness narrative note | Verdict: DELETE (fold the bounds sentence into `ReminderOpenIntent.qnt`)
- Covers: prose on the reminder open intent, a past bug at baseline `0ec439ae4c`, and model bounds. Duplicates: `reminder-open-intent.mjs:100-102` assumptions. Callers/importers: none outside `docs/`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-3 | D11 | Titled "Legacy reminder open intent" / "An older reminder link". The path is live: the `reminderOpened` native listener and the Workflows device-reminder row (`automations-adapter.ts:148`, `owner.refreshReminders(row.id, occurrenceId)`) both use it. The "legacy" wording would mislead a D1 deletion pass. | Delete the note; do not treat the path as a legacy reader. | Low |
| 2 | 5-14 | A8 | Baseline-hash bug narrative. | Delete. | None |

## Proposed end state
File deleted; model header says "reminder open intent (native reminderOpened and Workflows device-reminder row)".
