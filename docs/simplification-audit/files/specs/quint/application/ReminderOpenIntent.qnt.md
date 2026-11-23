# specs/quint/application/ReminderOpenIntent.qnt
- Lines: 82 | Kind: Quint model, live (in `application/manifest.json`, run by `quint:check`) | Verdict: KEEP model / PORT harness
- Covers: A tapped reminder's read-only open survives only the newest refresh, the same shell visit and a 30 s window; a different occurrence opens Calendar only. Duplicates: ReminderRefresh models the same `pendingReminderOpen` (newest refresh opens or drops); this model adds visit ownership, expiry and occurrence matching. Callers/importers: `reminder-open-intent.mjs` (`checkReminderOpenIntent`, in aggregate `index.mjs`) <- `test/reminder-open-intent.test.mjs` (72 lines) and `test/quint-application-refinement.test.mjs` (T4: run twice).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1 | A8/D11 | Header says "Legacy read-only reminder open"; the modelled code is the current `prototype/reminder-adapter.ts`, not a D1 legacy reader. Misleading after the D1 deletions. | Reword to "Reminder open from a notification tap across refreshes and shell visits". | L |
| 2 | harness | T2/T10 | `test/fixtures/reminder-open-intent.mjs:18-25` slices `runtime/reminder-creations.ts` between `export function reminderEvents(` and `/** Specific, stable reason`, regex-extracts `if(row.kind==='device-reminder'){...return;}` from `prototype/automations-adapter.ts`, strips types and runs the whole `reminder-adapter.ts` in a `vm` with a fake `Shell`. | PORT to `buildReminderAdapter()` from `reminder-adapter-fixture.mjs` (already bundles the real adapter and `reminder-creations.ts`); the Workflows device-row branch needs `automations-adapter.ts` to export its row-click handler (or drive it through `installAutomationsAdapter` as `test/fixtures/scheduled-task-controls.mjs` does). | M |
| 3 | manifest | - | No `symbols`, but `sources` lists `model.js` (shell navigation) which the harness never loads. | Keep `model.js` only if the ported harness drives real navigation. | L |

## Proposed end state
- Model stays (live code).
- Harness ported to the bundled reminder adapter; `test/fixtures/reminder-open-intent.mjs` deleted.
- One runner: either the aggregate or `test/reminder-open-intent.test.mjs`, not both (tests chunk).
- Later candidate: merge into ReminderRefresh once both run on the same bundled fixture (shared `pendingOpen` state).
