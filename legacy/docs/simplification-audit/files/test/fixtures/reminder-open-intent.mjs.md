# test/fixtures/reminder-open-intent.mjs
- Lines: 107 | Kind: transplant (slices `reminder-creations.ts` from `export function reminderEvents(` to `/** Specific, stable reason`, regex-extracts one line of `automations-adapter.ts`, strips `reminder-adapter.ts`, runs in `vm`) | Verdict: PORT (bundle the real modules with ports, like `scheduled-task-controls.mjs`)
- Covers: opening a device reminder from Workflows: Calendar opens, the held reminder list read resolves the exact occurrence, navigation/visit fences, refresh failures and the two failure toasts. Duplicates: `test/reminder-open-intent.test.mjs` runs the same fixture; Calendar Playwright specs cover reminder rows. Callers/importers: `test/reminder-open-intent.test.mjs:3`, `specs/quint/refinement/application/reminder-open-intent.mjs:2` (registered `application/index.mjs:41`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 18-24 | T2 / T10 | Two text markers in `apps/app/src/runtime/reminder-creations.ts` (lines 33 and 40 today) and the regex `if\(row\.kind==='device-reminder'\)\{[^\n]+?return;\}` over `automations-adapter.ts:148`; any reformat breaks it. | Bundle `reminder-adapter.ts` + `reminder-creations.ts` with esbuild and stub only `../daily`, `@capacitor/core`, connection imports; call the automations row handler through an exported `openDeviceReminder(owner,row)` from `automations-adapter.ts` (export the existing branch as a function). | Medium: one product export. |
| 2 | 10-11 | D13 | Deep path into `.eliza/client-features/.../reminder-journal.ts`. | Use the `@eliza/*` alias once it exists. | Low |
| 3 | 16 | A8 | Doc comment calls it the "Real legacy renderer adapter"; the reminder adapter is the live one. | Fix wording when porting. | — |
| 4 | 61-72 | — | `DailyApps.listReminders` held-promise port is the right boundary fake. | Keep. | — |

## Proposed end state
~80-line fixture that bundles the real reminder adapter and row presentation once (cached), injects `DailyApps`/Capacitor ports and a fixed clock, and exposes the same `observe()`; the separate host test is dropped in favour of the family runner.
