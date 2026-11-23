# specs/quint/refinement/application/scheduled-snooze-admission.mjs
- Lines: 144 | Kind: Quint refinement harness, import-based (esbuild `buildSync` of `automations-protocol.ts` + `workflow-local-time.ts`, run in a `vm` context with an injected clock) | Verdict: KEEP (SIMPLIFY evidence ceremony)
- Covers: scheduled-task Snooze 10 min — base instant from the next recurrence vs a saved deferral, owner-local/absent zone follows device clock, unsupported cron and invalid zone invent nothing, New York DST gap and repeated hour, foreign zone, exact protocol path/body/receipt checks, cancel, transport loss, malformed id refused before request, held review expiring (live model `ScheduledSnoozeAdmission.qnt`, manifest ~l.4160). Duplicates: `scheduled-task-controls.mjs` "Snooze review" scenario covers the review→intent path but explicitly delegates the time math here; workflow-local-time host tests (if any survive T3) overlap the DST rows. Callers/importers: `index.mjs:47`, `test/quint-scheduled-snooze-admission.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 22, 27-28 | B5 | Builds twice (`buildSync` for the graph, then again) to assert the graph is unchanged. | Build once. | None |
| 2 | 29-34 | B5, C3 | Re-verifies `.eliza/client-features/.source.json` against `upstream.lock.json` and each staged file hash — the job `scripts/prepare-client-features.ts` already does; the same check is repeated in `test/fixtures/scheduled-task-controls.mjs:48-52`. | Delete; trust the prepare step. | Low |
| 3 | 23-25 | P1 | Sources include `package-lock.json`, `upstream.lock.json`, `.source.json`. | Metafile inputs only. | None |
| 4 | 38, 42-43 | — | `owner_local` rows build `now` with `new Date(2026,10,10,…)` (machine-local time); results are offsets so they hold in any zone except one whose DST changes on 10 Nov 2026. | Note only. | Low |
| 5 | 144 | — | `pendingTurn` declared after its use site (works, module-level const used later). | Use `tick` from `support.mjs`. | None |
| 6 | 139 | — | Assumption records an open product question (keep an earlier future deferral vs clamp to the second-fold occurrence). | Owner question; already in the model. | — |

## Proposed end state
~110 lines: one build, no staged-hash re-verification, `tick` from support, same 28 traces.
