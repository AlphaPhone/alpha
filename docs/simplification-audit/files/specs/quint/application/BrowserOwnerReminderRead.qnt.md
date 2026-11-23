# specs/quint/application/BrowserOwnerReminderRead.qnt
- Lines: 104 | Kind: Quint model (live, 4 runs) | Verdict: MERGE into `BrowserOwnerReminder.qnt` (with `BrowserOwnerReminderAction.qnt`)
- Covers: passive owner-reminder reads in the browser port: one transport in flight, owner replacement waits for the retired transport, 5 s cache boundary, 24-read pause, closing the shade discards late replies, busy/privacy retire publication. Duplicates: same product file and gating as `BrowserOwnerReminderAction`. Callers/importers: manifest (same three sources); harness `browser-owner-reminder-read.mjs` (190 lines, `bundledSource`, also lists `apps/app/src/main.tsx` as a captured input); `test/quint-browser-owner-reminder-read.test.mjs` **and** aggregate (index.mjs:79).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | C5 | See `BrowserOwnerReminderAction.qnt.md` #1. | Merge. | Low |
| 2 | harness | B5 | Harness captures `apps/app/src/main.tsx` as an input although it only uses it to assert where the port is bound. | Drop the `main.tsx` capture; a host check of `main.tsx` wiring is a source-text assertion (T1). | Low |
| 3 | wrappers | T4 | Per-model + aggregate. | Per-model only. | None |

## Proposed end state
Merged into `BrowserOwnerReminder.qnt`; this file and its separate harness/wrapper are deleted.
