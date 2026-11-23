# test/browser/journey-d-digests.spec.ts
- Lines: 271 | Kind: Playwright journey, `chromium` dev profile (`/?mode=dev&workflows=agent`), 2 tests (300 s, 240 s), `page.clock.install/pauseAt/fastForward` with a 1 s `tickFor` loop, `timezoneId:'UTC'`; UI-driven with read-only `/src` imports | Verdict: MERGE into `journeys/workflows.spec.ts` ("scheduled digests, development scheduler"); test 2 folds into test 1
- Covers: morning and evening digests created through the panel (reviewed snapshot source, reviewed schedule), each runs once, is retained and acknowledged; a restart inside the scheduled minute does not re-admit it; Home's "Latest brief" card shows the last real brief; an occurrence missed while the app was closed leaves exactly one `missed` record, is never run late and never replaces the Home brief. Duplicates: `dev-digest-schedule.spec.ts` (missed-record rule, comment at 254 says so), `home-daily-overview.spec.ts` and `home-brief-result.production.spec.ts` (Home brief card), `journey-core-loops.production.spec.ts` loops D/F (production state), `digest-resident-schedule.production.spec.ts`. Callers/importers: none; imports `helpers/connection-diagnostics.ts`, `app-navigation.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 41-44, 55, 198, 258, 265 | T6 | `digests()` imports `development-digest-document.ts` + `development-identity.ts`; `retainedBrief()` imports `runtime/hosted-digests.ts` `latestRetainedDigest()`. The panel articles and the Home card already show status, time and text. | Keep one read for the `acks` cursor (not visible); assert everything else on the panel and the Home card. Drop `retainedBrief` (the card assertion right after it is the user-visible proof). | Low |
| 2 | 243-271 | T4 | Test 2 re-runs the whole setup to show "missed with no earlier brief → no Home card". `dev-digest-schedule.spec.ts` covers the missed rule itself. | Add "before the first run, Home shows no card" to test 1 (already asserted at 120-123) and delete test 2, or keep it as one short step if the owner sees "missed-only" as a distinct case. | Low |
| 3 | 62, 129, 144, 155, 174, 202, 205, 216 | T8 | `tickFor` advances 1 s per `runFor` call, up to 120 iterations per step, because one burst can swallow a 15 s scheduler tick. Slow but deterministic. | Keep the policy; move `tickFor`/`advanceTo` into the harness clock helper so other digest specs use the same one. | none |
| 4 | 50, 120, 148, 207, 259 | T4 | `homeBrief` (`button[aria-label^="Open workflows"]`) is only ever asserted absent. | Drop it; the dedicated `briefCard` assertions carry the meaning. | none |
| 5 | 36 | D5 | `?workflows=agent` run-mode flag keeps the dev scheduler under unified Workflows navigation. | Keep while D5 dev flags exist; replace with the single dev-mode switch when the flag zoo is consolidated. | none |
| 6 | 17-29 | A8 | Header cites `scripts/test-local-digest-restart.ts` and owner decision A-09. | Keep a one-line boundary note and the A-09 reference. | none |

## Proposed end state
- Delete the file; one ~110-line case in `journeys/workflows.spec.ts`: create both schedules, morning runs once, restart in-minute no re-run, Home card, evening runs once, missed occurrence labelled "Missed — not run" and not on Home, next evening runs, final restart retains history.
- Assertions on panel and Home card; one harness read for the ack cursor.
- Shared clock helpers (`tickFor`, `advanceTo`) in the harness.
