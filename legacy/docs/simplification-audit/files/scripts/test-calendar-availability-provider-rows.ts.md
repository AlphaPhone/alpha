# scripts/test-calendar-availability-provider-rows.ts
- Lines: 21 | Kind: integration (JVM reader output JSON -> real renderer parser -> shared contract computation) | Verdict: MERGE into `test/calendar-availability-reader.test.mjs` (import the two functions and loop in-process)
- Covers: rows produced by the Android free/busy reader (run on the JVM) yield the expected shared busy/free answer with no titles or names. Duplicates: none (it is the join of the two halves). Callers/importers: `test/calendar-availability-reader.test.mjs` spawns it with a temp `cases.json` path.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | T9 | Separate script spawned with `--import tsx` and an argv path just to run a 6-line loop; the caller already holds `cases` in memory. | Inline the loop in the caller; import `parseAvailabilityEvents` and `calendarAvailability`. | L |
| 2 | 13 | B5 | `cases.length>=30` exact-count floor on the fixture. | Keep a non-empty check only. | L |

## Proposed end state
File deleted; the JVM reader test parses stdout and asserts every case in-process.
