# Chunk specs-26 summary

| File | Kind | Verdict |
|---|---|---|
| `specs/quint/refinement/application/browser-files-trash.mjs` | Refinement harness, imports prepared upstream `BrowserStorageVolume` | KEEP (shared helpers; upstream follow-up D14) |
| `specs/quint/refinement/application/browser-hosted-result-notice.mjs` | Refinement harness, `sourceContext` transplant of 6 files | PORT → `bundledSource('browser/hosted-results.ts')` with stubs for `./documents`, `@capacitor/core`, `../platform-plugins`; shared canonical-JSON helper |
| `specs/quint/refinement/application/browser-journal-retention.md` | Note | KEEP (remove legacy paragraphs) |
| `specs/quint/refinement/application/browser-journal-retention.mjs` | Refinement harness, real modules via esbuild + `browser-daily-stores` fixture | KEEP (date all rows after D1; delete twin `test/browser-journal-retention.test.mjs`) |
| `specs/quint/refinement/application/browser-model-traces.mjs` | Shared ITF replay library | KEEP; absorbs `calendar-itf.mjs` as `refinement/model-traces.mjs` |
| `specs/quint/refinement/application/browser-note-recording-journal.mjs` | Refinement harness, direct import | KEEP (drop legacy `offset` dimension with D1) |
| `specs/quint/refinement/application/browser-owner-reminder-action.mjs` | Refinement harness, bundled real port | DELETE with unused `OwnerReminderNotificationPort` API (owner confirm) |
| `specs/quint/refinement/application/browser-owner-reminder-read.mjs` | Refinement harness, bundled real port | DELETE with the port (owner confirm) |
| `specs/quint/refinement/application/browser-reminder-orphan.md` | Note on a historical bug | DELETE |
| `specs/quint/refinement/application/browser-reminder-orphan.mjs` | Refinement harness of legacy orphan state | DELETE; carry 2 schedules → `test/browser-clock.test.mjs` / `journeys/reminders.spec.ts` |
| `specs/quint/refinement/application/browser-reviews.mjs` | ITF replay, bundled real `review.ts` | KEEP |
| `specs/quint/refinement/application/browser-session-persistence.mjs` | ITF replay, slices `browser-adapter.ts` | PORT → extract `browser/browser-session-store.ts` |
| `specs/quint/refinement/application/browser-surface-navigation.mjs` | ITF replay, bundled real `browser-surface.ts` | KEEP |
| `specs/quint/refinement/application/browser-surface-presentation.mjs` | ITF replay, slices `browser-adapter.ts` | PORT → extract `browser/browser-presentation.ts` |
| `specs/quint/refinement/application/browser-tab-lifecycle.mjs` | ITF replay, slices `browser-adapter.ts` | PORT → same `browser-session-store.ts`; drop `createSessionSaver` import now (D20) |
| `specs/quint/refinement/application/calendar-adapter-fixture.mjs` | Fixture, bundles real calendar adapters + text-injected probes | KEEP; PORT probe to public `calendarSelection()` / rendered state |
| `specs/quint/refinement/application/calendar-agent-selection.mjs` | ITF replay on bundled adapter | KEEP (follows fixture port) |
| `specs/quint/refinement/application/calendar-approval-review.mjs` | Refinement harness, bundled real client | KEEP (reformat; drop exact trace count) |
| `specs/quint/refinement/application/calendar-form-controls.mjs` | Refinement harness, slices `prototype/model.js` | PORT → pure functions in `prototype/calendar-form-inputs.ts` |
| `specs/quint/refinement/application/calendar-itf.mjs` | Shared ITF generator (twin) | MERGE into `browser-model-traces.mjs` |
| `specs/quint/refinement/application/calendar-preservation-confirmation.md` | — | Already deleted (D1/D4); no references |

## Coverage lost by the DELETEs
- Owner reminder read/action: none that users can see. The product has no consumer of `list`/`act` (only `main.tsx:92` `.bind`, web only). If the owner plans an agent-reminder shade, keep both models.
- Reminder orphan: the orphan behaviour is legacy only. Two current behaviours must be carried before deleting:
  (1) a queued deletion blocks edit, Done, same-ID schedule and Clock cancel/dismiss ("Undo or finish"), and Undo releases it;
  (2) Clock re-reads after taking the ringing lock, a newly staged deletion suppresses sound, and Undo restores ringing.
  Target: `test/browser-clock.test.mjs`, which already uses the same fixtures, or `journeys/reminders.spec.ts`.
- Legacy dimensions removed with D1 (offset note segments, timeless journal rows) lose coverage together with the code. Nothing to replace.

## Shared helpers worth keeping
- `browser-model-traces.mjs` merged with `calendar-itf.mjs`. Keep one `plain()` with numeric-aware set ordering, the cached and parallel goal walks, `replayTraces`, `installDocument`, `countListeners`.
- One esbuild loader. Today there are three: `support.mjs` `bundledSource`, `services/support.mjs` `sourceModule`, `loadBundled`.
- `test/fixtures/browser-daily-stores.mjs` (survives: journal-retention, deletion-poll, host tests) and `test/fixtures/browser-reminder-clock.mjs` (survives: `test/browser-clock.test.mjs`).
- `calendar-adapter-fixture.mjs` (importers: agent-selection, day-anchor and its test).

## Cross-file actions
- Extract the Browser adapter's saved-tabs, tab-lifecycle and presentation regions into `apps/app/src/browser/browser-session-store.ts` and `browser-presentation.ts`. This unblocks 3 harnesses and the `browser-adapter.ts` split. Anchors pinned today:
  - `function forgetTabs(ids`, `async function clearSiteData() {`, `function ensure(`, `async function command(`, `async function confirmBrowser(`
  - `function hide() {`, `const nativeUnderlay =`, `const openBrowserView =`
  - `void Browser.addListener('tabOpened',`, `…('notice',`
- Move the Calendar form day-chip, time-step and month-cell logic out of `model.js` into `calendar-form-inputs.ts`. Anchors pinned today:
  - `var dayChips = [];`, `var chosen =`, `var inputChange=`, `// month panel`, `var calRows =`
  - the `sPlus/sMinus/ePlus/eMinus` regex
- D20 (`createSessionSaver` delete): remove the import in `browser-tab-lifecycle.mjs:36,47`. Fix `manifest.json:5168` and `specs/quint/application/README.md:66`, which wrongly say `BrowserSessionPersistence` covers it.
- D1:
  - Drop `offsetMs` from `note-recording-journal.ts` and its model.
  - Drop timeless rows from `journal-retention.ts:12-13`, the Lemma `at === undefined` ensures of `journalRowRetires`, and the `dated` model field.
  - Delete `BrowserReminderOrphan` (qnt, harness, md, test, manifest, `index.mjs:78`).
- Owner-reminder port delete:
  - `runtime/owner-reminder-notification-port.ts`
  - `main.tsx:92`
  - `connection-ui.tsx:2375`
  - 2 models, 2 harnesses, 2 tests, `index.mjs:79-80`
- Before applying B298 (`backgroundStatus?`), note that the browser hosted-results double returns it and the hosted-result harness asserts it.
- Remove the aggregate double-runs: `index.mjs` adapters for files-trash, hosted-result-notice, journal-retention, note-recording-journal and approval-review. `calendar-form-controls` currently runs only in the aggregate and needs its own lane.

## Owner questions
- Is an agent-reminder notification shade planned? If not, delete `OwnerReminderNotificationPort` with `BrowserOwnerReminderRead`/`Action`.
- Should `BrowserFilesTrash` (it models upstream `plugin-files`) move upstream with the plugin (D14)?
