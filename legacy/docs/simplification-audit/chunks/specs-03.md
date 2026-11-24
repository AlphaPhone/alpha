# Chunk specs-03: application Quint models (Browser*, Calendar*, Callback, Camera*, Canonical* first half)

27 assigned files; 26 exist, `CalendarPreservationConfirmation.qnt` was already deleted in this branch (D1) with its
manifest entry. Every remaining model is listed in `specs/quint/application/manifest.json`, so all are live for
`quint:check`. Reports: `docs/simplification-audit/files/specs/quint/application/<Name>.qnt.md`.

## Files

| File | Lines | Harness tie | Verdict | Target / note |
|---|---|---|---|---|
| BrowserExternalHandoff.qnt | 125 | `sourceContext` text eval (fixture) | KEEP; PORT harness | import `createExternalBrowserHandoff` + `BrowserTabSession`; drop stamp hashing |
| BrowserFilesTrash.qnt | 174 | imports projected upstream module | KEEP | models upstream `plugin-files`; owner question (move upstream) |
| BrowserHostedResultNotice.qnt | 124 | `sourceContext` over 6 files | KEEP; PORT harness | bundle `browser/hosted-results.ts`; export `canonical` |
| BrowserJournalRetention.qnt | 142 | imports real module | KEEP (shrink) | drop undated "legacy" receipts with the A1 product change + Lemma ensures |
| BrowserNoteRecordingJournal.qnt | 90 | direct import (reference pattern) | KEEP | — |
| BrowserOwnerReminderAction.qnt | 136 | `bundledSource` import | MERGE | `BrowserOwnerReminder.qnt` |
| BrowserOwnerReminderRead.qnt | 104 | `bundledSource` import | MERGE | `BrowserOwnerReminder.qnt` |
| BrowserReminderOrphan.qnt | 193 | imports real stores | REWRITE | drop legacy localStorage import dimension now; orphan state itself is an owner question |
| BrowserReviews.qnt | 85 | `loadBundled` import | KEEP | narrow manifest to `review.ts`, `screen-locked.ts` |
| BrowserSession.qnt | 205 | 2 trivial traces of upstream helpers | MERGE | into `BrowserTabLifecycle.qnt` (privacy/order/focus invariants) |
| BrowserSessionPersistence.qnt | 136 | slices `browser-adapter.ts` | KEEP; PORT harness | extract adapter session store; fix stale `createSessionSaver` text |
| BrowserSurfaceNavigation.qnt | 81 | `loadBundled` import | KEEP | drop word symbol pins |
| BrowserSurfacePresentation.qnt | 109 | slices `browser-adapter.ts` | KEEP; PORT harness | extract `hide`/`update` presentation |
| BrowserTabLifecycle.qnt | 198 | 3 slices of `browser-adapter.ts` | KEEP (merge target); PORT harness | remove dead `createSessionSaver` injection now |
| CalendarAgentSelection.qnt | 145 | bundled adapter + bundle-text probe patch | KEEP; PORT probe | expose selection via supported interface; drop mutation test |
| CalendarApprovalReview.qnt | 50 | `bundledSource` import | KEEP | narrow sources; delete host unit twin |
| CalendarDeviceWrites.qnt | 289 | **none** (symbol pins only) | KEEP; add harness | write replay on `calendar-adapter-fixture.mjs` (unused `creations` probe already there) |
| CalendarFormControls.qnt | 55 | `between()` slices of `model.js` + `new Function` | PORT | export pure helpers from `calendar-form-inputs.ts`; retirement candidate |
| CalendarPresentation.qnt | 192 | 1 trace of form codec | REWRITE | remove deleted Google display-hiding; tie or cut the rest |
| CalendarPreservationConfirmation.qnt | 0 | — | DELETE (done) | — |
| CallbackLanding.qnt | 76 | executes the real static page | KEEP | delete duplicate case in `test/quint-conformance.test.mjs` |
| CameraFocusWrites.qnt | 74 | `loadProductModule` import | KEEP | drop mutation test, word pins |
| CameraPreviewRetirement.qnt | 61 | Vite + Chromium mounted app | KEEP | browser lane only, narrowed sources |
| CanonicalCalendarDraft.qnt | 145 | esbuild bundle, ports stubbed | KEEP (merge target) | absorbs EditorClose + DraftHandoff |
| CanonicalCalendarDraftHandoff.qnt | 87 | Vite + Chromium | MERGE | `CanonicalCalendarDraft.qnt` |
| CanonicalCalendarEditorClose.qnt | 124 | Vite + Chromium, synthetic Back events | MERGE | `CanonicalCalendarDraft.qnt` |
| CanonicalNotesController.qnt | 117 | `bundledSource` import | KEEP | mostly upstream behaviour (owner question) |

Counts: KEEP 17 (including 5 with a harness PORT and 2 merge targets), MERGE 5, REWRITE 2, PORT-only 1, DELETE 1 (already done), plus 1 KEEP that needs a new harness.

## Behaviours that would lose coverage
- No model in this chunk is proposed for deletion apart from the already-deleted CalendarPreservationConfirmation (legacy feature, no coverage needed).
- **BrowserReminderOrphan**: if the owner confirms that orphan markers cannot occur in current data, the orphan runs go. The clock-lock / paired-staging property (`aPendingAlarmCannotAcquireSoundOnLockGrantTest`) must move to the Reminder deletion model, or it loses coverage.
- **CalendarPresentation**: today only one 2-step trace ties it to code. If the rewrite cuts the untied runs instead of writing a harness, Calendar Back order (chat, then form, then delete sheet, then event, then menu, then search) and the latest-forced-read-wins race have no formal check left. They need a `journeys/calendar.spec.ts` case.
- **BrowserSession merge**: the private-tab invariants (`PrivateNeverSaved`, `PrivatePagesDieWithTab`, popup inherits privacy) must be carried into BrowserTabLifecycle. Otherwise only the upstream helper test checks private-tab persistence.
- **CalendarDeviceWrites** already has no code tie. Its properties (no blind duplicate create, the unconfirmed-write latch) are checked only on Android instrumentation and in the model itself.

## Shared helpers worth keeping
- `specs/quint/refinement/application/support.mjs` `bundledSource`/`sourceModule`, `browser-model-traces.mjs` `loadBundled`, `notes-files-media-itf.mjs` `loadProductModule`. These are three esbuild import loaders for the same job; consolidate them into one (C3) and retire `sourceContext` once its users are ported.
- `calendar-adapter-fixture.mjs`: a real-adapter bundle with port stubs. Keep it, minus the bundle-text `closures` probe.
- `test/fixtures/calendar-mounted-editor.mjs`: a Vite + Chromium mount used by three harnesses. Keep it, but only in the browser lane.

## Cross-file actions
1. Extract a browser-tabs/session/presentation factory from `apps/app/src/prototype/browser-adapter.ts` (`ensure`, `navigate`, `restoreSession`, `saveSession`, `clearBrowsingData`, `forgetTabs`, `hide`, `update` and the tab listeners). Three harnesses (`browser-session-persistence.mjs`, `browser-surface-presentation.mjs`, `browser-tab-lifecycle.mjs`) then import it instead of slicing text.
2. Remove the `createSessionSaver` import/injection from `browser-tab-lifecycle.mjs:36,47` before or together with the D20 deletion. Also fix `specs/quint/application/README.md:66` and the manifest abstraction text at manifest.json:5168: BrowserSessionPersistence models the adapter's inline back-off, not `createSessionSaver`, so D20 does not retire it.
3. T4: drop these campaigns from `specs/quint/refinement/application/index.mjs` wherever a per-model wrapper exists (external-handoff, files-trash, hosted-result-notice, journal-retention, note-recording-journal, owner-reminder-*, reminder-orphan, calendar-approval-review, camera-preview-retirement, canonical-calendar-*, canonical-notes-controller). Add wrappers for `calendar-form-controls` and `portable.callbackLanding`, which today run only from the aggregate.
4. Delete the `test/quint-conformance.test.mjs` cases for BrowserSession and CallbackLanding (duplicates of `portable.mjs`).
5. Product exports needed for the ports: `canonical` in `browser/hosted-results.ts`; day-chip, step-button and month-cell helpers in `prototype/calendar-form-inputs.ts`; a selection getter from `installCalendarAdapter`.
6. Model merges change model counts. Lower or remove the registry floors in `test/quint-checker.test.mjs`.
7. Narrow manifest `sources`/`symbols` (CalendarApprovalReview, BrowserReviews, CalendarPresentation, CameraPreviewRetirement) so hot files (`model.js`, `template.html`, `agent-calendar.ts`) stop selecting these models in CI.
8. Move the Chromium-based harnesses (CameraPreviewRetirement, CanonicalCalendarDraftHandoff, CanonicalCalendarEditorClose) out of the host `npm test` lane into the browser lane.

## Owner questions
- Can current code write a Reminder `pendingDeletion` marker without its journal entry? If not, the BrowserReminderOrphan orphan state is legacy-only and most of the model goes.
- Should formal models cover web-build-only twins of native plugins (`browser/*.ts`: hosted results, owner reminders, surface navigation, camera focus, note journal)? D6/D19 keep them while Playwright drives the web build, but they never run on the phone.
- Should models of upstream code (BrowserFilesTrash, most of CanonicalNotesController) move to `vendor/eliza` upstream, or run only when `upstream.lock.json` changes?
- CalendarDeviceWrites: write a replay harness, or accept it explicitly as a design-only model?
- CalendarFormControls: after the port, retire it in favour of a Calendar journey assertion?
