# test/reminder-open-intent.test.mjs
- Lines: 72 | Kind: transplant scenarios (fixture) + Quint wrapper | Verdict: MERGE replay into `test/quint/refinement.test.mjs`; DELETE scenarios
- Covers: A tapped reminder notification opens that reminder within 30 s, not after the window, not in the background, not after the user navigated elsewhere; Workflows device row starts its refresh before Calendar commits. Duplicates: Replay: `test/quint-application-refinement.test.mjs` (aggregate over `specs/quint/refinement/application/index.mjs`) (`checkReminderOpenIntent`). Scenarios use `test/fixtures/reminder-open-intent.mjs` (marker slices of `automations-adapter.ts`/`reminder-creations.ts`, test-35 verdict PORT). Same fixture feeds the Quint driver. Callers/importers: npm test (`scripts/run-node-tests.ts` glob `test/*.test.mjs`), so `npm run verify` and the `browser.yml` verify job.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-67 | T2 | Eight scenarios on a transplanted adapter. | Delete after confirming each is a ReminderOpenIntent scenario (30 s window, background, intervening navigation, Workflows row ordering). Keep one visible journey step in `journeys/reminders.spec.ts`: tap notification → Calendar opens the reminder. | Medium |
| 2 | 69-72 | T4 | Wrapper of an aggregate campaign; the title says "legacy reminder adapter". | Runner row. | Low |

## Proposed end state
- Runner row; one journey step; fixture ported per test-35.
