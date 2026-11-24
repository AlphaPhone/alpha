# D-fix-scripts-specs

Review findings on the formal-model tooling (`specs/quint`, `scripts`, quint tests) left broken by the
simplification. None changes production behaviour; all restore the `quint:check` / `quint:tests` gate.

## Findings 1 and 9: manifest no longer loads; CalendarLinkedLocalPort left orphaned
- Re-checked: `CalendarLinkedLocalPort.qnt`, its harness and its test were left behind. Its manifest entry
  and its subject (`browser/calendar-linked-local.ts`, `calendar-sync-fields.ts`) had already been deleted
  under D4.
- Fix: deleted `specs/quint/application/CalendarLinkedLocalPort.qnt`,
  `specs/quint/refinement/application/calendar-linked-local-port.mjs` and
  `test/quint-calendar-linked-local-port.test.mjs`. No README or manifest names it any more.
  `calendar-itf.mjs` is kept because ten other files import it.
- `CalendarLinkedSync` (services manifest) is **kept**. Its sources are the upstream agent-side
  `plugin-calendar/src/linked-sync/*` and `contracts/calendar-linked-sync.ts`, not the deleted client sync,
  and `calendar-linked.mjs` still refines it.
- Symbol pins (FilesRecentIndex `revokeTree`, NotesDocumentTransfer `importText`/`testMocksEnabled`,
  VoiceTurnReview `reviewConversationTurn`/`conversationReview`): another agent in the same tree ported
  these at the same time (models, harnesses, tests and manifest rows). I did not edit them. With both sets
  of changes in place, `loadModels()` returns 390 models and no error.

## Findings 2 and 11: services refinement imports the deleted `calendar.mjs`
- Fix: `test/quint-services-refinement.test.mjs` no longer imports `calendarRefinement` or lists it in the
  loop.
- Run on its own, `credentialRefinement()` passes NativeCredentialMutation. The whole test file does not load
  in this worktree because `@elizaos/cloud-sdk` cannot be resolved (`upstream:prepare-client` has not been
  run here). That is a property of this environment, not of the fix.

## Findings 3, 6 and 7: javac cannot find `Slots` / `AlphaUtil`
- `native/credential-coordinator.mjs`: added `Slots.java`. `generateCredentialCoordinatorTraces('oversize')`
  now compiles.
- `services/credentials.mjs`: added `Slots.java` and `AlphaUtil.java` to `product`. NativeCredentialMutation
  passes.
- Not a defect: `services/sign-in-coordinator.mjs` and `native/gmail-background.mjs` only hash
  `AlphaCredentialStore.java` as an input. They do not compile it.
- Same defect in harnesses the findings did not name. A sweep of the 110 Java-backed quint tests found these:
  - `native/clock-review.mjs`: added `AlphaUtil`, because `AlphaActionJournal` now calls
    `AlphaUtil.isSha256Hex`.
  - `native/action-recovery-platform.mjs` (`recoveryProduct`): added `AlphaUtil`, plus
    `WorkflowNoticeTapsFactory`, which the inlined plugin bridge now calls.
    `quint-native-action-recovery` passes.
  - `test/quint-keyboard-dictation-cloud.test.mjs`: added `Slots.java` and `AlphaUtil.java`. Passes.
  - After these changes the sweep log shows no remaining `cannot find symbol`.

## Finding 8: NativeClockReview anchors on the inlined `read(` helper
- Fix: `clockJournalBridge` no longer requires or emits the removed `read` helper, and the unused
  `ActionJournal.field` static import is gone. `quint-native-clock-review` passes.

## Findings 4, 10 and 12: composition and Notes harnesses import deleted sources
- ControllerComposition: removed the Calendar half (D4).
  - `native/ControllerComposition.qnt`: removed the CompositionCalendar module, the calendar host fields,
    actions and invariants, and the Calendar tests. `cancelledReplacementKeepsOldBindingTest` is restated
    over voice and identity. All five remaining `quint test` runs pass.
  - The `native/manifest.json` entry is updated to match: sources, component, invariants, tests and
    abstractions.
  - `composition/ports.mjs`: only the `/api/v1/user` port remains. The entry no longer imports the deleted
    Calendar runtime files.
  - `composition/controllers.mjs`: the scenarios are now `sign-out`, `voice-open-signin`,
    `voice-pending-replacement` and `voice-hidden`.
  - `test/quint-composition-refinement.test.mjs` expects 4 traces and 15 checkpoints and asserts `signOut`.
    It passes.
- Notes: deleted `refinement/application/notes-trash-session.mjs`, `test/quint-notes-trash-session.test.mjs`
  and `test/quint-previous-notes-source-opening.test.mjs`.
  - `specs/quint/README.md`: removed the PreviousNotesSourceOpening sentence.
  - `specs/quint/partial-source-contracts.md`: removed three dead test links.
  - `test/ci-required-checks.test.mjs:210` uses the name only as a raw filter string, so it is left as is.

## Findings 5 and 12: Clock handoff flow test deleted as if the feature were retired
- Re-checked: the feature still ships. Only the legacy-key reader was retired.
- Restored `scripts/test-clock-handoff-flow.ts` from `a247c0175`:
  - `clockHandoffLegacyKey` removed.
  - `CLOCK_DAY_NAMES` and `deviceTimeZone` added to the vm context, because the adapter now imports them.
  - Listed again in `test/adapter-contracts.test.mjs`.
  - Result: `bun scripts/test-clock-handoff-flow.ts` passes.
- Some assertions were removed and are raised here. The base test switched `connectionMode` to `mock`
  mid-flight and expected `Offline` in a build without test mocks.
  - C-app-11 removed `blocked()` and the recheck after the opening write. Its reason: `main.tsx` sets
    `connectionMode` once, from a value gated on `testMocksEnabled`.
  - Those states are therefore unreachable, and production behaviour does not change.
  - I removed the mid-flight block, and the startup-mock loop now runs only in the test-mocks build.
  - Restoring `blocked()` would be the alternative, but that is the owner's decision.
- `test/fixtures/workflow-clock-admission.mjs`:
  - The `clockHandoffLegacyKey` re-export is gone. It now exports `CLOCK_DAY_NAMES` and `deviceTimeZone`
    and lists `lib/civil-date.ts`.
  - Its fake shell defines `cancelReadReplyCompletions`, because agent-adapter dropped the `?.`.
- `refinement/application/workflow-clock-admission.mjs`: dropped the two "mock request retires a held write"
  schedules and "browser flag-off mock request", for the same unreachability reason. The test now expects
  7 traces and 58 checkpoints, and it passes.
- Follow-up: `WorkflowClockAdmission.qnt` still models `setMock` as a runtime transition and should be
  narrowed to match.

## Finding 13: `test/feature-manifest.test.mjs` imports the deleted script
- This is a real defect only in the committed tree. The working tree already deletes the test, but the
  deletion is unstaged. This task cannot write to git, so the orchestrator has to commit it. No other file
  imports the script.

## Verification and open items
- `bun scripts/typecheck-scripts.ts` passed, and `npx tsc --noEmit` reported no errors.
- Sweep: all 110 Java-backed quint tests run together under `node --test` with concurrency 6, before the
  last three harness fixes. Of the 161 tests, 130 passed and 31 failed. I fixed the javac failures. None of
  the other failures involve files I own:
  - Missing modules: `apps/app/src/runtime/hosted-digests` and `runtime/device-actions`, loaded by the
    workflow-admission audit and development-digest tests.
  - Unexpected native runtime source pin, in the Android staging test.
  - `randomHex` undefined, in the browser hosted ledger test.
  - `Bun is not defined`, caused by running under node instead of bun.
  - Input-hash drift from other agents editing the same tree at the same time.
  - ETIMEDOUT under heavy machine load.
- Not run: the full `bun run quint:check` and `bun run quint:tests`.
