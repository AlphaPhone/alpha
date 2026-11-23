# specs/quint/refinement/native/reminder-delivery-platform.mjs
- Lines: 277 | Kind: Android stub set for the reminder harness (no product text read) | Verdict: KEEP content; MERGE generic classes into a shared Android stub library
- Covers: Controlled `AlarmManager`, immutable `PendingIntent` registry, `NotificationManager` with channel blocking, `SharedPreferences` with separate memory/disk and refused/ambiguous commits, boot count, secure store. Duplicates: `Intent`, `Uri`, `Context`, `PendingIntent`, `SharedPreferences` also in other `*-platform.mjs`. Callers/importers: only `native/reminder-delivery.mjs:11`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2-277 | C5 | Generic Android classes duplicated; the preference memory/disk split and alarm/notification observers are reminder-specific and valuable. | Shared stub library for the generic classes; keep the durable-preference and alarm ports here. | Medium |
| 2 | 2 | C5 | Exports a plain object while every other platform exports a temp-dir factory with `close()`. | Use the shared `writeStubs` helper so all platforms look alike. | None |

## Proposed end state
Reminder-specific ports only (alarms, preferences with commit faults, boot count), ~150 lines, on the shared stub set.
