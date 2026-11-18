# apps/app/src/browser/daily.ts
- Lines: 174 | Role: web `DailyApps` plugin: reminders (schedule, list/post, agent operations with receipts, decisions), alarms, deletions, and pass-through file selections. | Verdict: SIMPLIFY
- Importers: 36 (via `../daily` facade and directly: `register.ts`, `clock.ts`, `deletions.ts`, `notifications.ts`, `reminder-deletions.ts`, `development-actions.ts:54` dynamic, many `prototype/*`, `runtime/*`). Text/path pins: `specs/quint/application/manifest.json:1870,2005,2530`, `specs/quint/refinement/application/browser-deletion-poll.mjs`, ~17 browser reminder specs, `test/browser/helpers/canonical-notes.ts`, `test/fixtures/browser-daily-stores.mjs`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 45-49 | C5 | Deletion methods mirror `calendar.ts:274-278`. | Shared `deletionMethods(...)` (see calendar report). | Low |
| 2 | 37, 40, 117 | C3 | `Object.entries(target(data,row)).some(([key,value])=>expected[key]!==value)` three times. | `sameTarget(data,row,expected)`. | None |
| 3 | 144, 161 | C3 | Snooze mutation `row.at=Date.now()+m*60000;row.snoozedAt=Date.now();row.status=await scheduledStatus();delete row.postedAt;row.revision=revision();` twice. | `snoozeAlarm(row,minutes)`. | None |
| 4 | 38 | C1 | `journalBinding?:{scope:string;proposalId:string;operationHash:string}` inline. | `JournalBinding` from `journal-retention.ts`. | None |
| 5 | 25, 76, 107 | C6 | Id regexes `/^[A-Za-z0-9_-]{1,128}$/`, `/^[A-Za-z0-9_-]{1,100}$/`, `/^[a-f0-9]{64}$/` repeated across `calendar.ts`, `deletions.ts`, `development-*`. | Shared constants. | None |
| 6 | 104, 113, 126 | B3 / P6 | `if(document.hidden)throw Error('Return to Alpha…')` three times inside one edit callback; only the check after the last `await` (126) can observe a new state before the write. | Keep the check before the write (and 104 as the early exit); delete 113. | Low |
| 7 | 87-91 | — (efficiency) | `listReminders` calls `notificationsAllowed()` up to three times per poll (each reads the notification document). | Read once and pass through. | Low |
| 8 | 166-172 | D4 | Seven pass-through methods to `BrowserFiles`. They implement the `DailyApps` plugin interface that the native side also exposes. | Keep (interface), or have callers use `AlphaFiles` directly — owner/runtime call. | — |
| 9 | 173 | C3 | Inline HTTP(S) URL check duplicates `browser-surface.ts:12`. | Shared `httpAddress`. | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `State` | type | 16 | `BrowserCalendarState.receipts` shape in `calendar-store.ts:7` | keep; share a `Receipt<T>` type |
| `target()` | helper | 20 | target compare in `deletion-recovery.ts` | keep |
| `operationBinding` | helper | 24-27 | binding JSON in `deletions.ts:20` | keep |
| `decide` | helper | 30-34 | none | keep |

## Proposed end state
~155 lines: shared deletion methods, target compare, snooze helper and id constants; one hidden-check before write; one notification-state read per poll.

## Verification
Quint `browser-deletion-poll`; `test/browser/reminder-*.spec.ts`, `browser-reminder-*.spec.ts`, `dev-clock.spec.ts`, `journey-c-alarms.spec.ts`.
