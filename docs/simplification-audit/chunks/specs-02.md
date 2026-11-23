# Chunk specs-02: Lemma runtime proofs and Quint application models A–BrowserD

42 files: 22 LemmaScript/Dafny companions (`specs/lemma/apps/app/src/runtime/*` + `startup-permission-flow`), `specs/quint/README.md`
and 19 application-family Quint models. Every model and proof here describes product code that still exists. One
change is needed now: the Stage A Calendar deletion (removing `CalendarPreservation` from `agent-calendar.ts`) broke
the four AgentCalendar refinement harnesses, and two of their models (three counting SyncControl) still model the
deleted legacy gate.

## Files

| File | Kind | Verdict | Target / note |
|---|---|---|---|
| `specs/lemma/.../runtime/canvas-geometry.dfy` | Lemma (gen + hand proof) | KEEP | hand lemma `ScaleKeepsOrder` is required |
| `.../canvas-geometry.dfy.gen` | Lemma generated | KEEP | |
| `.../cloud-environment-selection.dfy` | Lemma (identical to .gen) | KEEP | regen if product adds `cloudEnvironmentAllowed` |
| `.../cloud-environment-selection.dfy.gen` | Lemma generated | KEEP | |
| `.../cloud-voice-limit.dfy` / `.gen` | Lemma (identical) | KEEP / KEEP | |
| `.../gmail-mailbox.dfy` / `.gen` | Lemma (identical) | KEEP / KEEP | |
| `.../hosted-digests.dfy` | Lemma (gen + hand proof) | KEEP | ensures for missing `phase` changes with B297 |
| `.../hosted-digests.dfy.gen` | Lemma generated | KEEP | |
| `.../inbox-edit-coalescer.dfy` / `.gen` | Lemma (identical) | KEEP / KEEP | |
| `.../inbox-operation.dfy` / `.gen` | Lemma (identical) | KEEP / KEEP | contract restates the body |
| `.../resident-recovery.dfy` / `.gen` | Lemma (identical) | KEEP / KEEP | tautological contract (owner may drop) |
| `.../voice-states.dfy` / `.gen` | Lemma (identical) | KEEP / KEEP | |
| `.../workflow-device-contract.dfy` | Lemma (gen + hand lemmas) | SIMPLIFY | delete 4 hand lemmas that restate the generated ensures, so the file equals `.gen` |
| `.../workflow-device-contract.dfy.gen` | Lemma generated | KEEP | |
| `.../startup-permission-flow.dfy` / `.gen` | Lemma (identical) | KEEP / KEEP | `lateReadyNotice` text rule is an open owner question |
| `specs/quint/README.md` | docs | REWRITE | ~40 lines; stale counts, legacy family, receipts, unused npm aliases |
| `AccessibleToastLifetime.qnt` | Quint, live | KEEP model; PORT harness | harness slices `model.js` |
| `AccountSheet.qnt` | Quint, live | KEEP | register or remove `directSettingsRemainReachable`; Chromium harness, run once |
| `AddressInput.qnt` | Quint, live | KEEP model; PORT harness | harness slices `browser-adapter.ts` `navigate` |
| `AgentCalendarEventReturn.qnt` | Quint, live | KEEP model; fix harness | harness uses the removed `preservation` constructor argument |
| `AgentCalendarMutation.qnt` | Quint, live | REWRITE | drop `preservationReply` phase; fix harness; delete the duplicate child-process suite |
| `AgentCalendarRefresh.qnt` | Quint, live | REWRITE | drop `legacyReply`/`retentionReply`/legacy statuses; fix harness; inject clock |
| `AgentCalendarSyncControl.qnt` | Quint, live | REWRITE | drop `preserve` phase; fix harness |
| `AgentPhotoRequest.qnt` | Quint, model-only | KEEP | symbol pins only; no harness |
| `AppInfoHandoffComposition.qnt` | Quint, live | KEEP model; PORT harness | `drawer-interaction.mjs` rewrites upstream drawer source text |
| `AppearancePreferenceAdmission.qnt` | Quint, live | KEEP model; PORT harness | transplant fixture slices `settings-adapter.ts`/`main.tsx`/shell |
| `Application.qnt` | Quint, live | MERGE → `AssistantConversation`, then DELETE | superseded by `native/ApplicationComposition` + `AssistantConversation` |
| `ApprovalRoutes.qnt` | Quint, model-only | KEEP (optional MERGE with AssistantConversation) | |
| `AssistantConversation.qnt` | Quint, live | KEEP | absorbs Application owner-switch trace; remove the draft stub |
| `AutomaticAppUpdateSchedule.qnt` | Quint, live | KEEP model; PORT harness | harness slices by `// settings-facts:begin/end` marker comments |
| `BackDispatch.qnt` | Quint, live | KEEP model; PORT `test/quint-back-dispatch.test.mjs` | slices `agent-adapter.ts`, regex on `MainActivity.java` |
| `BookmarksHydration.qnt` | Quint, live | KEEP model; PORT harness | slices `browser-adapter.ts` |
| `BrowserAlarmRinging.qnt` | Quint, model-only | KEEP | |
| `BrowserAlbumStorage.qnt` | Quint, live | KEEP | import-based IndexedDB replay: the target shape |
| `BrowserDeletionPoll.qnt` | Quint, live | KEEP | move `deferred` import off `specs/quint/legacy` |

Totals: 22 Lemma files kept (one SIMPLIFY), README rewrite, 19 models: 15 kept (8 with harness ports), 3 rewritten
(Calendar preservation removal), 1 merged/deleted (`Application`). No model in this chunk covers only a deleted feature.

## Behaviours that would lose coverage

- Deleting `Application.qnt` loses nothing executable, provided its single AlphaClient trace (`owner-switch-retires-actual-request`)
  moves into the `AssistantConversation` replay. Its reset, voice and resident invariants never had a harness here; they
  stay covered by `native/ApplicationComposition`.
- Deleting the legacy-preservation parts of the three Calendar models loses coverage only of code that is already deleted.
- If the owner drops the tautological `resident-recovery` contract, Quint `resident-liveness` still replays the real
  module.
- Until the four AgentCalendar harnesses are updated, nothing checks Calendar refresh, mutation, event-return or
  sync-control behaviour against the real controller. They break as soon as the working-tree `agent-calendar.ts` runs, so fix them first.

## Shared helpers worth keeping

- `specs/quint/refinement/application/support.mjs` (`sourceModule`, `bundledSource`, `deferred`, `trace`, `checkpoint`):
  this import-based harness kit is the replacement for every slice. `BrowserDeletionPoll` should use its `deferred`.
- `refinement/application/agent-calendar-refresh.mjs` `buildAgentCalendar` is shared by the mutation harness. Keep it, but replace
  its `Date.now()` text rewrite with an injected clock.
- `refinement/check-traces.mjs` (`checkTraces`, `qset`, `qmap`) is the trace comparator.

## Cross-file actions

1. **Fix now (Stage A fallout):** update `refinement/application/agent-calendar-{refresh,mutation,sync-control,event-return}.mjs`
   to `new AgentCalendar(port, client, cache, cacheIdentity, diagnostic)`. Delete their preservation/legacy scenarios, and trim
   `AgentCalendarRefresh/Mutation/SyncControl.qnt` plus their manifest `tests`/`abstractions` and `agent-calendar-*.md` notes.
   Also delete `test/agent-calendar-mutation.test.mjs` + `scripts/test-agent-calendar-mutation-flow.ts` (duplicate of the replay).
2. Port text-sliced harnesses to imports. Each needs one product extraction:
   `model.js` toast queue (AccessibleToastLifetime); `browser-adapter.ts` address decision and bookmark queue
   (AddressInput, BookmarksHydration); `settings-adapter.ts` `pollAutomaticUpdate` (AutomaticAppUpdateSchedule; also
   delete the `// settings-facts:` markers); the appearance module (AppearancePreferenceAdmission, which also deletes
   `test/fixtures/appearance-preference.mjs` and `test/appearance-preference.test.mjs`); `back-dispatch` module + MainActivity
   script as data (BackDispatch); upstream drawer seam (AppInfoHandoffComposition, an upstream follow-up per D14).
3. Run each harness once: drop the per-model `test/quint-*.test.mjs` wrapper or remove the entry from `refinement/application/index.mjs`
   (T4). Drop exact trace/checkpoint count assertions in wrappers (`quint-agent-calendar-refresh`, `-mutation`,
   `quint-bookmarks-hydration`).
4. Manifest: replace symbol-name pins with file pins (AddressInput user-copy strings, ApprovalRoutes, BackDispatch,
   BrowserAlarmRinging, AgentPhotoRequest, AssistantConversation, BookmarksHydration, AccessibleToastLifetime).
   Register or remove `AccountSheet.directSettingsRemainReachable`. Turn `AgentCalendarRefresh.completeFirst` from a `run` into an `action`.
5. `Application` merge: lower the `application` floor in `test/quint-checker.test.mjs:32` (or delete that T5 floor test) in the same change.
6. Lemma: delete the hand lemmas in `workflow-device-contract.dfy` and update `specs/lemma/README.md:202`. Optionally teach
   `scripts/check-lemma.ts` to accept a missing `.dfy` when it would equal `.dfy.gen`, then delete the 8 identical `.dfy` files in
   this chunk (15 repo-wide).
7. Every product edit to the 11 Lemma-listed sources in this chunk needs `npm run lemma:regen`. That includes hosted-digests B297, cloud-environment
   `cloudEnvironmentAllowed`, and the startup late-notice rule. Any hand-written block (canvas-geometry, hosted-digests) has to be re-applied.
8. `native/ApplicationComposition.qnt:77` imports `services/CalendarSync`: check that it is not the deleted client-side linked-sync model (other chunk).

## Owner questions

1. `startup-permission-flow.ts` `lateReadyNotice` keys on the text "did not confirm revoking", which no code produces. Remove the branch and regenerate the proof, or keep it?
2. Keep `resident-recovery`'s tautological Lemma contract (the original admission example), or drop it with its companions?
3. Merge `ApprovalRoutes` and `AssistantConversation` into one approval model, or keep them as two models of one flow?
4. Delete `Application.qnt` (and lower the registry floor), or keep it as a top-level summary model?
