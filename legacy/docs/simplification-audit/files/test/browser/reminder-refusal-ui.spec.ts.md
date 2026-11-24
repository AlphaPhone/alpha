# test/browser/reminder-refusal-ui.spec.ts
- Lines: 28 | Kind: Playwright, chromium, real Calendar New event → Reminders → Save, refusal injected by patching `BrowserDaily.prototype.scheduleReminder`; expected text computed by importing `reminderRefusalMessage` from product code; 4 generated tests × 3 saves | Verdict: **MERGE** into `journeys/reminders.spec.ts` (create section)
- Covers: a definite native refusal (storage full, past, permission denied, failed) shows its reason, leaves nothing pending, keeps the draft open and Save enabled, and never offers "Check new reminder status". Duplicates: `reminder-lifecycle.spec.ts` test 1 (module-level); refusal copy in `test/reminder-lifecycle-pure.test.mjs`. Callers/importers: imports `helpers/browser-calendar`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 13-15 | T6 | The expected message is computed with the product's own `reminderRefusalMessage`, so a wrong message passes. | Hard-code the four expected strings. | none |
| 2 | 23 | T6 | Pending count read through `reminderCreations()`. | Assert absence of "Check new reminder status" and of an Unconfirmed chip (already done at line 27). | none |
| 3 | 18 | – | Three save attempts per status; two prove retirement. | Two attempts. | none |

## Proposed end state
A "refused creation" step in the reminders journey, looping over the four statuses with literal expected text, refusal injected at
the `DailyApps` bridge fixture.
