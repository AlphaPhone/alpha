# Chunk specs-31

Quint application refinement harnesses `photos-trash` … `scheduled-task-controls` (27 files, ~3,700 lines). Per-file reports are in
`docs/simplification-audit/files/specs/quint/refinement/application/`.

| File | Kind | Verdict | Target / note |
|---|---|---|---|
| photos-trash.mjs | refinement harness (shares photos-window bundle) | KEEP | inherits photos-window PORT; drop unused `assert`, double capture |
| photos-window.md | narrative note | DELETE | 3 lines to `PhotosWindow.qnt` header |
| photos-window.mjs | refinement harness + shared fixture, esbuild bundle with 3 text splices | KEEP + PORT | export dev-only `photosInspection()` from `camera-adapter.ts`; stop splicing upstream `photos-view.ts`; move fixture to `photos-fixture.mjs` |
| portable.mjs | 6 import-based adapters | KEEP (split/rename) | only run via the application aggregate: must be registered in the per-model runner; CallbackLanding duplicate in `test/quint-conformance.test.mjs` to delete |
| previous-notes-availability.mjs | transplant, legacy Notes | DELETE | with model, manifest row, index entry and wrapper test (product source already deleted; harness broken now) |
| previous-notes-source-opening.mjs | transplant fixture, legacy Notes | DELETE | with `test/fixtures/previous-notes-source-opening.mjs`, `test/previous-notes-source-opening.test.mjs`, model, manifest row |
| quiet-voice-retry.mjs | ITF replay over a transplant of `voice-adapter.ts` | KEEP model, PORT | extract `createQuietVoiceRetry` into `prototype/voice-quiet-retry.ts` |
| recovery-ui.md | narrative note | DELETE | |
| recovery-ui.mjs | refinement harness, bundle + React/JSDOM, appended export | KEEP (minor PORT) | product-exported `recoveryState()`; build once |
| reminder-adapter-fixture.mjs | shared bundle fixture | KEEP | becomes the base for open-intent and retained-tap; drop output-text splice and double `mutate` |
| reminder-decision.mjs | ITF replay, real bundle | KEEP | delete wrapper mutation case |
| reminder-intents.mjs | ITF replay, real bundle | KEEP | journal limits via config (upstream follow-up) |
| reminder-open-intent.md | narrative note | DELETE | path is live, not "legacy" |
| reminder-open-intent.mjs | harness over transplant fixture | KEEP model, PORT | onto `reminder-adapter-fixture.mjs` + exported Workflows row opener; delete `test/fixtures/reminder-open-intent.mjs` and `test/reminder-open-intent.test.mjs` |
| reminder-refresh.mjs | ITF replay, real bundle | KEEP | |
| reminder-tap-tokens.mjs | ITF replay, real bundle | KEEP | |
| reminder-todo-attempt.mjs | ITF replay, real bundle | KEEP | |
| renderer-digest-queue.mjs | import-based | KEEP | |
| renderer-hosted-inbox.mjs | import-based | KEEP | |
| resident-liveness.mjs | transplant slice of `connection-ui.tsx` | KEEP model, PORT | `createResidentLiveness` in `resident-recovery.ts`; import `tick/deferred` from `./support.mjs` (unblocks `specs/quint/legacy` retirement) |
| retained-home-brief.mjs | import-based | KEEP | |
| retained-reminder-tap-admission.md | narrative note | DELETE | |
| retained-reminder-tap-admission.mjs | harness over transplant fixture | KEEP model, PORT | onto `reminder-adapter-fixture.mjs`; delete `test/fixtures/retained-reminder-tap.mjs` and `test/retained-reminder-tap-admission.test.mjs` |
| saved-service-read.mjs | import-based (temp-file bundle) | KEEP + SIMPLIFY | drop references to `index.mjs` and `test/quint-application-refinement.test.mjs` from its sources; use `bundledSource` |
| scheduled-snooze-admission.mjs | import-based | KEEP + SIMPLIFY | build once; drop staged-hash re-verification |
| scheduled-task-controls.md | narrative note | DELETE | behaviour paragraph to model header |
| scheduled-task-controls.mjs | harness over an import-based (bundling) fixture | KEEP | move fixture beside harness; delete duplicate `test/scheduled-task-controls.test.mjs` |

Counts: KEEP 20 (of which PORT 6: photos-window, quiet-voice-retry, recovery-ui, reminder-open-intent, resident-liveness,
retained-reminder-tap-admission), DELETE 7 (5 narrative notes + 2 legacy Previous Notes harnesses), MERGE/REWRITE 0.

## Behaviours that would lose all coverage if the DELETEs happen
- None that the product still has. The two Previous Notes harnesses cover the legacy Notes source that D1 deletes; its product
  source (`legacy-notes-access.ts`, the `previousNotes*` functions in `agent-adapter.ts`) is already gone in this worktree, so both harnesses
  and their wrapper tests fail today and must be deleted together with `PreviousNotesAvailability.qnt` / `PreviousNotesSourceOpening.qnt`
  and their manifest rows to keep Quint at 100 %.
- The five `.md` notes hold no checks.
- **At risk from deletions elsewhere:** the six `portable.mjs` models (StartupPermissions, CallbackLanding, PreferencesAndPresentation,
  BrowserSession, PermanentVoiceDeletion, DraftDispatch) run **only** through the application aggregate
  (`index.mjs` → `test/quint-application-refinement.test.mjs`). Deleting that aggregate (ci-and-formal §2.4) without a
  manifest-driven per-model runner removes their refinement entirely. Conversely, `quiet-voice-retry` and the five `reminder-*` ITF replays are
  **not** in `index.mjs` and run only via their per-model tests, so `npm run quint:refinement` never runs them. One registration mechanism is needed.
- `saved-service-read.mjs` lists `test/quint-application-refinement.test.mjs` and `index.mjs` as hashed sources; deleting the aggregate test breaks it.

## Shared helpers worth keeping
- `reminder-adapter-fixture.mjs` — real esbuild bundle of the reminder adapter with native/storage ports and hold points; the porting target
  for `test/fixtures/reminder-open-intent.mjs` and `test/fixtures/retained-reminder-tap.mjs` (both transplants).
- `test/fixtures/scheduled-task-controls.mjs` — real bundle of `automations-adapter.ts`; reusable for the Workflows device-reminder row in the
  open-intent port. Correction to `research/tests-host.md:1336`: it is **not** a transplant.
- `support.mjs` `bundledSource`, `tick`, `deferred` — already cover what `resident-liveness.mjs` imports from `specs/quint/legacy/core/source-support.mjs`
  and what `saved-service-read.mjs`/`scheduled-snooze-admission.mjs` re-implement.
- Proposed additions to `support.mjs`: `withGlobals(dom|{window}, fn)` (recovery-ui, retained-home-brief), single source capture (several harnesses capture twice).

## Cross-file actions
1. Legacy Notes removal commit: delete `previous-notes-availability.mjs`, `previous-notes-source-opening.mjs`, `test/fixtures/previous-notes-source-opening.mjs`,
   `test/previous-notes-source-opening.test.mjs`, `test/quint-previous-notes-availability.test.mjs`, both `.qnt` models, two `application/manifest.json` entries,
   two imports and two adapter entries in `index.mjs`.
2. `resident-liveness.mjs`: switch `deferred/tick` import to `./support.mjs` before retiring `specs/quint/legacy` (P6).
3. Product exports needed for the ports (dev-gated where they expose state):
   - `camera-adapter.ts`: `photosInspection()` (library/trash/album/counts state) — used by photos-window, photos-trash, browser-album-storage, photos-owned-album-dialog.
   - `voice-adapter.ts` → new `voice-quiet-retry.ts`: `createQuietVoiceRetry(...)`.
   - `connection-ui.tsx` → `resident-recovery.ts`: `createResidentLiveness(...)` (fits the D1 split of `connection-ui.tsx`).
   - `error-boundary.tsx`: `recoveryState()`.
   - `reminder-adapter.ts`: `reminderTapState()` (replaces the bundled-output splice).
   - `automations-adapter.ts`: `openDeviceReminder(owner, row)` (replaces the regex extraction in the open-intent fixture).
4. Delete the T4 duplicates once ports land: `test/reminder-open-intent.test.mjs`, `test/retained-reminder-tap-admission.test.mjs`,
   `test/scheduled-task-controls.test.mjs`, CallbackLanding block in `test/quint-conformance.test.mjs:30-63`.
5. Delete the mutation cases in `test/quint-reminder-{decision,intents,refresh,tap-tokens,todo-attempt}.test.mjs` (T5, each pins a literal product guard
   and doubles a 240–280 s run), then drop the `mutate` parameter from `reminder-adapter-fixture.mjs` and the five replays.
6. Upstream follow-up (D14): reminder journal limits as a parameter (`.eliza/…/plugin-assistant/…/reminder-journal.ts:93,305`) so `reminder-intents.mjs`
   stops rewriting bundled output.
7. The D9 formatter will break: `photos-window.mjs` markers in `camera-adapter.ts` (`  async function refresh(more = false) {` and two statement literals),
   `resident-liveness.mjs` anchors in `connection-ui.tsx`, `quiet-voice-retry.mjs` anchors in `voice-adapter.ts`, the open-intent fixture's single-line regex
   on `automations-adapter.ts`. Port these before running Prettier (RECOMMENDATIONS R1).

## Owner questions
- BrowserSession, PermanentVoiceDeletion and DraftDispatch (`portable.mjs`) refine upstream-only code reached through Alpha re-export shims. Keep them here as
  acceptance of the pinned upstream, or move the models upstream?
- ReminderRefresh vs ReminderOpenIntent (both replay the `reminderOpened` open/drop path) and ReminderTapTokens vs RetainedReminderTapAdmission (pre- vs
  post-render token handling): merge each pair into one model, or keep the split the manifest documents?
- PhotosWindow projects `readWindow` internals (`s.reader/rows/cursor/want`) from upstream `photos-view.ts`. May the model drop or re-map those fields to the
  observed `list()` requests so the harness stops splicing upstream code?
- ScheduledSnoozeAdmission records an open policy: a future first-fold deferral clamps to the second-fold recurrence on the repeated DST hour. Intended?
