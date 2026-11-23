# apps/app/src/runtime/home-calendar-selection.ts
- Lines: 121 | Role: picks the Home Calendar card's event (today, else this week, else this month) from the displayed agent Calendar feed and decides when "Nothing planned" is verified. | Verdict: KEEP (minor SIMPLIFY)
- Importers: 1 (`prototype/agent-calendar-adapter.ts`). Text/path pins: `specs/quint/application/manifest.json` (Calendar sources), `test/home-calendar-selection.test.mjs` (source text), `test/home-cards.test.mjs` (source text), `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | D8 | Only runtime file formatted with 4-space Prettier style; neighbours are dense 1-space. | Settled by the repo-wide formatter commit. | None |
| 2 | 109-120 | D9 | Final return mixes coverage checks with an inline IIFE `(() => { const x = getZonedDateParts(...); return x.hour === 0 && … })()`. | Extract `startsAtLocalMidnight(iso)` and `coversWeekAndMonth(feed)` predicates. | None |
| 3 | 1 | D13 | Deep `.eliza/.../plugin-calendar/src/internal/time` import of an upstream *internal* module. | Ask upstream to export `getZonedDateParts` publicly; use the alias. | Low |
| 4 | 14 | — | `quiet` object literal created per call. | Fine. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `day` | helper | 29-34 | civil-day helpers in `prototype/calendar-days.ts` | stay (different zone semantics) |
| `matchesSourceIdentity` | helper | 35-44 | source/event identity matching in `agent-calendar.ts` (`calendarSourceKey`) | consider `agent-calendar.ts` export |

## Proposed end state
Same algorithm and outputs with two named predicates. ~115 lines.

## Verification
`test/home-calendar-selection.test.mjs`, `test/home-cards.test.mjs` (both read text: keep the exported name), Home journeys in `test/browser/home-*.spec.ts`.
