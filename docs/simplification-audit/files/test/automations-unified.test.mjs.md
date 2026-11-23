# test/automations-unified.test.mjs
- Lines: 293 | Kind: mixed: integration of `AutomationsProtocol` (esbuild-bundled real module over a real HTTP server, about 15 cases) + transplant of the Workflows adapter (`adapterFixture` loads 11 files with imports stripped and `export ` deleted into one `vm` context, about 25 cases) + 2 source-text cases | Verdict: split: protocol cases MERGE into `test/integration/automations.test.mjs`; adapter cases REWRITE as `journeys/workflows.spec.ts`; source-text cases DELETE
- Covers: the unified list reads four agent sources and keeps them separate on failure; prompt, reminder, schedule and routine mutations use the canonical routes and stay "unknown" (locked) after an unconfirmed write until the owner allows another; local times across DST; snooze instants; reminder labels; the filters dialog. Duplicates: `test/browser/dev-workflow-*.spec.ts` (about 15 specs), `test/browser/reminder-*.spec.ts`; reminder label policy is upstream (`.eliza/.../reminder-presentation.ts`). Callers/importers: `npm test`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 48-78 | T2 | `adapterFixture` strips `^import` lines and every `export ` from `automations-adapter.ts`, `workflow-request-recovery.ts`, `workflow-filters.ts`, `modal-inert.ts`, `icon-style.ts`, `workflow-intents.ts` and four `.eliza` files, then runs them in one `vm` context with a fake `Shell`, `views` and a Proxy `localStorage`. | Delete the fixture. | — |
| 2 | 80-252, 254-266, 280-287 | T2 | About 25 cases on that fixture. Worth carrying into `journeys/workflows.spec.ts`: (a) unconfirmed mutation stays locked after reload and "Allow another" asks first; (b) 429 on enable re-reads and reports the limit; (c) a new prompt refused with 429 does not lock, an unknown outcome does; (d) editing a daily schedule keeps its clock and does not enable it; (e) a ten-minute snooze shows the next time; (f) leaving Workflows cancels an in-flight read; (g) Home hides the card only for a fresh, complete, empty read. | REWRITE. | Med |
| 3 | 125-137 | T2 | Slices `template.html` at `<div class="schedule-c` and `dc-lite.js` up to `  const templateElement` to render one menu. | Delete; the journey checks the menu's accessible names. | — |
| 4 | 196-202 | T1 | Regex over `template.html` for `workflows.automation.*` bindings, compared with the model's keys. | Delete. A missing binding shows up as a broken control in the journey. | Low |
| 5 | 243-247 | T5 | Reads `vendor/eliza/packages/ui/src/i18n/locales/en.json` to compare labels. | Delete. | — |
| 6 | 203-216 | T5 | Unit-tests upstream `reminder-presentation.ts`. | Delete; upstream follow-up. | — |
| 7 | 12-46, 170-193, 268-293 | — | Protocol cases over a real HTTP server: source isolation, 404 vs 403, malformed rows, prompt pause on create, Run uses fire, 429 re-read, DST gap rejection, repeated-hour precision, snooze readback. | Move to `test/integration/automations.test.mjs` importing the module directly (Node strips types; the esbuild bundle at line 12 is unnecessary). | Low |
| 8 | 109, 182, 192 | T8 | Sets `process.env.TZ` inside a shared test process and restores it in `finally`. | In the integration file, run the DST cases in a child process with `TZ` set, or give them their own file. | Low |
| 9 | 79 | T8 | `wait()` polls every 5 ms for up to 1.5 s. | Gone with the adapter cases. | — |

## Proposed end state
About 15 protocol cases in `test/integration/automations.test.mjs` (with `automation-completion` and the surviving `automations-transport` cases). Seven Workflows journeys in `journeys/workflows.spec.ts` on the shared harness with the mock agent. No `vm`, no source stripping, no template slicing.
