# specs/quint/refinement/application/reminder-open-intent.mjs
- Lines: 103 | Kind: Quint refinement harness over a **transplant** fixture (`test/fixtures/reminder-open-intent.mjs`) | Verdict: KEEP model; PORT the fixture onto `reminder-adapter-fixture.mjs` (real bundle)
- Covers: a reminder open intent survives only for its own navigation visit and a 30 s window; stale reads update the cache without navigating; Notes visit retires it; direct Calendar entry inherits it once; Workflows device-reminder row captures the visit before Calendar commits; hidden document suppresses navigation; wrong occurrence opens Calendar without a wrong detail; read failure retires the tap (live model `ReminderOpenIntent.qnt`, manifest ~l.2585). Duplicates: `ReminderRefresh` replays `reminderOpened` open/drop (coarser); `test/reminder-open-intent.test.mjs` drives the same fixture. Callers/importers: `index.mjs:41`, `test/reminder-open-intent.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2 | T2 | The fixture strips types from `reminder-adapter.ts`, removes all `import` lines and `export ` keywords, slices `runtime/reminder-creations.ts` between `export function reminderEvents(` and `/** Specific, stable reason` (both present, l.33/40), and regex-extracts `if(row.kind==='device-reminder'){…return;}` from `prototype/automations-adapter.ts` (single-line match on minified style). Formatting `automations-adapter.ts` (D9 Prettier) breaks the regex; any new import in the adapter becomes an unresolved free name. | PORT: build on `buildReminderAdapter()` (real imports, ports at native boundaries). For the Workflows row, export `openDeviceReminder(owner, row)` from `automations-adapter.ts` (the one-line branch) and import it, or bundle `installAutomationsAdapter` as `test/fixtures/scheduled-task-controls.mjs` already does. | Medium |
| 2 | 12-13 | B5, P1 | Source set includes `upstream.lock.json` and `scripts/prepare-client-features.ts`. | Bind only the bundle's metafile inputs. | None |
| 3 | 52-98 | — | Twelve readable scenario drivers; good shape. | Keep. | — |
| 4 | — | T4 | `test/reminder-open-intent.test.mjs` re-drives the fixture directly (tests-host.md:1296 marks it transplant/delete). | Delete that test once this harness runs on the real bundle; carry no cases (all are scenarios here). | Low |

## Proposed end state
~100 lines using `reminderAdapterFixture` + an imported Workflows row opener; `test/fixtures/reminder-open-intent.mjs` and `test/reminder-open-intent.test.mjs` deleted; model kept.
