# specs/quint/application/BrowserOwnerReminderAction.qnt
- Lines: 136 | Kind: Quint model (live, 4 runs) | Verdict: MERGE with `BrowserOwnerReminderRead.qnt` into `BrowserOwnerReminder.qnt`
- Covers: explicit mark-read/open of an owner-reminder notification in the browser build: fresh read and two policy checks before the mutation, lost acknowledgement leaves an "unconfirmed" block until a readback, owner replacement retires late replies, the open callback uses the current UI. Duplicates: shares owner/privacy/shade gating and the same 90-line product file with `BrowserOwnerReminderRead`. Callers/importers: manifest (sources `runtime/owner-reminder-notification-port.ts`, `-protocol.ts`, `abort-signal.ts`); harness `browser-owner-reminder-action.mjs` (276 lines) bundles the real `OwnerReminderNotificationPort` (`bundledSource`, good); `test/quint-browser-owner-reminder-action.test.mjs` **and** aggregate (index.mjs:80).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | C5 / §2.11 | Two models (Action 136 + Read 104 lines), two harnesses (276 + 190), two wrappers, for one class bound only when `!Capacitor.isNativePlatform()` (`main.tsx:95`). `visible(x) = privacy and shade` and the owner-change reset are written twice. | One module `BrowserOwnerReminder` with both state groups, one harness file sharing the bundled port and fixture, one wrapper. Keep all 8 runs. | Low; lowers the application floor in `test/quint-checker.test.mjs` by one. |
| 2 | — | D6 | The modelled port runs only in the web (non-native) build. | Kept per D6/D19 while the Playwright suite drives it; see chunk owner question on formal effort for web-only twins. | — |
| 3 | wrappers | T4 | Per-model + aggregate. | Per-model only. | None |

## Proposed end state
`specs/quint/application/BrowserOwnerReminder.qnt` (~210 lines) holding both read and action transitions over one shared owner/visibility state; one harness `browser-owner-reminder.mjs`; one manifest entry; one test wrapper.
