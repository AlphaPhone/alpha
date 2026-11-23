# test/browser/reminder-notice-taps.spec.ts
- Lines: 99 | Kind: Playwright, chromium, real Calendar/Home UI with an inline 45-line Capacitor bridge (`DailyApps.pendingReminderTap/consumeReminderTap/dismissReminderTap`, secure slots); 10 generated modes | Verdict: **MERGE** into `journeys/notifications.spec.ts` (reminder tap section)
- Covers: a durable reminder notification tap opens the exact saved reminder once and is consumed; a stale tap offers "Dismiss saved reminder link" and falls back to an older valid tap; read failures keep the tap and offer "Open saved reminder notification" (also after reload); a tap arriving during a Calendar draft or navigation to Home does not destroy the draft or hijack the view; a queue change mid-read is re-checked; consume failure still shows the reminder but keeps the tap; with no connection choice, closing the chooser still opens the tap (P-43). Duplicates: `reminder-notice-question.spec.ts` uses the same tap plumbing via `delivery-fixture`; Android delivery is instrumentation. Callers/importers: imports `helpers/browser-calendar`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-49 | C3 / T7 | Inline bridge duplicating secure-slot and headers code found in ~49 specs. | Move the reminder-tap queue to `harness/plugins/notifications.ts` (or the `DailyApps` plugin fixture); share the secure-slot store. | Low |
| 2 | 5 | – | All ten modes are distinct user-visible safety rules; none sleeps. | Carry all ten, table-driven, in the notifications journey. | none |
| 3 | 25 | – | `surfaceInfo` reports `developmentBuild:true`; confirm the production behaviour is the same, or add the `recover` case to the production project. | Owner/implementer check. | Low |

## Proposed end state
A "reminder notification taps" describe in `journeys/notifications.spec.ts` with the ten modes over a shared `DailyApps` tap
fixture. File deleted.
