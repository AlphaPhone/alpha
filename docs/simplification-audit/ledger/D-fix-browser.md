# D-fix-browser: confirmed review defects in apps/app/src/browser (and two neighbours)

All edits are minimal; production behaviour changes only where noted (finding 4 restores develop's).

1 + 5. `browser/workflow-dated-sources.ts` (merge damage, dev simulator only). The merge had restored develop's
   notes/week branches calling the deleted `api.localWorkflowNotes`. Restored the 496f78e36 overnight-only shape
   (A2.md:46-48, Q-NOTES-3) but kept develop's `readWorkflowAppState` reader: accepted labels are now only
   `overnight inbox` and `overnight inbox and today's calendar`; `workflowDateRange`/`datedRows` narrowed to the
   overnight/received case (only callers are this file). The notes labels return undefined and get the
   "This local read source is not supported" refusal in simulated-workflows.ts. Note: while this pass ran another
   agent had changed the same lines to throw 'Reopen Notes before running this step.'; that was replaced with the
   decision-aligned version. Optional `workflow-trigger-runtime.ts:37-38` 'a note in notes' exemptions left as is
   (dev-surface classification only; not needed for the fix). The fixtures.js/model.js "notes" presets are left.
2. `browser/calendar-editor-draft.ts`: re-exported `readCalendarEditorDraft` (pinned by
   specs/quint/refinement/application/calendar-editor-draft.mjs). `test/quint-calendar-editor-draft.test.mjs`: 4/4 pass.
3. CalendarLinkedLocalPort replay (`test/quint-calendar-linked-local-port.test.mjs`,
   `specs/quint/refinement/application/calendar-linked-local-port.mjs`, `specs/quint/application/CalendarLinkedLocalPort.qnt`):
   already deleted in the tree by a concurrent agent when this pass reached them; recorded in A1.md
   "Deleted tests and formal artefacts". `calendar-itf.mjs` kept.
4. `browser/clock.ts:50`: restored the `else if(navigator.locks)` guard (develop behaviour).
6. `browser/preference-recovery.ts` (3 strings) and `browser/notification-recovery.ts` (1 string): removed the
   sentences claiming an older copy "remains available", which describe the controls C6/D3 deleted. Test-mocks
   builds only. The device-storage "Download first" copy in the four `storage==='device'` callers is NOT changed
   (D16: owner copy); owner follow-up for the PR description: prototype/calendar-form-draft-adapter.ts:75,
   calendar-edit-draft-adapter.ts:58, inbox-unsaved.ts:76, agent-adapter.ts:1415 tell the user to download but the
   device dialog has no download control.
7. `browser/domain-document.ts:5`: comment corrected (new/restored/reset write `legacy:null`; edit() keeps existing).
8. `ui/calendar/sync-host.ts`: already deleted (with its README row, test and screen-copy test edits) by a concurrent
   agent when this pass reached it; no edit here.

Verification: `npx tsc --noEmit -p .` exit 0 (no errors anywhere);
`bun scripts/run-tests.ts test/quint-calendar-editor-draft.test.mjs` 4 pass / 0 fail.
Not run: browser tests (test/browser/dev-workflow-dates.spec.ts covers only the two kept labels), full quint:tests.
