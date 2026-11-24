# apps/app/src/browser/development-digest-occurrence.ts
- Lines: 109 | Role: pure occurrence admission for development digest schedules (latest civil occurrence, DST gaps, missed/settled bookkeeping). | Verdict: SIMPLIFY (dev module)
- Importers: 1 (`development-digests.ts:8`). Text/path pins: `test/digest-occurrence-delivery.test.mjs` (imports and compares the re-exports at :122-123, regex-matches upstream source at :128-129 — T1), `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 24-31 | D4 | `DIGEST_RUN_WINDOW_MS=RUN_WINDOW_MS`, `DIGEST_MISSED_TEXT=MISSED_TEXT`, `DIGEST_UNAVAILABLE_TEXT=DIGEST_PAUSED_TEXT`, and `digestSourceState(...)` that just calls `sharedSourceState`. `DIGEST_RUN_WINDOW_MS` has no app importer. | `development-digests.ts` imports the upstream `hosted-digest-policy` names directly; delete the aliases and wrapper; adjust `test/digest-occurrence-delivery.test.mjs:122-123`. | Low |
| 2 | 16-17, 83-84, 102-103 | A1 | "Absent on documents written before it existed" — fallback when `settledOccurrences` is missing (older documents). D1. | Make `settledOccurrences` required (`[]` on creation in `development-digests.ts:64`) and delete the no-list branches. | Low (dev data) |
| 3 | 34, 36 | C3 | `wall()` (minute wall clock with formatter cache) and `civil()` duplicate `calendar-time.ts` `calendarWall`/`civil`. | Use the shared civil-wall helper. | Low |
| 4 | 13, 22 | A7 | `OccurrenceLoop` exported but unused outside; `Occurrence` exported only for the test. | Drop exports or keep for the test only if the test survives. | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `wall` | helper | 34 | `calendar-time.ts:1` `calendarWall` | `calendar-time.ts` |
| `civil` | helper | 36 | `calendar-time.ts:2` | `calendar-time.ts` |
| `OccurrenceLoop` | type | 13 | `DevelopmentDigestLoop` (`development-digest-document.ts:8`) | single type |

## Proposed end state
~85 lines in `dev/`: no alias re-exports, no pre-list compatibility branches, shared wall-clock helper.

## Verification
`test/digest-occurrence-delivery.test.mjs`, `test/browser/dev-digest-schedule.spec.ts`, `journey-d-digests.spec.ts`.
