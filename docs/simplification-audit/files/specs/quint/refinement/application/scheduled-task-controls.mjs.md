# specs/quint/refinement/application/scheduled-task-controls.mjs
- Lines: 126 | Kind: Quint refinement harness over an **import-based** fixture (`test/fixtures/scheduled-task-controls.mjs` bundles the real `automations-adapter.ts` + `automations-route-policy.ts` with esbuild and 11 port modules) | Verdict: KEEP; MOVE the fixture next to the harness; delete the duplicate direct test
- Covers: Workflows scheduled-task controls — preset edit keeps weekday pattern and zone, chosen days bound to the confirmed edit, custom cron keeps its trigger, invalid time sends nothing, receipt mismatches lock until explicit release without replay, fire result classes (missing/wrong id, raced, skipped, deferred, failed, transport lost), terminal manual task offers Reopen, failed schedule source blocks controls, previous-owner reply cannot acknowledge, leaving clears edit, Snooze intent (live model `ScheduledTaskControls.qnt`, manifest ~l.642). Duplicates: `test/scheduled-task-controls.test.mjs` re-drives the same fixture for wrong-id/missing-id/wrong-skipped-id, terminal manual Reopen and missing-schedule cases — all are scenarios here (T4). Callers/importers: `index.mjs:61`, `test/scheduled-task-controls.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3 | — | Correction to `research/tests-host.md:1336`: the fixture is **not** a transplant; it bundles real modules (only the staged-vs-vendor byte check at fixture l.48-52 is ceremony). It is the second good bundling fixture alongside `reminder-adapter-fixture.mjs`. | Keep the fixture; move it to `specs/quint/refinement/application/fixtures/` (its only users are this harness and the duplicate test). | Low |
| 2 | — | T4 | `test/scheduled-task-controls.test.mjs` duplicates scenarios. | Delete it; carry nothing (every case is a scenario here). | Low |
| 3 | 13-19, 9-10 | — | Maps visible copy and button labels to model verbs; copy changes need edits here. Behavioural, acceptable. | Keep. | — |
| 4 | 55, 61 | B5 | Accumulates `driverHashes` from each fixture instance (`f.hashes`). | Capture once at compile. | None |
| 5 | 25, 76-80 | D8 | Unformatted lines (`if(verb==='snooze')assert.ok(...)`, `['answer','exact']`). | Formatter (D9). | None |
| 6 | 124 | — | Delegates time-zone/recurrence math to `scheduled-snooze-admission.mjs`; correct split. | Keep. | — |

## Proposed end state
Harness unchanged in behaviour (≈21 scenarios), fixture beside it, `test/scheduled-task-controls.test.mjs` deleted, one hash capture, formatted.
