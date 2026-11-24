# test/browser-journal-retention.test.mjs
- Lines: 167 | Kind: integration (real `browser/calendar.ts`, `daily.ts`, stores and journal retention bundled by `test/fixtures/browser-daily-stores.mjs` over an in-memory Documents port) | Verdict: MERGE into `test/integration/calendar-reminders.test.mjs`
- Covers: Calendar creation/receipt/deletion journals and Reminder receipt/deletion journals stay bounded (201 receipts, 128 claims) under long runs, never drop unacknowledged rows, refuse at the cap without writing, accept prototype-named ids (`__proto__`, `constructor`) as own keys, and reads do not write. Duplicates (partial): `specs/quint/refinement/application/browser-journal-retention.mjs` replays the retention model over `journal-retention.ts` with the same fixture (pure retention traces, not the store paths). `test/quint-browser-journal-retention-refinement.test.mjs` wraps that harness. Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-16, 32-43, 122-131, 133-145, 155-167 | runtime | Loops of 1001, 501, 260, 700 and 501 operations: the slowest part of this area's non-Quint host suite (several seconds). Bounds are 200/128, so 260/300 iterations prove the same. | Reduce loop counts to bound+60 when merging. | low |
| 2 | 15, 23, 128 | P8 | Exact counts (`201`, `200`) pin the retention constant. Acceptable as the specified bound, but derive from the exported limit instead of literals. | Import the bound from `journal-retention.ts`. | low |
| 3 | 147-153 | A1 | "oversized reminder journal from before retention": data shape from an older build; the package starts with empty data (D1). | Drop this case; keep line 18-30 (same pruning through a normal path). | low |
| 4 | 45-61, 88-120 | — | Prototype-pollution cases (`__proto__`, `constructor`, inherited `acknowledged`): real security-relevant behaviour, not reachable from a journey. | Carry. | none |
| 5 | 7 | T8 | `t.mock.method(performance,'now')` fake clock is fine (no real timers raced). | Keep. | none |

## Proposed end state
Merged into the Calendar/Reminders integration file, cases carried:
1. creations beyond the bound keep saving, journal stays at the bound (smaller loop);
2. pruning never drops an unacknowledged creation; at the unacknowledged cap the save is refused and writes nothing;
3. agent deletions queue and settle, claims follow kept deletions, a recent replay is recognised (`unknown`);
4. claims for absent deletions are dropped even under inherited keys;
5. prototype-named operation ids persist as own entries (Calendar + Reminders) and replays do not write;
6. inherited creation receipt cannot be acknowledged;
7. reads (`calendar_read_next`, `reminder_read_selected`) write nothing;
8. reminder deletions write only after the Undo window.
`test/fixtures/browser-daily-stores.mjs` survives (also imported by `browser-calendar-series`, `browser-clock`, `photo-library` tests and three Quint harnesses).
