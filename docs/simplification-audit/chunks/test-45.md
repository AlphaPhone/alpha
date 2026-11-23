# Chunk test-45: test/quint-c… to quint-p… (166 files)

All 166 files are Quint refinement wrappers, inline replays or Quint tooling tests. Product behaviour is in the
drivers under `specs/quint/refinement/**` and in the four family aggregates
(`test/quint-{application,services,native}-refinement.test.mjs`, `quint-composition-refinement`). The plan that the
verdicts assume is the tests-host research one: **one manifest-driven runner** `test/quint-refinement.test.mjs` that
registers one `test()` per manifest model by calling the family index. Every per-model wrapper whose driver is already
in a family index (directly or through `forward-replays.mjs`) is DELETE. A driver that no index lists is registered
there (MERGE). Inline replays that live in `test/` move to `specs/quint/refinement/application/` (MOVE), and the
ones that slice product source are ported to imports first (PORT).

| File | Kind | Verdict | Target |
|---|---|---|---|
| test/quint-client-feature-publication.test.mjs | Quint wrapper (aggregated) | DELETE | runner (services family) |
| test/quint-client-observation-support.test.mjs | Quint wrapper (aggregated) | DELETE | runner (application family) |
| test/quint-cloud-connection-notices.test.mjs | Quint wrapper (aggregated) | DELETE | runner (application family) |
| test/quint-cloud-plan-recheck.test.mjs | Quint wrapper (aggregated) | DELETE | runner (application family) |
| test/quint-cloud-qa-launcher.test.mjs | Quint wrapper (aggregated) | DELETE | runner (services family) |
| test/quint-combined-agent-launcher-refinement.test.mjs | Quint wrapper (aggregated) | DELETE | runner (services family) |
| test/quint-committed-view-observation.test.mjs | Quint wrapper (aggregated) | DELETE | runner (application family) |
| test/quint-composer-send.test.mjs | Quint wrapper (not aggregated) | MERGE into `test/quint-refinement.test.mjs` | register `runComposerSendReplay` in `specs/quint/refinement/application/index.mjs` |
| test/quint-composition-refinement.test.mjs | Quint composition aggregate | MERGE into `test/quint-refinement.test.mjs` | runner `composition` family |
| test/quint-conformance.test.mjs | Quint conformance (real modules) | MERGE into `test/quint-refinement.test.mjs` (move to `specs/quint/refinement/application/conformance.mjs`), drop 3 cases | `specs/quint/refinement/application/conformance.mjs` + application index |
| test/quint-connection-controller.test.mjs | Quint replay (transplant) | PORT and MOVE (to `specs/quint/refinement/application/connection-controller.mjs`, registered in the runner) | `specs/quint/refinement/application/connection-controller.mjs` + application index |
| test/quint-contacts-session.test.mjs | Quint wrapper (aggregated via forward-replays) | DELETE | runner (services forward-replays) |
| test/quint-copy-receipt.test.mjs | Quint wrapper (aggregated) | DELETE | runner (native family) |
| test/quint-core-approval-service.test.mjs | Quint wrapper (legacy/core, historical) | DELETE | — (retire `specs/quint/legacy`) |
| test/quint-core-interaction-session.test.mjs | Quint wrapper (legacy/core, historical) | DELETE | — (retire `specs/quint/legacy`) |
| test/quint-core-interactive-task-traces.test.mjs | Quint wrapper (legacy/core, historical) | DELETE | — (retire `specs/quint/legacy`) |
| test/quint-core-plugin-lifecycle-refinement.test.mjs | Quint wrapper (legacy/core, historical) | DELETE | — (retire `specs/quint/legacy`) |
| test/quint-core-retirement.test.mjs | Quint wrapper (aggregated) | DELETE | runner (services family) |
| test/quint-core-runtime-lifecycle-refinement.test.mjs | Quint wrapper (legacy/core, historical) | DELETE | — (retire `specs/quint/legacy`) |
| test/quint-core-service-lifecycle-design-refinement.test.mjs | Quint wrapper (legacy/core, historical) | DELETE | — (retire `specs/quint/legacy`) |
| test/quint-core-service-lifecycle.test.mjs | Quint wrapper (aggregated) | DELETE | runner (services family) |
| test/quint-core-shutdown.test.mjs | Quint wrapper (aggregated) | DELETE | runner (services family) |
| test/quint-core-task-scheduling.test.mjs | Quint wrapper (legacy/core, historical) | DELETE | — (retire `specs/quint/legacy`) |
| test/quint-core-task-service-refinement.test.mjs | Quint wrapper (legacy/core, historical) | DELETE | — (retire `specs/quint/legacy`) |
| test/quint-core-turns.test.mjs | Quint wrapper (aggregated) | DELETE | runner (services family) |
| test/quint-credential-leases.test.mjs | Quint wrapper (aggregated) | DELETE | runner (native family) |
| test/quint-current-approval-service.test.mjs | Quint wrapper (aggregated) | DELETE | runner (services family) |
| test/quint-day-anchor.test.mjs | Quint wrapper (not aggregated) | MERGE into `test/quint-refinement.test.mjs` | register `checkDayAnchor` in `specs/quint/refinement/application/index.mjs` |
| test/quint-delegation-receiver.test.mjs | Quint replay (transplant) | PORT and MOVE (to `specs/quint/refinement/application/delegation-receiver.mjs`, registered in the runner) | application index |
| test/quint-development-digest-pending.test.mjs | Quint wrapper (aggregated) | DELETE | runner (services family) |
| test/quint-device-action-review.test.mjs | Quint wrapper (aggregated) | DELETE | runner (application family) |
| test/quint-dock-clearance-ownership.test.mjs | Quint wrapper (aggregated) | DELETE | runner (application family) |
| test/quint-domain-document-creation.test.mjs | Quint wrapper (not aggregated) | MERGE into `test/quint-refinement.test.mjs` | register `replayDomainDocumentCreation` in `specs/quint/refinement/application/index.mjs` |
| test/quint-drawer-interaction.test.mjs | Quint wrapper (aggregated) | DELETE | runner (application family) |
| test/quint-email-suggestion-review.test.mjs | Quint wrapper (aggregated) | DELETE | runner (application family) |
| test/quint-embedding-sql-refinement.test.mjs | Quint wrapper (legacy/core, historical) | DELETE | — (retire `specs/quint/legacy`) |
| test/quint-embedding-store-identity.test.mjs | Quint wrapper (aggregated) | DELETE | runner (services family) |
| test/quint-fact-write-dedupe-refinement.test.mjs | Quint wrapper (legacy/core, historical) | DELETE | — (retire `specs/quint/legacy`) |
| test/quint-fact-write-scope.test.mjs | Quint wrapper (aggregated) | DELETE | runner (services family) |
| test/quint-files-browser-controller.test.mjs | Quint wrapper (aggregated) | DELETE | runner (application family) |
| test/quint-files-filter.test.mjs | Quint wrapper (aggregated) | DELETE | runner (application family) |
| test/quint-files-recent-index.test.mjs | Quint wrapper (not aggregated) | MERGE into `test/quint-refinement.test.mjs` | register `replayFilesRecentIndex` in `specs/quint/refinement/application/index.mjs` |
| test/quint-find-in-page.test.mjs | Quint wrapper (not aggregated) | MERGE into `test/quint-refinement.test.mjs` | register `checkFindInPage` in `specs/quint/refinement/application/index.mjs` |
| test/quint-fixture-busy-latch.test.mjs | Quint replay (transplant) | PORT and MOVE (to `specs/quint/refinement/application/fixture-busy-latch.mjs`, registered) | application index |
| test/quint-forward-receipts.test.mjs | Quint tooling | MERGE into `test/quint/tooling.test.mjs` (cases 1, 2, 5) | `test/quint/tooling.test.mjs` |
| test/quint-gmail-agent-mailbox-recovery.test.mjs | Quint wrapper (aggregated) | DELETE | runner (services family) |
| test/quint-google-access-publication.test.mjs | Quint wrapper (aggregated) | DELETE | runner (application family) |
| test/quint-google-browser-return-claim.test.mjs | Quint wrapper (aggregated) | DELETE | runner (native family) |
| test/quint-google-calendar-access-choice.test.mjs | Quint wrapper (aggregated) | DELETE | runner (application family) |
| test/quint-google-calendar-disconnect.test.mjs | Quint wrapper (aggregated) | DELETE | runner (application family) |
| test/quint-google-calendar-link-flow.test.mjs | Quint wrapper (aggregated) | DELETE | runner (application family) |
| test/quint-google-calendar-link-publication.test.mjs | Quint wrapper (aggregated) | DELETE | runner (application family) |
| test/quint-google-consent-admission.test.mjs | Quint wrapper (aggregated) | DELETE | runner (application family) |
| test/quint-historical-calendar-navigation.test.mjs | Quint historical comparison | DELETE | — (retire `specs/quint/legacy`) |
| test/quint-historical-camera-session.test.mjs | Quint historical comparison | DELETE | — (retire `specs/quint/legacy`) |
| test/quint-home-failure-notice.test.mjs | Quint wrapper (aggregated) | DELETE | runner (application family) |
| test/quint-home-gesture.test.mjs | Quint wrapper (aggregated) | DELETE | runner (application family) |
| test/quint-home-instance-handoff.test.mjs | Quint wrapper (aggregated via forward-replays) | DELETE | runner (native forward-replays) |
| test/quint-home-surface.test.mjs | Quint replay (real import) | MOVE to `specs/quint/refinement/application/home-surface.mjs` and register in the runner | application index |
| test/quint-hosted-background-admission.test.mjs | Quint wrapper (aggregated) | DELETE | runner (application family) |
| test/quint-hosted-digest-mutation.test.mjs | Quint wrapper (aggregated) | DELETE | runner (application family) |
| test/quint-hosted-digest-refresh.test.mjs | Quint wrapper (aggregated) | DELETE | runner (application family) |
| test/quint-hosted-notice-question.test.mjs | Quint wrapper (aggregated) | DELETE | runner (application family) |
| test/quint-inbox-cleanup.test.mjs | Quint wrapper (aggregated) | DELETE | runner (services family) |
| test/quint-inbox-coordinator.test.mjs | Quint wrapper (aggregated) | DELETE | runner (services family) |
| test/quint-inbox-edit-coalescer.test.mjs | Quint wrapper (aggregated via forward-replays) | DELETE | runner (services forward-replays) |
| test/quint-inbox-list-paging.test.mjs | Quint wrapper (aggregated) | DELETE | runner (services family) |
| test/quint-inbox-provider-drafts.test.mjs | Quint wrapper + transplant | DELETE | runner (services); case 2 → `journeys/inbox.spec.ts` |
| test/quint-indicator-provider.test.mjs | Quint wrapper + probe + source-text | DELETE (fold the probe into the driver) | native index; probe inside `indicator-provider.mjs` |
| test/quint-inert-hold.test.mjs | Quint replay (transplant) | PORT and MOVE (to `specs/quint/refinement/application/inert-hold.mjs`, registered) | application index |
| test/quint-inline-modal-focus.test.mjs | Quint replay (real module) | MOVE to `specs/quint/refinement/application/inline-modal-focus.mjs` and register in the runner | application index |
| test/quint-keyboard-detectors.test.mjs | Quint replay (transplant) | PORT and MOVE (to `specs/quint/refinement/application/keyboard-detectors.mjs`, registered) | application index |
| test/quint-keyboard-dictation-cloud.test.mjs | Quint wrapper (aggregated) | DELETE | runner (native family) |
| test/quint-keyboard-geometry.test.mjs | Quint replay (real import) | MOVE to `specs/quint/refinement/application/keyboard-geometry.mjs` and register in the runner | application index |
| test/quint-launcher-favorites.test.mjs | Quint wrapper (aggregated) | DELETE | runner (application family) |
| test/quint-launcher-observer.test.mjs | Quint wrapper (aggregated) | DELETE | runner (application family) |
| test/quint-launcher-ownership.test.mjs | Quint wrapper (aggregated) | DELETE | runner (application family) |
| test/quint-legacy-campaign-report.test.mjs | Quint tooling (legacy) | DELETE | — |
| test/quint-legacy-chat-input-refinement.test.mjs | Quint historical comparison | DELETE | — (retire `specs/quint/legacy`) |
| test/quint-legacy-files-browser-refinement.test.mjs | Quint historical comparison | DELETE | — (retire `specs/quint/legacy`) |
| test/quint-legacy-google-connect-refinement.test.mjs | Quint historical comparison | DELETE | — (retire `specs/quint/legacy`) |
| test/quint-legacy-home-layout-refinement.test.mjs | Quint historical comparison | DELETE | — (retire `specs/quint/legacy`) |
| test/quint-legacy-maps-refinement.test.mjs | Quint historical comparison | DELETE | — (retire `specs/quint/legacy`) |
| test/quint-legacy-notes-view-refinement.test.mjs | Quint historical comparison | DELETE | — (retire `specs/quint/legacy`) |
| test/quint-legacy-photos-library-refinement.test.mjs | Quint historical comparison | DELETE | — (retire `specs/quint/legacy`) |
| test/quint-legacy-settings-nav-refinement.test.mjs | Quint historical comparison | DELETE | — (retire `specs/quint/legacy`) |
| test/quint-legacy-sign-in-refinement.test.mjs | Quint historical comparison | DELETE | — (retire `specs/quint/legacy`) |
| test/quint-lifeops-scheduled-task-route.test.mjs | Quint wrapper + upstream pin | DELETE | runner (services); case 1 → upstream follow-up |
| test/quint-list-focus-refinement.test.mjs | Quint wrapper (aggregated) | DELETE | runner (application family) |
| test/quint-listener-input.test.mjs | Quint wrapper (aggregated) | DELETE | runner (native family) |
| test/quint-listener-service.test.mjs | Quint wrapper + JVM probes | DELETE (fold both probes into the driver) | native index; probes inside `listener-service.mjs` |
| test/quint-listener-store.test.mjs | Quint wrapper (aggregated) | DELETE | runner (native family) |
| test/quint-live-capture.test.mjs | Quint wrapper (aggregated) | DELETE | runner (native family) |
| test/quint-map-plane-ownership.test.mjs | Quint wrapper (not aggregated) | MERGE into `test/quint-refinement.test.mjs` | register `replayMapPlaneOwnership` in `specs/quint/refinement/application/index.mjs` |
| test/quint-maps-connection.test.mjs | Quint wrapper (aggregated via forward-replays) | DELETE | runner (services forward-replays) |
| test/quint-maps-event-return.test.mjs | Quint wrapper (aggregated) | DELETE | runner (application family) |
| test/quint-maps-guidance-voice.test.mjs | Quint wrapper (aggregated via forward-replays) | DELETE | runner (services forward-replays) |
| test/quint-maps-reroute-ownership.test.mjs | Quint wrapper (aggregated) | DELETE | runner (application family) |
| test/quint-maps-screen-source.test.mjs | Quint wrapper + canaries | DELETE | runner (services) |
| test/quint-maps-share-choice.test.mjs | Quint wrapper (not aggregated) | MERGE into `test/quint-refinement.test.mjs` | register `replayMapsShareChoice` in `specs/quint/refinement/application/index.mjs` |
| test/quint-media-copy-intent.test.mjs | Quint wrapper (not aggregated) | MERGE into `test/quint-refinement.test.mjs` | register `replayMediaCopyIntent` in `specs/quint/refinement/application/index.mjs` |
| test/quint-mms-compose.test.mjs | Quint wrapper (aggregated via forward-replays) | DELETE | runner (services forward-replays) |
| test/quint-mobile-bundle-admission.test.mjs | Quint wrapper (aggregated) | DELETE | runner (services family) |
| test/quint-modal-toast-forwarding.test.mjs | Quint wrapper (aggregated) | DELETE | runner (application family) |
| test/quint-mounted-update-admission.test.mjs | Quint wrapper (aggregated) | DELETE | runner (application family) |
| test/quint-named-embedding-provenance.test.mjs | Quint wrapper + integration | MERGE cases 2-3 into `test/integration/agent-embeddings.test.mjs`; delete case 1 | `test/integration/agent-embeddings.test.mjs` |
| test/quint-native-action-recovery.test.mjs | Quint wrapper (aggregated) | DELETE | runner (native family) |
| test/quint-native-app-info-handoff.test.mjs | Quint wrapper (aggregated) | DELETE | runner (native family) |
| test/quint-native-assistant-entry.test.mjs | Quint wrapper (aggregated) | DELETE | runner (native family) |
| test/quint-native-calendar-scoped-review.test.mjs | Quint wrapper (aggregated) | DELETE | runner (native family) |
| test/quint-native-calendar-sync-enable.test.mjs | Quint wrapper (aggregated) | DELETE | runner (native family) |
| test/quint-native-clock-review.test.mjs | Quint wrapper (aggregated) | DELETE | runner (native family) |
| test/quint-native-conformance.test.mjs | Quint wrapper (spawned script) | DELETE | runner (native) |
| test/quint-native-crash-journal.test.mjs | Quint wrapper (aggregated) | DELETE | runner (native family) |
| test/quint-native-deletion-review-admission.test.mjs | Quint wrapper (aggregated) | DELETE | runner (native family) |
| test/quint-native-digest-consent.test.mjs | Quint wrapper (aggregated) | DELETE | runner (native family) |
| test/quint-native-gmail-background.test.mjs | Quint wrapper (aggregated) | DELETE | runner (native family) |
| test/quint-native-google-access-file.test.mjs | Quint wrapper (aggregated) | DELETE | runner (services family) |
| test/quint-native-google-host-artifact.test.mjs | Quint wrapper + tooling | DELETE case 1; MERGE case 2 into `test/tooling/agent-build.test.mjs` | `test/tooling/agent-build.test.mjs` |
| test/quint-native-hosted-inbox.test.mjs | Quint wrapper (aggregated) | DELETE | runner (native family) |
| test/quint-native-hosted-result-notices.test.mjs | Quint wrapper (aggregated) | DELETE | runner (native family) |
| test/quint-native-maps-location.test.mjs | Quint wrapper (aggregated via forward-replays) | DELETE | runner (native forward-replays) |
| test/quint-native-mms-dispatch.test.mjs | Quint wrapper + historical probe | DELETE | runner (native) |
| test/quint-native-navigation-ownership.test.mjs | Quint wrapper (aggregated) | DELETE | runner (native family) |
| test/quint-native-recording.test.mjs | Quint wrapper (aggregated) | DELETE | runner (native family) |
| test/quint-native-refinement.test.mjs | Quint aggregate | MERGE into `test/quint-refinement.test.mjs` | `test/quint-refinement.test.mjs` |
| test/quint-native-reminder-delivery.test.mjs | Quint wrapper (aggregated) | DELETE | runner (native family) |
| test/quint-native-request-withdrawal.test.mjs | Quint wrapper (aggregated) | DELETE | runner (native family) |
| test/quint-native-settings-handoff.test.mjs | Quint wrapper (aggregated) | DELETE | runner (native family) |
| test/quint-native-sms-dispatch.test.mjs | Quint wrapper + historical probe | DELETE | runner (native) |
| test/quint-native-source-renewal.test.mjs | Quint wrapper (aggregated) | DELETE | runner (native family) |
| test/quint-native-stream-bridge.test.mjs | Quint wrapper (aggregated via forward-replays) | DELETE | runner (native forward-replays) |
| test/quint-native-text-scale-lifecycle.test.mjs | Quint wrapper (aggregated) | DELETE | runner (native family) |
| test/quint-native-update-activation.test.mjs | Quint wrapper (aggregated) | DELETE | runner (native family) |
| test/quint-native-update-composition.test.mjs | Quint wrapper (aggregated) | DELETE | runner (native family) |
| test/quint-native-update-staging.test.mjs | Quint wrapper (aggregated) | DELETE | runner (native family) |
| test/quint-native-view-subscription.test.mjs | Quint wrapper (aggregated) | DELETE | runner (application family) |
| test/quint-native-voice-draft.test.mjs | Quint wrapper (aggregated) | DELETE | runner (native family) |
| test/quint-navigation-progress.test.mjs | Quint wrapper (aggregated) | DELETE | runner (native family) |
| test/quint-note-permission.test.mjs | Quint wrapper (aggregated) | DELETE | runner (native family) |
| test/quint-note-source-dialog.test.mjs | Quint wrapper (deleted feature) | DELETE (with the model and driver) | — (C1) |
| test/quint-note-web-source-dialog.test.mjs | Quint wrapper (deleted feature) | DELETE (with the model and driver) | — (C1) |
| test/quint-notes-coordinator-refinement.test.mjs | Quint wrapper (aggregated) | DELETE | runner (application family) |
| test/quint-notes-document-transfer.test.mjs | Quint wrapper (not aggregated) | MERGE into `test/quint-refinement.test.mjs` | register `replayNotesDocumentTransfer` in `specs/quint/refinement/application/index.mjs` |
| test/quint-observation-turn-dispatch.test.mjs | Quint wrapper (aggregated) | DELETE | runner (application family) |
| test/quint-on-device-recognizer.test.mjs | Quint wrapper + JVM probe | DELETE (fold the probe into the driver) | native index |
| test/quint-os-application-refinement.test.mjs | Quint wrapper (aggregated) | DELETE | runner (application family) |
| test/quint-own-notice-question.test.mjs | Quint wrapper (not aggregated) | MERGE into `test/quint-refinement.test.mjs` | register `runOwnNoticeQuestionReplay` in `specs/quint/refinement/application/index.mjs` |
| test/quint-password-provider-dialog.test.mjs | Quint wrapper (not aggregated) | MERGE into `test/quint-refinement.test.mjs` | register `checkPasswordProviderDialog` in `specs/quint/refinement/application/index.mjs` |
| test/quint-pending-action-recovery.test.mjs | Quint wrapper (not aggregated) | MERGE into `test/quint-refinement.test.mjs` | register `runPendingActionRecoveryReplay` in `specs/quint/refinement/application/index.mjs` |
| test/quint-permission-choices.test.mjs | Quint wrapper (aggregated) | DELETE | runner (application family) |
| test/quint-permission-coordinator-refinement.test.mjs | Quint wrapper (aggregated) | DELETE | runner (application family) |
| test/quint-personal-assistant-scheduled-task-custody.test.mjs | Quint wrapper (aggregated) | DELETE | runner (services family) |
| test/quint-phone-recents.test.mjs | Quint replay (real module) | MOVE to `specs/quint/refinement/application/phone-recents.mjs` and register in the runner | application index |
| test/quint-phone-session.test.mjs | Quint wrapper (aggregated via forward-replays) | DELETE | runner (services forward-replays) |
| test/quint-photos-owned-album.test.mjs | Quint wrapper + scenarios | DELETE (fold the three scenarios into the driver) | application index (`photos-owned-album-dialog.mjs`) |
| test/quint-photos-trash.test.mjs | Quint wrapper (aggregated) | DELETE | runner (application family) |
| test/quint-photos-window.test.mjs | Quint wrapper + scenario | DELETE (fold the scenario into the driver) | application index (`photos-window.mjs`) |
| test/quint-pilot-update-refinement.test.mjs | Quint wrapper (aggregated) | DELETE | runner (services family) |
| test/quint-piped-capture.test.mjs | Quint wrapper (aggregated) | DELETE | runner (native family) |
| test/quint-plan-admission-grace.test.mjs | Quint wrapper (aggregated) | DELETE | runner (services family) |
| test/quint-plugin-connector-custody.test.mjs | Quint wrapper (aggregated) | DELETE | runner (services family) |
| test/quint-prepared-source-stamp.test.mjs | Quint wrapper (aggregated) | DELETE | runner (services family) |
| test/quint-prepared-workflow-worker.test.mjs | Quint wrapper + tooling | DELETE case 1; MERGE case 2 into `test/tooling/agent-build.test.mjs` | `test/tooling/agent-build.test.mjs` |
| test/quint-previous-notes-availability.test.mjs | Quint wrapper (deleted feature) | DELETE (with model and driver) | — (C1) |
| test/quint-provider-execution-refinement.test.mjs | Quint wrapper (legacy/core, historical) | DELETE | — (retire `specs/quint/legacy`) |

Counts: DELETE 140 (of which legacy/historical 25, deleted feature 3),
MERGE/MOVE/PORT 26, KEEP 0.

## Behaviour that loses coverage if the DELETEs land

Nothing loses coverage when an aggregated wrapper goes: the aggregate (later the runner) executes the same campaign.
The following are only covered by **extra cases inside the deleted files** and must be carried, or they are lost:

- Concrete regressions the aggregate does not run: `runInboxEditCoalescerCase3`; `runMmsComposeCase2/3` (declined MMS
  re-review, hidden uncertain MMS cannot redispatch); `checkRetiredFilesFilterReload`; the three Photos owned-album
  stale-control cases; the Photos window "old summary failure keeps counts" case; the own-notice "changed notice keeps
  review open" case; the DayAnchor midnight close/reopen case. Fold each into its driver campaign.
- Java probes not in the aggregate: `probeIndicatorProvider` (32 race attempts), `probeListenerService` (release
  failure), `probeListenerAdmission`, `probeRecognizerRetirement`. Run them from their `check*` functions.
- Real integration tests in `quint-named-embedding-provenance` (delayed unmarked insert refused inside the
  publication window; experience vector not restamped on reload/metadata flush). Move, do not delete.
- Tooling: `scripts/prepared-workflow-worker.ts` early refusal; pinned Bun loader compatibility (CI only).
- Upstream behaviour pinned only here (moves upstream, D14): legacy/core replays of the upstream semaphore/serialise
  utilities, interaction-session leases and provider execution; the lifeops stale-occurrence defect; the
  BrowserSession private-restore and durable-draft conflict cases in `quint-conformance`.
- Inbox: "reviewed provider metadata reaches the draft editor" (transplant case in `quint-inbox-provider-drafts`) →
  a step in `journeys/inbox.spec.ts`.
- Deleted with their feature, intentionally: Previous-notes availability, NoteSourceDialog, NoteWebSourceDialog (C1);
  the `legacyWrite` action of DomainDocumentCreation (C6); the import half of NotesDocumentTransfer (C9); 11
  historical design comparisons and 9 legacy/core translations (D11).

## Shared helpers worth keeping

- `specs/quint/refinement/application/shell-model-traces.mjs` (`modelTraces`, `replay`, `tick`): used by eight inline
  replays here; becomes the trace source for the moved drivers.
- One `modelNames(qnt)` (now in `services/maps-model-traces.mjs`) replacing the private regex parses in
  `quint-connection-controller`, `quint-delegation-receiver` and the model-count asserts of the Maps wrappers.
- One bundled-module loader (`bundledSource` in `refinement/application/support.mjs`) replacing the inline esbuild
  loaders in `quint-conformance`, `quint-inline-modal-focus`, `quint-phone-recents` (and the stub maps duplicated in
  `mms-compose-replay.mjs`/`phone-session-replay.mjs`).
- `observed-replay.mjs` receipt guard: keep three tests of it (from `quint-forward-receipts`) in `test/quint/tooling.test.mjs`.

## Cross-file actions

1. Build `test/quint-refinement.test.mjs`: per-model tests from the four manifests, a generic "receipt passed" check,
   a generic "no unobserved state field" check (replaces six copies), manifest completeness (from
   `quint-native-refinement`), composition flagged in the manifest instead of hard-coded. Delete the four aggregates.
2. Register in the application index: ComposerSend, DayAnchor, DomainDocumentCreation, FilesRecentIndex, FindInPage,
   MapPlaneOwnership, MapsShareChoice, MediaCopyIntent, NotesDocumentTransfer, OwnNoticeQuestion,
   PasswordProviderDialog, PendingActionRecovery, plus the moved drivers ConnectionController, DelegationReceiver,
   FixtureBusyLatch, HomeSurface, InertHold, InlineModalFocus, KeyboardDetectors, KeyboardGeometry, PhoneRecents and
   the six-case `conformance.mjs`.
3. Composition runs in two places (`npm test` and `browser.yml` production job `quint:refinement --families=composition`): keep one.
4. Ports that block other stages: `quint-connection-controller` ends its slice at `async function remoteIdentity(`,
   which C4 deletes; `composer-send`, `pending-action-recovery`, `notes-coordinator`, `previous-notes` drivers slice
   `agent-adapter.ts` (C1); `observation-turn-dispatch` slices `phone-context.ts` (C4); DomainDocumentCreation needs
   `legacyWrite` removed with C6; NotesDocumentTransfer needs import removed with C9. Every source-rewrite canary
   (day-anchor, domain-document, files-recent-index, media-copy-intent, note-*-dialog, notes-document-transfer) and
   every regex pin here matches minified text and fails on the Prettier commit (D9): delete them before D9.
5. `test/fixtures/google-account-panel.mjs` is imported by the live drivers `google-calendar-access-choice.mjs` and
   `google-consent-admission.mjs`; delete-candidates C3 lists it for deletion. Move it to
   `specs/quint/refinement/application/fixtures/` instead.
6. `test/fixtures/lifeops-scheduled-task-route.mjs` keeps two driver importers after its test goes: move it beside them.
7. Before deleting `specs/quint/legacy`: move `deferred`/`tick` (`legacy/core/source-support.mjs`, used by
   `google-access-publication.mjs`) and `CoreTaskScheduler.qnt` (used by `services/task-scheduler/index.mjs`) into
   the live tree; drop `mms-historical-sources.json` and the historical probes in `mms-dispatch.mjs`/`sms-dispatch.mjs`;
   drop the `test/quint-application-refinement.test.mjs` path from the OS drivers' extra sources.
8. `specs/quint/native/conformance.mjs`: delete its script main and README line, move it into `refinement/native/`.
9. Merge `startup-permissions-coordinator.mjs` into `permission-choices.mjs` (same coordinator, same test title).
10. Upstream-only models (core-runtime/*, current-approval-service, credential-leases, drawer, launcher observer and
    ownership, email-suggestion, gmail-agent mailbox, personal-assistant custody, client-feature-publication): the
    runner selects them only when `upstream.lock.json` or the driver changes (P1).
11. Model-`expect` assertions in ~15 wrappers (cloud-qa-launcher, combined-agent-launcher, device-action-review,
    maps-reroute, native calendar review/sync, navigation ownership/progress, gmail mailbox, development digest,
    native Google host artifact) test the model, not the source. If any fact matters, it becomes a Quint `run` scenario.

## Owner questions

- Q-HOST-5 (existing): if the Cloud delegation panel is out of scope, DelegationReceiver and the delegation-return case
  of `quint-conformance` go with it.
- Q-CAL-1 (existing): if the Android Calendar sync is retired, `NativeCalendarSyncEnable` goes with it.
- Should mutation canaries survive anywhere (a formal-only `--canaries` mode), or be deleted outright? This chunk
  assumes deleted from `npm test`.
- PhoneRecents vs PhoneSession and KeyboardGeometry vs KeyboardDetectors model overlapping state of one module each:
  merge the models?
