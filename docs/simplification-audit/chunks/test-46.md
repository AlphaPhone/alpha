# Chunk test-46: Quint wrappers `quint-quiet-voice-retry` … `quint-workflow-worker-staging`, plus `read-aloud-direct` … `reset-startup`

97 assigned files, 97 reports in `files/test/`. 96 exist; `test/quint-saved-sign-in-recovery.test.mjs` was already deleted in
this worktree (legacy Cloud sign-in recovery, C5) and has a two-line report.

Totals: whole-file DELETE 13, KEEP (moved or merged as a unit) 7, MERGE/REWRITE/PORT 76, missing 1.
Of the 78 `quint-*` files, 59 are thin wrappers whose only change is "become one row of the manifest-driven runner".

Targets used (consistent with `research/tests-host.md` proposed layout): `test/quint/refinement.test.mjs` (one manifest-driven
runner, one `test()` per model), `test/quint/tooling.test.mjs` (check-traces, model-state, sourceModule),
`test/tooling/release-signing.test.ts`, `test/tooling/upstream-sources.test.ts`, `test/integration/{calendar,connection-cloud,resident-runtime,voice}.test.ts`,
Gradle host-JVM tests under `android/app/src/test/java/ai/alphacompute/alphaphone/`, and Playwright `journeys/{camera-photos,reminders,settings}.spec.ts`.

| File | Kind | Verdict |
|---|---|---|
| `test/quint-quiet-voice-retry.test.mjs` | Quint refinement wrapper | MERGE into `test/quint/refinement.test.mjs` |
| `test/quint-recognizer-availability.test.mjs` | Quint refinement wrapper | MERGE into `test/quint/refinement.test.mjs` |
| `test/quint-recovery-ui-refinement.test.mjs` | Quint refinement wrapper | MERGE into `test/quint/refinement.test.mjs` |
| `test/quint-recovery-vad-conformance.test.mjs` | Quint refinement wrapper | MERGE into `test/quint/refinement.test.mjs` |
| `test/quint-refinement-campaigns.test.mjs` | tooling (tests `specs/quint/refinement/campaigns.mjs`) | DELETE (with the family aggregates); else MERGE into `test/quint/tooling.test.mjs` |
| `test/quint-refinement-harness.test.mjs` | tooling (tests `specs/quint/refinement/check-traces.mjs`) | KEEP, MERGE into `test/quint/tooling.test.mjs` |
| `test/quint-reminder-decision.test.mjs` | Quint refinement wrapper | MERGE into `test/quint/refinement.test.mjs` |
| `test/quint-reminder-intents.test.mjs` | Quint refinement wrapper | MERGE into `test/quint/refinement.test.mjs` |
| `test/quint-reminder-refresh.test.mjs` | Quint refinement wrapper | MERGE into `test/quint/refinement.test.mjs` |
| `test/quint-reminder-tap-tokens.test.mjs` | Quint refinement wrapper | MERGE into `test/quint/refinement.test.mjs` |
| `test/quint-reminder-todo-attempt.test.mjs` | Quint refinement wrapper | MERGE into `test/quint/refinement.test.mjs` |
| `test/quint-renderer-background-rebuild.test.mjs` | Quint refinement wrapper | MERGE into `test/quint/refinement.test.mjs` |
| `test/quint-renderer-digest-queue.test.mjs` | Quint refinement wrapper | MERGE into `test/quint/refinement.test.mjs` |
| `test/quint-renderer-hosted-inbox.test.mjs` | Quint refinement wrapper | MERGE into `test/quint/refinement.test.mjs` |
| `test/quint-renderer-refinement.test.mjs` | Quint refinement wrapper | MERGE into `test/quint/refinement.test.mjs` |
| `test/quint-renderer-speech-chunk.test.mjs` | Quint refinement wrapper | MERGE into `test/quint/refinement.test.mjs` |
| `test/quint-resident-java-source-stage.test.mjs` | mixed: tooling integration (test 1) + Quint wrapper (test 2) | MERGE: test 1 into `test/tooling/upstream-sources.test.ts`; test 2 into `test/quint/refinement.test.mjs` |
| `test/quint-resident-liveness.test.mjs` | Quint refinement wrapper | MERGE into `test/quint/refinement.test.mjs` |
| `test/quint-resident-maps-relay-offer.test.mjs` | Quint refinement wrapper | MERGE into `test/quint/refinement.test.mjs` |
| `test/quint-resident-refinement.test.mjs` | Quint refinement wrapper | MERGE into `test/quint/refinement.test.mjs` |
| `test/quint-resident-scheduling-admission.test.mjs` | Quint refinement wrapper | MERGE into `test/quint/refinement.test.mjs` |
| `test/quint-resident-start-cancel.test.mjs` | Quint refinement wrapper | MERGE into `test/quint/refinement.test.mjs` |
| `test/quint-retained-home-brief.test.mjs` | Quint refinement wrapper | MERGE into `test/quint/refinement.test.mjs` |
| `test/quint-reviewed-copies-refinement.test.mjs` | Quint refinement wrapper | MERGE into `test/quint/refinement.test.mjs` |
| `test/quint-reviewed-workflow-launcher-refinement.test.mjs` | Quint refinement wrapper | MERGE into `test/quint/refinement.test.mjs` |
| `test/quint-room-handler-queue.test.mjs` | Quint refinement wrapper (legacy/core, upstream code) | DELETE (with `specs/quint/legacy`, P6) |
| `test/quint-runtime-update-pause-refinement.test.mjs` | Quint refinement wrapper | MERGE into `test/quint/refinement.test.mjs` |
| `test/quint-saved-service-read.test.mjs` | Quint refinement wrapper | MERGE into `test/quint/refinement.test.mjs` |
| `test/quint-scan-conformance.test.mjs` | Quint refinement wrapper | MERGE into `test/quint/refinement.test.mjs` |
| `test/quint-scan-review-dialogs.test.mjs` | Quint refinement wrapper | MERGE into `test/quint/refinement.test.mjs` |
| `test/quint-scheduled-snooze-admission.test.mjs` | Quint refinement wrapper | MERGE into `test/quint/refinement.test.mjs` |
| `test/quint-screen-focus-ownership.test.mjs` | Quint refinement wrapper | MERGE into `test/quint/refinement.test.mjs` |
| `test/quint-selected-document-viewer.test.mjs` | Quint refinement wrapper | MERGE into `test/quint/refinement.test.mjs` |
| `test/quint-service-read-cache.test.mjs` | Quint refinement wrapper | MERGE into `test/quint/refinement.test.mjs` |
| `test/quint-services-refinement.test.mjs` | Quint aggregate (all services campaigns) | DELETE (T4) |
| `test/quint-settings-capability-reads.test.mjs` | Quint replay with inline transplant driver | MERGE into `test/quint/refinement.test.mjs` after PORT |
| `test/quint-settings-listener-reads.test.mjs` | Quint replay with marker-region import | MERGE into `test/quint/refinement.test.mjs` after PORT |
| `test/quint-settings-session.test.mjs` | Quint replay with inline transplant driver | MERGE into `test/quint/refinement.test.mjs` after PORT |
| `test/quint-shade-pull.test.mjs` | Quint replay (real module bundle + shell fixture) + one scenario | MERGE into `test/quint/refinement.test.mjs` |
| `test/quint-shade-row-custody.test.mjs` | Quint refinement wrapper | MERGE into `test/quint/refinement.test.mjs` |
| `test/quint-share-panel-admission.test.mjs` | Quint refinement wrapper | MERGE into `test/quint/refinement.test.mjs` |
| `test/quint-shared-recording.test.mjs` | Quint refinement wrapper | MERGE into `test/quint/refinement.test.mjs` |
| `test/quint-shell-screen.test.mjs` | Quint replay + source-text assertions + unit scenario | MERGE replay into `test/quint/refinement.test.mjs`; DELETE tests 2-3 |
| `test/quint-signin-refinement.test.mjs` | Quint refinement wrapper | MERGE into `test/quint/refinement.test.mjs` |
| `test/quint-single-flight-refinement.test.mjs` | Quint refinement wrapper (legacy/core, upstream code) | DELETE (with `specs/quint/legacy`, P6) |
| `test/quint-sms-send.test.mjs` | Quint refinement wrapper | MERGE into `test/quint/refinement.test.mjs` |
| `test/quint-source-bundle-capture.test.mjs` | tooling (tests `specs/quint/refinement/services/support.mjs` `sourceModule`) | KEEP, MERGE into `test/quint/tooling.test.mjs` |
| `test/quint-source-renewal-question.test.mjs` | Quint replay + two mounted scenarios | MERGE into `test/quint/refinement.test.mjs` |
| `test/quint-speech-cleanup-latch.test.mjs` | Quint refinement wrapper | MERGE into `test/quint/refinement.test.mjs` |
| `test/quint-speech-gate.test.mjs` | Quint refinement wrapper | MERGE into `test/quint/refinement.test.mjs` |
| `test/quint-speech-output-preparation.test.mjs` | Quint refinement wrapper | MERGE into `test/quint/refinement.test.mjs` |
| `test/quint-speech-warmup.test.mjs` | Quint refinement wrapper | MERGE into `test/quint/refinement.test.mjs` |
| `test/quint-startup-update-admission.test.mjs` | Quint refinement wrapper | MERGE into `test/quint/refinement.test.mjs` |
| `test/quint-state-inventory.test.mjs` | tooling (tests `specs/quint/refinement/model-state.mjs`) | KEEP, MERGE into `test/quint/tooling.test.mjs` |
| `test/quint-system-picker-visibility.test.mjs` | Quint refinement wrapper | MERGE into `test/quint/refinement.test.mjs` |
| `test/quint-task-scheduler-refinement.test.mjs` | Quint refinement wrapper (upstream code, legacy model) | DELETE (with `specs/quint/legacy`; owner question) |
| `test/quint-task-scheduler-runtime-refinement.test.mjs` | Quint refinement wrapper | MERGE into `test/quint/refinement.test.mjs` |
| `test/quint-task-service-refinement.test.mjs` | Quint refinement wrapper | MERGE into `test/quint/refinement.test.mjs` |
| `test/quint-tla-inventory.test.mjs` | tooling (legacy formal-source inventory, `prepare-quint-history.ts`) | DELETE (with `specs/quint/legacy` and `quint:prepare-history`, P6) |
| `test/quint-trigger-cursor.test.mjs` | Quint refinement wrapper | MERGE into `test/quint/refinement.test.mjs` |
| `test/quint-vault-coordinator-refinement.test.mjs` | Quint refinement wrapper | MERGE into `test/quint/refinement.test.mjs` |
| `test/quint-video-edit-review.test.mjs` | Quint refinement wrapper | MERGE into `test/quint/refinement.test.mjs` |
| `test/quint-video-recorder.test.mjs` | Quint refinement wrapper | MERGE into `test/quint/refinement.test.mjs` |
| `test/quint-view-admission.test.mjs` | Quint replay with inline driver (real imports) + source regexes | MERGE into `test/quint/refinement.test.mjs` |
| `test/quint-voice-owned-navigation.test.mjs` | Quint refinement wrapper | MERGE into `test/quint/refinement.test.mjs` |
| `test/quint-voice-transcript-follow-refinement.test.mjs` | Quint refinement wrapper | MERGE into `test/quint/refinement.test.mjs` |
| `test/quint-web-reading-review.test.mjs` | Quint refinement wrapper | MERGE into `test/quint/refinement.test.mjs` |
| `test/quint-workflow-clock-admission.test.mjs` | Quint refinement wrapper | MERGE into `test/quint/refinement.test.mjs` |
| `test/quint-workflow-engine-refinement.test.mjs` | mixed: harness tooling (test 1) + Quint wrapper via child process (test 2) | MERGE: test 1 into `test/quint/tooling.test.mjs`; test 2 into `test/quint/refinement.test.mjs` |
| `test/quint-workflow-execution-audit-admission.test.mjs` | Quint refinement wrapper | MERGE into `test/quint/refinement.test.mjs` |
| `test/quint-workflow-lifecycle-change.test.mjs` | Quint refinement wrapper | MERGE into `test/quint/refinement.test.mjs` |
| `test/quint-workflow-local-source.test.mjs` | Quint refinement wrapper | MERGE into `test/quint/refinement.test.mjs` |
| `test/quint-workflow-notice-delivery-refinement.test.mjs` | Quint refinement wrapper | MERGE into `test/quint/refinement.test.mjs` |
| `test/quint-workflow-request-recovery-admission.test.mjs` | Quint refinement wrapper | MERGE into `test/quint/refinement.test.mjs` |
| `test/quint-workflow-tasks-refinement.test.mjs` | Quint refinement wrapper | MERGE into `test/quint/refinement.test.mjs` |
| `test/quint-workflow-wakeups-refinement.test.mjs` | Quint refinement wrapper | MERGE into `test/quint/refinement.test.mjs` |
| `test/quint-workflow-worker-staging.test.mjs` | Quint refinement wrapper | MERGE into `test/quint/refinement.test.mjs` |
| `test/read-aloud-direct.test.mjs` | transplant (T2) | DELETE |
| `test/reading-capability-probe.test.mjs` | unit of upstream module (T3/T5) | DELETE |
| `test/recently-deleted.test.mjs` | transplant (T2) + source-text (T1) | DELETE; REWRITE behaviour into `journeys/camera-photos.spec.ts` |
| `test/record-release.test.mjs` | tooling (real `scripts/record-release.ts` on a temp checkout) | KEEP, MERGE into `test/tooling/release-signing.test.ts` |
| `test/recovery-restart-action.test.mjs` | transplant (T2) | DELETE; REWRITE behaviour into `test/integration/resident-runtime.test.ts` |
| `test/recovery-restart-presentation.test.mjs` | transplant (T2) | DELETE |
| `test/redaction-connection-switch.test.mjs` | integration (real `AlphaClient` with synthetic transports) | KEEP, MERGE into `test/integration/connection-cloud.test.ts` |
| `test/redeemed-plan-end.test.mjs` | transplant (T2) regression test | REWRITE as `test/integration/connection-cloud.test.ts` cases |
| `test/release-signing.test.mjs` | tooling (real release scripts) + source-text (T1) | MERGE into `test/tooling/release-signing.test.ts`; DELETE the T1 parts |
| `test/reminder-capability-negotiation.test.mjs` | integration-ish (real `DeviceActions`, `selectDeviceCapabilities`) + one T1 | MERGE into `test/integration/calendar.test.ts` |
| `test/reminder-card-presentation.test.mjs` | unit (real pure module, T3) | MERGE into `test/device-record-presentation.test.mjs` (then the calendar integration) |
| `test/reminder-deletions.test.mjs` | unit (esbuild bundle of real `browser/reminder-deletions.ts`) | MERGE into `test/integration/calendar.test.ts` |
| `test/reminder-lifecycle-pure.test.mjs` | transplant (T2) + unit | DELETE; move the Clock repeat-days case to `test/integration/calendar.test.ts` |
| `test/reminder-open-intent.test.mjs` | transplant scenarios (fixture) + Quint wrapper | MERGE replay into `test/quint/refinement.test.mjs`; DELETE scenarios |
| `test/renderer-recovery-budget.test.mjs` | host-JVM test (real `RendererRecoveryBudget.java`) + source-text | MERGE test 1 into Gradle `android/app/src/test/java/.../RendererRecoveryBudgetTest.java`; DELETE test 2 |
| `test/renderer-slot-deployment-namespace.test.mjs` | host-JVM integration (real `RendererCredentialSlots`, `CloudDeployment`, upstream `SecureSlotPolicy`) | KEEP, MOVE to Gradle `RendererCredentialSlotsTest.java` |
| `test/renderer-slot-policy.test.mjs` | transplant (Java methods sliced into a stub class, T2) | DELETE; carry the SMS-ledger cases into Gradle `RendererCredentialSlotsTest.java` |
| `test/reset-cloud-revocation.test.mjs` | host-JVM integration (real `ResetBeforeDispatch`, upstream `CloudKeyRevocation`, `DataReset`) | KEEP, MOVE to Gradle `ResetBeforeDispatchTest.java` |
| `test/reset-startup.test.mjs` | host-JVM integration (real `AlphaDataReset`, `AlphaApplication`, upstream `DataReset`) + source-text | MERGE test 1 into Gradle `AlphaDataResetTest.java`; DELETE test 2 |
| `test/quint-saved-sign-in-recovery.test.mjs` | missing | n/a (already deleted) |

## Duplicate execution found in this chunk

Every `npm test` runs these campaigns twice, once in the wrapper and once in a family aggregate:

- **application aggregate** (`test/quint-application-refinement.test.mjs`, 2400 s): recovery-ui, renderer-digest-queue,
  renderer-hosted-inbox, resident-liveness, retained-home-brief, saved-service-read, scheduled-snooze-admission,
  screen-focus-ownership, shade-row-custody, share-panel-admission, source-renewal-question, startup-update-admission,
  vault-coordinator, voice-transcript-follow, workflow-clock-admission, workflow-request-recovery-admission, reminder-open-intent.
- **services aggregate** (this chunk's `quint-services-refinement`, 2400 s): resident-java-source-stage, reviewed-workflow-launcher,
  scan-review-dialogs, signin, task-scheduler-runtime, task-service, workflow-engine, workflow-execution-audit-admission,
  workflow-local-source, workflow-tasks, workflow-wakeups, workflow-worker-staging; plus through `services/forward-replays.mjs`:
  resident-maps-relay-offer, service-read-cache, sms-send, system-picker-visibility, trigger-cursor, web-reading-review,
  workflow-lifecycle-change.
- **native aggregate** (`test/quint-native-refinement.test.mjs`, 2400 s): recognizer-availability, renderer-refinement,
  resident-refinement, resident-scheduling-admission, reviewed-copies, runtime-update-pause, shared-recording, speech-gate,
  speech-output-preparation, speech-warmup, workflow-notice-delivery; plus through `native/forward-replays.mjs`: renderer-background-rebuild,
  renderer-speech-chunk, resident-start-cancel, speech-cleanup-latch, video-edit-review, video-recorder.
- **legacy family** (`scripts/check-quint-refinement.ts`): room-handler-queue, single-flight, task-scheduler.

Not in any aggregate, so the wrapper is the only runner and **must become a runner row before any deletion**:
quiet-voice-retry, the five reminder models (decision, intents, refresh, tap-tokens, todo-attempt), selected-document-viewer,
voice-owned-navigation, scan-conformance, recovery-vad-conformance, settings-capability-reads, settings-listener-reads,
settings-session, shade-pull, shell-screen, view-admission.

## Behaviours that lose all coverage if the DELETEs happen without replacement

- **Photos Recently Deleted exact-revision deletion** (`recently-deleted.test.mjs`): only reviewed revisions are deleted,
  restored/changed items are skipped, cancel consumes the review, Empty trash needs explicit all. Needs three steps in
  `journeys/camera-photos.spec.ts` (I did not confirm the existing photo specs already assert the skip-on-restore case).
- **Resident recovery restart sequencing** (`recovery-restart-action.test.mjs`): restart = fresh review then confirm; an
  incomplete or mismatched native archive never starts the runtime; Try again only for `runtime-identity-unavailable`.
  `resident-recovery.production.spec.ts` covers the visible panel, not the archive-mismatch refusal. Needs integration cases
  once `connection-ui.tsx` exposes the recovery controller.
- **Redeemed plan end regression F01** (`redeemed-plan-end.test.mjs`, verdict REWRITE): five cases; no other test covers the
  re-verify restart keeping the redeemed end for the same account only.
- **Direct read-aloud owner change** (`read-aloud-direct.test.mjs`): development Cartesia path only; one voice-integration case.
- **Renderer SMS ledger slot refusal** (`renderer-slot-policy.test.mjs`): carry four asserts into the Gradle `RendererCredentialSlotsTest`.
- **Legacy-family deletions** (room-handler-queue, single-flight, task-scheduler, tla-inventory): coverage of upstream
  `vendor/eliza/packages/core` behaviour and of the historical TLA+ inventory is lost by design (P6, D11). TaskSchedulerRuntime
  keeps scheduler coverage. These need upstream follow-ups, not local replacements.
- **Per-model source-mutation canaries** (reminder ×5, system-picker, video ×2, workflow-execution-audit, scan-review,
  workflow-local-source, resident-scheduling): dropping them from the PR lane loses the per-model proof that each replay can
  fail. The checker-level proof stays in `quint-refinement-harness`. Offer an opt-in mutation lane if the owner wants them.

## Shared helpers worth keeping or creating

- `specs/quint/refinement/check-traces.mjs`, `model-state.mjs`, `services/support.mjs` (`sourceModule`): keep, with their
  tests merged into `test/quint/tooling.test.mjs`. `sourceModule` (esbuild bundle of the real module with stubbed specifiers)
  is the target shape for every T10 port; `quint-shade-pull` and `quint-view-admission` already use it.
- `campaigns.mjs` is only needed by the aggregates; delete with them.
- One JDK/javac lookup: `specs/quint/native/recovery-vad-conformance.mjs:23-35`, `refinement/native/java.mjs`,
  `test/fixtures/jvm-tools.mjs` and `reset-cloud-revocation.test.mjs:18` (android.jar) each resolve tools themselves.
- One release `DISTRIBUTABLE` fixture for `record-release`, `publish-update-manifest`, `pilot-units` (C6).
- One Android stub set for the Gradle host-JVM tests (`reset-startup` declares about 20 stubs inline).

## Cross-file actions

1. Build `test/quint/refinement.test.mjs` from `specs/quint/*/manifest.json` (one `test()` per model, model filter from argv/env
   for `quint:changed`), then delete the 59 thin wrappers (plus the replay halves of the mixed files) and the three family aggregates in one change. Move per-wrapper
   floors (trace counts, action lists) into manifest fields or drop them.
2. Move the inline replay drivers out of `test/` into `specs/quint/refinement/application/`: settings-capability-reads,
   settings-listener-reads, settings-session, shade-pull, shell-screen, view-admission.
3. PORTs that need product seams (T10): `settings-adapter.ts` (export capability-read and text-scale controllers; move
   `listenerReadGate` out and delete the `// settings-reads:begin/end` markers), `reminder-adapter.ts` (one exported operations
   module for five drivers), `voice-adapter.ts` (quiet retry, owned navigation), `connection-ui.tsx` (resident liveness, recovery,
   plan admission), `main.tsx` (screen focus, startup update gate), `model.js` (`shell-core-fixture.mjs`, blocks on the split).
4. Delete `quint:conformance` (package.json:69) and the README lines naming the deleted wrappers
   (`specs/quint/refinement/services/README.md:41-42`, `specs/quint/legacy/core/README.md:98`).
5. Retire `specs/quint/legacy` only after: `resident-liveness` stops importing legacy helpers, `CoreTaskScheduler.qnt` is
   deleted or moved, and the MMS historical inventory question (tla-inventory test 2) is decided.
6. Create Gradle host-JVM classes `RendererCredentialSlotsTest`, `RendererRecoveryBudgetTest`, `ResetBeforeDispatchTest`,
   `AlphaDataResetTest`; drop the matching `test/*.test.mjs` and their source-text halves.
7. Merge `reminder-card-presentation` into `device-record-presentation.test.mjs` and `reminder-capability-negotiation` with
   `device-capability-selection.test.mjs`.

## Owner questions

- Do models of upstream-only code stay (TaskSchedulerRuntime, TaskServiceLifecycle, workflow engine/scheduler, resident
  coordinator over upstream Java)? Default here: keep as runner rows; room-handler-queue and single-flight go with legacy.
- Keep per-model source-mutation canaries in an opt-in lane, or drop them?
- Is the agent op `create_reminder` ("legacy reminder compatibility" in `reminder-capability-negotiation` and
  `reminder-card-presentation`) still emitted by the pinned upstream agent? If not, D1 deletes the branch and both cases.
- Is the "legacy" engine scenario and the "Removing a retained legacy request" path in `workflow-execution-audit-admission`
  a reader for data or protocol versions that cannot exist (D1)?
- The MMS historical-source counterexample witnesses: keep (then `prepare-quint-history.ts` stays) or drop?
