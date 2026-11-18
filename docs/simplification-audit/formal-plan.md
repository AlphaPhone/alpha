# Formal plan: Quint and LemmaScript

Scope: `specs/quint/**`, `specs/lemma/**`, `LemmaScript-files.txt`, `lemmascript.json`, the formal runners
(`scripts/check-quint.ts`, `scripts/quint-lib.ts`, `scripts/check-quint-refinement.ts`, `scripts/check-lemma.ts`,
`scripts/prepare-quint-history.ts`, `scripts/ci/check-changed-models.ts`) and every `test/quint-*.test.mjs`
(292 files today) plus the `test/fixtures/**` files those tests and the harnesses import.

Inputs: chunk summaries `specs-01` … `specs-54`, `test-35`, `test-44`, `test-45`, `test-46`, `scripts-01`, `scripts-03`,
`scripts-12`; `research/ci-and-formal.md`, `research/tests-host.md`; `DECISIONS.md` (D1–D21); `RECOMMENDATIONS.md`;
`PATTERNS.md` (B5, T4, T10, P1, P3, P6); `cross-file-actions.md` §2. Every count below was re-measured in this worktree
(`.claude/worktrees/simplify`) on 2026-11-11 with `node`/`grep` against the manifests and files; where a chunk summary
gave a different number, the measured one is used.

Ground rules this plan applies (from DECISIONS):
- D11: every live model passes, at 100 %. `specs/quint/legacy` is retired only after nothing live imports it.
  Text-anchored harnesses are ported to imports.
- D14: nothing is changed in `vendor/eliza`. Harnesses that splice **upstream** text stay as they are and are listed as
  upstream follow-ups. They only break on an upstream pin bump, so they do not block alphaphone refactors.
- D16: models are not used to change product behaviour. A model is deleted only when its code is deleted (D1–D5, D8,
  D20), or when another model already holds the same state machine (a twin).
- D20: when code with a proof or model is deleted, its proof and model go in the same commit.
- G1 (cross-file-actions §0): a file's text pins are retired **before** that file is split, moved or formatted (D9 Prettier).

## 0. State of the worktree today (measured)

| Item | Value |
|---|---|
| Registered models | 370: application 180, services 78, native 85, legacy 27 (`.qnt` count equals manifest entries in every family) |
| Manifest `sources` that do not exist | 0 (the C1/D1 rows the chunk summaries called "urgent" were already removed: `NoteSourceDialog`, `NoteWebSourceDialog`, `NotesTrashReadPublication`, `NotesTrashSession`, `PreviousNotesAvailability`, `PreviousNotesSourceOpening`, `DomainDocumentCreation`, `CalendarPreservationConfirmation`, `native/SavedSignInRecovery` are deleted with their harnesses) |
| Distinct `sources` paths in live families | 693 |
| `symbols` pins | 1,016 (application 622, services 266, native 128); 67 of them are not identifiers (prose and code fragments) |
| Scenarios | 2,670 `tests` in live families; 336 of 343 live models list exactly the `run` declarations of their `.qnt` |
| `test/quint-*.test.mjs` | 292 files, plus 4 family aggregates that re-run the same campaigns |
| LemmaScript | 23 listed sources, inventory equals `git grep -l '//@' apps/app/src`; 23 `.dfy`/`.dfy.gen` pairs; 15 pairs byte-identical, 8 with hand-written lemmas |
| Broken right now | the four Agent Calendar harnesses: `refinement/application/agent-calendar-{refresh,mutation}.mjs` pass a `preservation` object as the 2nd constructor argument, but `apps/app/src/runtime/agent-calendar.ts:46` is now `constructor(port, client, cache, cacheIdentity, bootstrapDiagnostic)`; `AgentCalendarRefresh.qnt` (18 hits), `AgentCalendarMutation.qnt` (13), `AgentCalendarSyncControl.qnt` (7) still model the deleted preservation/legacy phase. `refinement/composition/ports.mjs` imports `/src/runtime/calendar-sync-host.ts` and `/src/runtime/google-calendar-selection.ts`, both deleted, so `ControllerComposition`'s campaign cannot load. |

So `quint:check` loads today, but refinement is **not** at 100 %: Agent Calendar (4 campaigns) and composition (the
`ControllerComposition` part) fail. Unit U0 below fixes this first.

## 1. Live model inventory

`npm run quint:check` (`scripts/check-quint.ts check`) loads all four manifests through `loadModels()`
(`scripts/quint-lib.ts:220-252`). For each model, one after another, it runs the `scenarios` phase (`quint test`, every
name in `tests`), the `simulation` phase (`quint run`, 80 samples × 40 steps unless `bounds` overrides), then
`additionalProofInit` and every `witnesses` entry (≥ 2,000 samples). `legacy` models also declare `currentChecks` /
`temporal`, which only `quint:compare` / `quint:temporal` run. So the set of models `check-quint` runs is exactly the
370 manifest entries.

"Survives" means the model stays registered when this plan is done. "no" is either a DELETE (its product code is
deleted by a DECISION, or it is a historical/twin model) or a MERGE (its scenarios move into the named model, and the
file and manifest row go). "Upstream-only" means every listed source is under `vendor/eliza/`, `.eliza/`,
`upstream.lock.json`, `android/upstream-native-sources.json` or `patches/`: the model covers upstream code that ships in
the APK. It stays (D14 forbids moving it upstream here), but CI runs it only when the upstream pin or patches change
(§6). "Port unit" names the §3 execution unit that removes the model's text-anchored tie. "upstream (D14)" means the
harness splices upstream text: kept as is and reported as an upstream follow-up.

Totals: 316 survive (including the legacy `CoreRoomHandlerQueue`, which moves to `services/`), 54 do not.
Of the 54: 26 legacy (U2), 16 application, 6 native, 6 services. 34 live models (services 15, native 19) are
upstream-only. The 16 legacy `Core*` translations are upstream-only too.

Paths are shortened: `src/` = `apps/app/src/`, `java/` = `android/app/src/main/java/ai/alphacompute/alphaphone/`.

#### application (180)

| Model | Main product sources | Upstream-only | Survives | Verdict | Port unit |
|---|---|---|---|---|---|
| Application | `src/main.tsx`, `src/runtime/alpha-client.ts` +2 |  | no | MERGE→AssistantConversation, then DELETE (U3) |  |
| CommittedViewObservation | `src/runtime/view-navigation.ts` |  | yes | KEEP | upstream (D14) |
| ShellNavigation | `src/prototype/model.js`, `src/runtime/view-navigation.ts` +4 |  | yes | KEEP | P-model |
| StartupPermissions | `src/startup-permission-flow.ts`, `src/startup-permission-progress.ts` +3 |  | yes | KEEP; drop upgrade action (U3) |  |
| AssistantConversation | `src/runtime/alpha-client.ts`, `src/runtime/assistant-draft-record.ts` +3 |  | yes | KEEP |  |
| NotesLifecycle | `src/runtime/notes-store.ts`, `src/runtime/notes-trash.ts` +12 |  | no | DELETE (U3; canonical half covered by CanonicalNotes*) |  |
| BrowserSession | `src/browser/browser-surface.ts`, `src/prototype/browser-adapter.ts` +1 |  | no | MERGE→BrowserTabLifecycle (U3) |  |
| CredentialVault | `src/passwords/password-manager.ts`, `src/passwords/dev-vault.ts` +2 |  | yes | KEEP |  |
| CredentialVaultReadback | `src/browser/browser-surface.ts`, `src/prototype/browser-adapter.ts` +1 |  | no | MERGE→CredentialVault (U3) |  |
| DevelopmentSurfaces | `src/build-flags.ts`, `src/runtime/mock-admission.ts` +3 |  | yes | KEEP | P-model |
| FilesAndSharing | `src/prototype/file-email-review.ts`, `src/runtime/media-copy-intent.ts` +3 |  | yes | KEEP |  |
| PreferencesAndPresentation | `src/runtime/canvas-geometry.ts`, `src/runtime/text-scale.ts` +5 |  | yes | KEEP |  |
| PreferencesAndPresentationAuditState | `src/runtime/canvas-geometry.ts`, `src/runtime/text-scale.ts` +5 |  | no | DELETE (U3) |  |
| ScheduledTaskControls | `src/prototype/automations-adapter.ts`, `src/prototype/template.html` +4 |  | yes | KEEP |  |
| AppearancePreferenceAdmission | `src/main.tsx`, `src/prototype/settings-adapter.ts` +1 |  | yes | KEEP | P-main |
| DurableStore | `src/browser/domain-document.ts`, `src/browser/json-domain-document.ts` +3 |  | yes | KEEP |  |
| PermissionWalkthrough | `src/startup-permissions.tsx`, `src/startup-permission-progress.ts` +1 |  | no | MERGE→PermissionChoices (U3) |  |
| DevelopmentDevice | `src/prototype/model.js`, `src/browser/device.ts` +3 |  | yes | KEEP; drop Wallet fakePayment (U3) |  |
| PermanentVoiceDeletion | `src/runtime/permanent-voice-deletion.ts`, `src/runtime/note-audio-deletions.ts` +2 |  | yes | KEEP |  |
| PermanentVoiceDeletionAuditLease | `src/runtime/permanent-voice-deletion.ts`, `src/runtime/note-audio-deletions.ts` +2 |  | no | MERGE→PermanentVoiceDeletion (U3) |  |
| DevelopmentHost | `scripts/browser-cloud-dev-bridge.ts`, `scripts/cloud-resident-host.ts` +5 |  | yes | KEEP |  |
| FilesTree | `java/AlphaFilesPlugin.java`, `src/prototype/selection-adapter.ts` |  | yes | KEEP |  |
| CalendarPresentation | `src/prototype/model.js`, `src/prototype/calendar-adapter.ts` +7 |  | yes | REWRITE: drop deleted Google display-hiding (U3) |  |
| FirstSendDraftMigration | `src/prototype/agent-adapter.ts`, `src/runtime/assistant-draft-store.ts` |  | yes | KEEP | P-agent |
| DraftDispatch | `src/prototype/assistant-draft-controller.ts`, `src/runtime/assistant-draft-record.ts` +1 |  | yes | KEEP |  |
| WorkflowRequestRecoveryAdmission | `src/runtime/workflow-request-recovery.ts`, `src/runtime/workflow-intents.ts` +3 |  | yes | KEEP; drop capture (D3) |  |
| EmailSuggestionReview | `src/prototype/use-in-email-review.ts` |  | yes | KEEP | upstream (D14) |
| SharePanelAdmission | `src/runtime/share-panel.ts` |  | yes | KEEP | P-light |
| ShadeNoticeQuestionAdmission | `src/prototype/notifications-adapter.ts`, `src/prototype/context-selection.ts` +2 |  | yes | KEEP | P-notify |
| WorkflowClockAdmission | `src/prototype/clock-adapter.ts`, `src/prototype/agent-adapter.ts` +4 |  | yes | KEEP | P-model |
| NotificationCollection | `src/browser/notification-store.ts`, `src/browser/notifications.ts` +4 |  | yes | KEEP | P-notify |
| CallbackLanding | `apps/app/public/delegation-return.html` |  | yes | KEEP |  |
| ListFocus | `src/prototype/keyed-list-focus.ts`, `src/prototype/subview-accessibility.ts` +1 |  | yes | KEEP | P-light |
| RendererFailureUI | `src/runtime/error-boundary.tsx`, `src/runtime/crash-log.ts` |  | yes | KEEP | P-light |
| NativeViewSubscription | `src/runtime/native-view-events.ts` |  | yes | KEEP | P-light |
| FilesPreview | `scripts/prepare-client-features.ts` |  | yes | KEEP |  |
| PermissionChoices | `src/startup-permissions.tsx`, `src/startup-permission-progress.ts` +2 |  | yes | KEEP | P-light |
| CanonicalNotesController | `src/prototype/canonical-notes-controller.ts` |  | yes | KEEP |  |
| CanonicalNotesDraft | `src/prototype/canonical-notes-editor.ts` |  | yes | KEEP | upstream (D14) |
| CanonicalNotesFeedback | `src/prototype/canonical-notes-ui.ts`, `src/prototype/canonical-notes-controller.ts` |  | yes | KEEP |  |
| CanonicalNotesMutation | `src/prototype/canonical-notes-editor.ts`, `src/prototype/agent-adapter.ts` |  | yes | KEEP | upstream (D14) |
| CanonicalNotesView | `src/prototype/canonical-notes-ui.ts`, `src/prototype/canonical-notes-controller.ts` |  | yes | KEEP | upstream (D14) |
| FilesBrowserController | `src/prototype/selection-adapter.ts` |  | yes | KEEP | upstream (D14) |
| PhotosWindow | `src/prototype/camera-adapter.ts` |  | yes | KEEP | P-photos |
| PhotosTrash | `src/prototype/camera-adapter.ts`, `src/browser/files.ts` |  | yes | KEEP | P-photos |
| FilesFilter | `src/prototype/selection-adapter.ts` |  | yes | KEEP | upstream (D14) |
| GoogleConsentAdmission | `src/runtime/google-connection-ui.tsx`, `src/runtime/google-accounts.ts` +3 |  | yes | KEEP | P-google |
| BrowserDeletionPoll | `src/browser/journal-retention.ts`, `src/browser/calendar.ts` +3 |  | yes | KEEP |  |
| ResidentLiveness | `src/runtime/connection-ui.tsx`, `src/runtime/resident-recovery.ts` +1 |  | yes | KEEP | P-connection |
| HomeFailureNotice | `src/prototype/home-shell.ts` |  | yes | KEEP | P-main |
| LauncherOwnership | `src/prototype/home-shell.ts` |  | yes | KEEP | upstream (D14) |
| LauncherObserver | `src/prototype/home-shell.ts` |  | yes | KEEP | upstream (D14) |
| BrowserJournalRetention | `src/browser/journal-retention.ts`, `src/browser/calendar.ts` +5 |  | yes | KEEP |  |
| GoogleAccessPublication | `src/runtime/google-agent-access.ts`, `src/browser/device-preferences.ts` +2 |  | yes | KEEP |  |
| LauncherFavorites | `src/product/alpha-product.ts`, `src/product/alpha-product-registration.ts` |  | yes | KEEP | upstream (D14) |
| AccessibleToastLifetime | `src/runtime/accessibility-timeout.ts`, `src/prototype/model.js` +2 |  | yes | KEEP | P-model |
| ModalToastForwarding | `src/runtime/toast-layer.ts`, `src/main.tsx` +1 |  | yes | KEEP | P-light |
| HomeGesture | `src/prototype/home-shell.ts` |  | yes | KEEP | P-main |
| ScreenFocusOwnership | `src/runtime/view-focus.ts`, `src/main.tsx` |  | yes | KEEP | upstream (D14) |
| AppInfoHandoffComposition | `src/prototype/home-shell.ts`, `src/native.ts` +2 |  | yes | KEEP | upstream (D14) |
| DrawerInteraction | `src/prototype/home-shell.ts` |  | yes | KEEP | upstream (D14) |
| DockClearanceOwnership | `src/runtime/dock-clearance.ts`, `src/main.tsx` +1 |  | yes | KEEP | P-main |
| MountedUpdateAdmission | `src/main.tsx`, `java/AlphaDevicePlugin.java` |  | yes | KEEP | P-main |
| StartupUpdateAdmission | `src/main.tsx`, `java/AlphaDevicePlugin.java` |  | yes | KEEP | upstream (D14) |
| CanonicalCalendarDraft | `src/prototype/canonical-calendar-drafts.ts`, `src/runtime/canonical-calendar-draft.ts` +2 |  | yes | KEEP |  |
| BrowserReminderOrphan | `src/browser/daily.ts`, `src/browser/clock.ts` +5 |  | yes | REWRITE: drop legacy localStorage import (U3) |  |
| AgentCalendarRefresh | `src/runtime/agent-calendar.ts`, `src/runtime/agent-calendar-client.ts` +2 |  | yes | REWRITE now (U0) |  |
| ReminderOpenIntent | `src/prototype/reminder-adapter.ts`, `src/prototype/automations-adapter.ts` +2 |  | yes | KEEP | P-notify |
| RetainedReminderTapAdmission | `src/prototype/reminder-adapter.ts`, `src/runtime/reminder-creations.ts` +3 |  | no | MERGE→ReminderTapTokens (U3) |  |
| CanonicalNotificationTapAdmission | `src/prototype/notifications-adapter.ts`, `src/main.tsx` +3 |  | yes | KEEP | P-notify |
| AgentCalendarMutation | `src/runtime/agent-calendar.ts`, `src/runtime/agent-calendar-client.ts` +1 |  | yes | REWRITE now (U0) |  |
| AgentCalendarEventReturn | `src/runtime/agent-calendar.ts`, `src/runtime/agent-calendar-client.ts` +2 |  | yes | KEEP; harness fix now (U0) |  |
| ModalScrimOwnership | `src/prototype/chat-overlay-motion-adapter.ts`, `src/prototype/calendar-month-focus.ts` +4 |  | yes | KEEP |  |
| CloudConnectionNotices | `src/runtime/connection-ui.tsx`, `src/runtime/connection-ui.css` +1 |  | yes | KEEP |  |
| MapsRerouteOwnership | `src/prototype/maps-adapter.ts`, `src/prototype/template.html` +4 |  | yes | KEEP | P-maps |
| MapsEventReturn | `src/prototype/maps-adapter.ts`, `src/runtime/maps-event-return.ts` |  | yes | KEEP | P-maps |
| BrowserOwnerReminderRead | `src/runtime/owner-reminder-notification-port.ts`, `src/runtime/owner-reminder-notification-protocol.ts` +1 |  | no | MERGE→BrowserOwnerReminder (U3) |  |
| AgentCalendarSyncControl | `src/runtime/agent-calendar.ts`, `src/runtime/agent-calendar-client.ts` |  | yes | REWRITE now (U0) |  |
| BrowserOwnerReminderAction | `src/runtime/owner-reminder-notification-port.ts`, `src/runtime/owner-reminder-notification-protocol.ts` +1 |  | no | MERGE→BrowserOwnerReminder (U3) |  |
| GoogleCalendarLinkFlow | `src/runtime/google-accounts.ts`, `src/runtime/agent-calendar.ts` |  | yes | KEEP | P-google |
| BrowserHostedResultNotice | `src/browser/hosted-results.ts`, `src/browser/domain-document.ts` +4 |  | yes | KEEP | P-light |
| GoogleCalendarDisconnect | `src/runtime/google-accounts.ts` |  | yes | KEEP | P-google |
| HostedNoticeQuestion | `src/runtime/hosted-notice-question.ts`, `src/browser/content-question.ts` +2 |  | yes | KEEP |  |
| GoogleCalendarLinkPublication | `src/runtime/google-connection-ui.tsx`, `src/runtime/google-connection-return.ts` +1 |  | yes | KEEP | P-google |
| RendererHostedInbox | `src/runtime/digest-inbox.ts`, `src/runtime/hosted-digests.ts` |  | yes | KEEP |  |
| HostedDigestMutation | `src/runtime/hosted-digest-ui.tsx`, `src/runtime/hosted-digests.ts` |  | yes | KEEP; drop legacy journal phase with B297 |  |
| HostedDigestRefresh | `src/runtime/hosted-digest-ui.tsx`, `src/runtime/hosted-digests.ts` |  | yes | KEEP | P-notify |
| HostedBackgroundAdmission | `src/runtime/hosted-background.ts` |  | yes | KEEP | P-light |
| RendererDigestQueue | `src/runtime/digest-inbox.ts` |  | yes | KEEP |  |
| GoogleCalendarAccessChoice | `src/runtime/google-connection-ui.tsx`, `src/runtime/google-connection-return.ts` |  | yes | KEEP | P-google |
| RetainedHomeBrief | `src/runtime/hosted-digests.ts` |  | yes | KEEP |  |
| CanonicalCalendarEditorClose | `src/prototype/canonical-calendar-drafts.ts`, `src/prototype/agent-calendar-adapter.ts` +5 |  | no | MERGE→CanonicalCalendarDraft (U3) |  |
| CanonicalCalendarDraftHandoff | `src/prototype/agent-calendar-adapter.ts`, `src/prototype/canonical-calendar-drafts.ts` +5 |  | no | MERGE→CanonicalCalendarDraft (U3) |  |
| CameraPreviewRetirement | `src/prototype/camera-adapter.ts`, `src/prototype/browser-camera.ts` +2 |  | yes | KEEP |  |
| SourceRenewalQuestion | `src/runtime/hosted-digest-ui.tsx`, `src/runtime/source-renewal-question.ts` +2 |  | yes | KEEP |  |
| NotesRecorderMediaAdmission | `src/prototype/voice-adapter.ts`, `src/prototype/note-recorder.ts` +7 |  | yes | KEEP |  |
| BrowserFilesTrash | `src/browser/files.ts` |  | yes | KEEP |  |
| ChatAttachments | `src/prototype/agent-adapter.ts`, `src/runtime/alpha-client.ts` +5 |  | yes | KEEP | P-agent |
| BrowserExternalHandoff | `src/prototype/browser-external-handoff.ts`, `src/prototype/browser-adapter.ts` |  | yes | KEEP | P-light |
| ClientObservationSupport | `src/runtime/client-observation-support.ts`, `src/runtime/connection-ui.tsx` |  | yes | KEEP |  |
| ObservationTurnDispatch | `src/runtime/connection-ui.tsx`, `src/runtime/client-observation-support.ts` +2 |  | yes | KEEP | P-agent |
| PhotosOwnedAlbumDialog | `src/prototype/camera-adapter.ts`, `src/prototype/template.html` |  | yes | KEEP | P-photos |
| BrowserAlbumStorage | `src/prototype/browser-camera.ts`, `src/prototype/camera-adapter.ts` +3 |  | yes | KEEP |  |
| ShadeRowCustody | `src/prototype/notifications-adapter.ts`, `src/prototype/template.html` |  | yes | KEEP | P-notify |
| AutomaticAppUpdateSchedule | `src/prototype/settings-adapter.ts` |  | yes | KEEP | P-settings |
| KeyboardFocus | `src/prototype/chat-overlay-motion-adapter.ts`, `java/MainActivity.java` |  | no | MERGE→KeyboardDetectors (U3) |  |
| SettingsPageFocus | `src/prototype/model.js` |  | yes | KEEP | P-model |
| CalendarFormControls | `src/prototype/model.js`, `src/prototype/calendar-form-inputs.ts` +1 |  | yes | KEEP | P-model |
| OSDefaults | `android/aosp/branding/core-launcher/AlphaCoreLauncherPolicy.java`, `android/aosp/branding/core-launcher/AlphaQsDefaultsPolicy.java` +1 |  | yes | KEEP |  |
| OSProvisioning | `android/aosp/branding/provision/AlphaFreshSetupPolicy.java`, `android/aosp/branding/provision/AlphaFreshPresets.java` +2 |  | yes | KEEP |  |
| OSSourceStaging | `scripts/stage-alpha-os-branding.py`, `scripts/generate-alpha-os-branding.ts` +1 |  | yes | KEEP |  |
| AccountSheet | `src/runtime/connection-ui.tsx`, `src/runtime/cloud-membership-ui.tsx` +1 |  | yes | KEEP | P-connection |
| SavedServiceRead | `src/runtime/agent-calendar.ts`, `src/prototype/agent-calendar-adapter.ts` +1 |  | yes | KEEP |  |
| CloudPlanRecheck | `src/runtime/connection-ui.tsx` |  | yes | KEEP | P-connection |
| VoiceTranscriptFollow | `src/prototype/model.js`, `src/prototype/voice-adapter.ts` +2 |  | yes | KEEP | P-model |
| DeviceActionReview | `src/runtime/device-actions.ts`, `src/runtime/alpha-client.ts` +1 |  | yes | KEEP |  |
| CalendarApprovalReview | `src/runtime/calendar-approval-client.ts`, `src/runtime/calendar-approval.ts` +2 |  | yes | KEEP |  |
| BrowserNoteRecordingJournal | `src/browser/note-recording-journal.ts` |  | yes | KEEP |  |
| ScheduledSnoozeAdmission | `src/runtime/automations-protocol.ts`, `src/runtime/workflow-local-time.ts` |  | yes | KEEP |  |
| ComposerSend | `src/prototype/agent-adapter.ts`, `src/prototype/maps-chat-adapter.ts` +1 |  | yes | KEEP | P-agent |
| RecorderStage | `src/prototype/voice-adapter.ts`, `src/runtime/native-live-voice.ts` |  | yes | KEEP |  |
| StoppedReplyReconciliation | `src/runtime/connection-ui.tsx` |  | yes | KEEP |  |
| ApprovalRoutes | `src/prototype/agent-adapter.ts`, `src/runtime/alpha-client.ts` +1 |  | yes | KEEP |  |
| ReadReplyLease | `src/prototype/agent-adapter.ts`, `src/runtime/connection-ui.tsx` |  | yes | KEEP |  |
| PendingActionRecovery | `src/prototype/agent-adapter.ts`, `src/runtime/connection-ui.tsx` |  | yes | KEEP | P-agent |
| OwnNoticeQuestion | `src/prototype/own-notice-question.ts` |  | yes | KEEP | P-light |
| ReadAloud | `src/prototype/local-speech-playback.ts`, `src/prototype/voice-adapter.ts` |  | yes | KEEP |  |
| VoiceSurfaceRetirement | `src/prototype/voice-adapter.ts`, `src/prototype/agent-adapter.ts` |  | yes | KEEP |  |
| BrowserTabLifecycle | `src/prototype/browser-adapter.ts` |  | yes | KEEP | P-browser |
| BrowserSessionPersistence | `src/browser/browser-poll.ts`, `src/prototype/browser-adapter.ts` |  | yes | KEEP | P-browser |
| BookmarksHydration | `src/prototype/browser-adapter.ts`, `src/browser/browser-surface.ts` +2 |  | yes | KEEP | P-browser |
| FindInPage | `src/prototype/browser-adapter.ts` |  | yes | KEEP | P-browser |
| BrowserReviews | `src/browser/review.ts`, `src/browser/screen-locked.ts` +1 |  | yes | KEEP |  |
| AddressInput | `src/prototype/browser-adapter.ts` |  | yes | KEEP | P-browser |
| PasswordProviderDialog | `src/browser/password-provider.ts`, `src/browser/dev-profile.ts` +1 |  | yes | KEEP |  |
| BrowserSurfaceNavigation | `src/browser/browser-surface.ts` |  | yes | KEEP |  |
| BrowserSurfacePresentation | `src/prototype/browser-adapter.ts`, `src/browser/browser-poll.ts` |  | yes | KEEP | P-browser |
| CalendarDeviceWrites | `src/prototype/calendar-adapter.ts`, `java/CalendarCreationStore.java` +1 |  | yes | KEEP |  |
| CalendarAgentSelection | `src/prototype/calendar-adapter.ts` |  | yes | KEEP | P-light |
| ReminderIntents | `src/runtime/reminder-creations.ts`, `src/runtime/reminder-deletions.ts` +2 |  | yes | KEEP |  |
| ReminderTapTokens | `src/prototype/reminder-adapter.ts` |  | yes | KEEP |  |
| ReminderRefresh | `src/prototype/reminder-adapter.ts`, `src/prototype/calendar-adapter.ts` +1 |  | yes | KEEP |  |
| BrowserAlarmRinging | `src/browser/clock.ts`, `src/browser/alert-audio.ts` |  | yes | KEEP |  |
| DayAnchor | `src/prototype/calendar-adapter.ts`, `src/prototype/calendar-form-draft-adapter.ts` +4 |  | yes | KEEP | P-light |
| ReminderTodoAttempt | `src/prototype/reminder-adapter.ts`, `src/runtime/reminder-creations.ts` |  | yes | KEEP |  |
| SignInChooser | `src/runtime/connection-ui.tsx`, `src/runtime/cloud-sign-in-ui.tsx` +1 |  | yes | KEEP |  |
| ConnectionController | `src/runtime/connection-ui.tsx` |  | yes | KEEP | P-connection |
| DelegationReceiver | `src/runtime/cloud-delegation-ui.tsx`, `java/AlphaConnectionPlugin.java` +1 |  | yes | KEEP | P-light |
| ViewAdmission | `src/runtime/image-contacts.ts`, `src/prototype/mvp-features.ts` +2 |  | yes | KEEP |  |
| SettingsListenerReads | `src/prototype/settings-adapter.ts`, `src/runtime/always-on-listener.ts` |  | yes | KEEP | P-settings |
| MediaCopyIntent | `src/runtime/media-copy-intent.ts` |  | yes | KEEP |  |
| FilesRecentIndex | `src/prototype/files-index.ts`, `src/prototype/selection-adapter.ts` +1 |  | yes | KEEP | P-light |
| PhotoLibraryAgentReview | `src/prototype/photo-library-adapter.ts` |  | yes | KEEP |  |
| AgentPhotoRequest | `src/prototype/camera-adapter.ts` |  | yes | KEEP |  |
| CameraFocusWrites | `src/browser/camera-focus.ts` |  | yes | KEEP |  |
| NotesDocumentTransfer | `src/prototype/notes-document-adapter.ts` |  | yes | KEEP; drop import half (U3) |  |
| BackDispatch | `src/prototype/agent-adapter.ts`, `src/prototype/home-shell.ts` +2 |  | yes | KEEP | P-agent |
| ChatDock | `src/prototype/chat-overlay-motion-adapter.ts`, `src/prototype/model.js` +1 |  | yes | KEEP | P-main |
| KeyboardGeometry | `src/runtime/canvas-geometry.ts`, `src/main.tsx` |  | yes | KEEP |  |
| ShellScreen | `src/prototype/model.js`, `src/prototype/template.html` +1 |  | yes | KEEP; drop Wallet secure branch (U3) |  |
| SettingsSession | `src/prototype/settings-adapter.ts`, `src/browser/device.ts` |  | yes | KEEP | P-settings |
| HomeSurface | `src/prototype/home-cards.ts`, `src/prototype/data-adapter.ts` |  | yes | KEEP |  |
| PhoneCall | `src/prototype/model.js` |  | no | DELETE (U3) |  |
| PhoneRecents | `src/prototype/phone-adapter.ts`, `src/runtime/aosp-telephony.ts` +1 |  | yes | KEEP |  |
| InertHold | `src/runtime/modal-inert.ts`, `src/runtime/inline-modal.ts` |  | yes | KEEP | P-light |
| ShadePull | `src/prototype/system-shade.ts`, `src/prototype/model.js` |  | yes | KEEP | P-model |
| VoiceOwnedNavigation | `src/prototype/voice-adapter.ts` |  | yes | KEEP | P-voice |
| QuietVoiceRetry | `src/prototype/voice-adapter.ts`, `src/runtime/cloud-voice.ts` |  | yes | KEEP | P-voice |
| VoiceTurnReview | `src/prototype/voice-adapter.ts` |  | no | DELETE with the D8 review send policy in voice-adapter.ts (U3) |  |
| SelectedDocumentViewer | `src/browser/selected-document-viewer.ts`, `src/browser/files.ts` |  | yes | KEEP |  |
| ReminderDecision | `src/prototype/reminder-adapter.ts`, `src/runtime/reminder-deletions.ts` +1 |  | yes | KEEP |  |
| SettingsReads | `src/prototype/settings-adapter.ts` |  | no | MERGE→SettingsCapabilityReads+SettingsSession (U3) |  |
| SignInReadinessProbe | `src/runtime/connection-ui.tsx` |  | yes | KEEP |  |
| DevBridgeSignIn | `scripts/browser-cloud-dev-bridge.ts` |  | yes | KEEP |  |
| MapsShareChoice | `src/prototype/maps-adapter.ts`, `src/runtime/action-message-presentation.ts` |  | yes | KEEP | P-light |
| MapPlaneOwnership | `src/prototype/maps-adapter.ts`, `src/maps/map-plane.ts` +1 |  | yes | KEEP | P-maps |
| KeyboardDetectors | `src/prototype/chat-overlay-motion-adapter.ts`, `src/runtime/canvas-geometry.ts` +1 |  | yes | KEEP | P-main |
| FixtureBusyLatch | `src/prototype/model.js` |  | yes | KEEP | P-model |
| SettingsCapabilityReads | `src/prototype/settings-adapter.ts` |  | yes | KEEP | P-settings |
| InlineModalFocus | `src/runtime/inline-modal.ts` |  | yes | KEEP |  |

#### services (78)

| Model | Main product sources | Upstream-only | Survives | Verdict | Port unit |
|---|---|---|---|---|---|
| IdentitySession | `src/runtime/cloud-sign-in.ts`, `src/runtime/cloud-sign-in-ui.tsx` +3 |  | yes | KEEP |  |
| ServiceAuthorization | `src/runtime/subscription-entitlement.ts`, `src/runtime/managed-service-routes.ts` +1 |  | yes | KEEP |  |
| GoogleAccounts | `src/runtime/google-accounts.ts`, `src/runtime/google-authorization.ts` +6 |  | yes | KEEP |  |
| CalendarSync | `src/runtime/agent-calendar.ts`, `src/runtime/agent-calendar-client.ts` +5 |  | yes | KEEP |  |
| InboxDelivery | `src/runtime/inbox-operation.ts`, `src/runtime/inbox-local-store.ts` +5 |  | yes | KEEP |  |
| MapsNavigation | `src/maps/device-navigation.ts`, `src/maps/agent-navigation.ts` +6 |  | no | MERGE→MapsNavigationGuidanceReadback, renamed MapsNavigation (U3) |  |
| MapsNavigationGuidanceReadback | `src/maps/device-navigation.ts`, `src/maps/agent-navigation.ts` +11 |  | yes | KEEP |  |
| WorkflowExecution | `src/runtime/phone-workflow-authoring.ts`, `src/runtime/workflow-protocol.ts` +7 |  | yes | KEEP | P-workflow |
| WorkflowExecutionAuditAdmission | `src/runtime/phone-workflow-authoring.ts`, `src/runtime/workflow-protocol.ts` +7 |  | no | MERGE→WorkflowExecution (U3) |  |
| NoticesAndCaches | `src/runtime/service-read-cache.ts`, `src/runtime/service-read-cache-store.ts` +5 |  | no | MERGE cache half→ServiceReadCache; notice half dropped (U3) |  |
| BrowserSiteState | `java/AlphaBrowserPlugin.java` |  | yes | KEEP |  |
| BrowserReadingState | `src/browser/reading-review.ts`, `src/browser/content-question.ts` |  | yes | KEEP |  |
| BrowserDownloads | `java/AlphaBrowserPlugin.java` |  | yes | KEEP |  |
| ScanDocument | `src/prototype/scan-document.ts`, `src/browser/scan-draft.ts` +3 |  | yes | KEEP |  |
| NativeCredentialMutation | `java/AlphaCredentialStore.java`, `java/AlphaLocalAgentPlugin.java` +5 |  | yes | KEEP |  |
| PdfWorker | `java/IsolatedPdfService.java` |  | yes | KEEP |  |
| InboxCoordinator | `src/prototype/inbox-cloud-adapter.ts`, `src/prototype/inbox-provider-controls.ts` +8 |  | yes | KEEP |  |
| InboxProviderDrafts | `src/prototype/inbox-cloud-adapter.ts`, `src/prototype/inbox-provider-controls.ts` +9 |  | yes | KEEP |  |
| CalendarLinkedSync | — | yes | yes | KEEP |  |
| WorkflowEngineAdmission | — | yes | yes | KEEP |  |
| WorkflowWakeups | — | yes | yes | KEEP |  |
| LifeOpsScheduledTaskRoute | — | yes | yes | KEEP |  |
| PersonalAssistantScheduledTaskCustody | — | yes | yes | KEEP |  |
| WorkflowScheduleTasks | — | yes | yes | KEEP |  |
| CoreRuntimeRetirement | — | yes | yes | KEEP |  |
| CoreServiceLifecycle | — | yes | yes | KEEP |  |
| CoreRuntimeShutdown | — | yes | yes | KEEP |  |
| TaskServiceLifecycle | `scripts/core-state-patch.ts` |  | yes | KEEP |  |
| CanonicalNotesStore | — | yes | yes | KEEP |  |
| CoreTurnControllers | — | yes | yes | KEEP |  |
| TaskSchedulerRuntime | `scripts/core-state-patch.ts` |  | yes | KEEP |  |
| PilotApkUpdate | `scripts/pilot-update.ts`, `scripts/android-instrumentation.ts` +4 |  | yes | KEEP |  |
| EmbeddingStoreIdentity | — | yes | yes | KEEP |  |
| FactWriteScope | — | yes | yes | KEEP |  |
| NativeGoogleAccessFile | `java/GoogleAgentAccessFile.java`, `java/AlphaLocalAgentPlugin.java` +1 |  | yes | KEEP |  |
| NamedEmbeddingProvenance | — | yes | yes | KEEP |  |
| CombinedAgentLauncher | `scripts/start-combined-agent.ts`, `scripts/combined-agent-source.ts` +5 |  | yes | KEEP |  |
| ReviewedWorkflowLauncher | `scripts/start-reviewed-workflow-agent.ts`, `scripts/local-agent-source.ts` +6 |  | no | DELETE with start-reviewed-workflow-agent.ts (U3) |  |
| CoreConnectorCustody | `scripts/core-state-patch.ts` |  | yes | KEEP |  |
| MobileBundleAdmission | `scripts/mobile-uuid-adapter.ts`, `scripts/core-state-patch.ts` +2 |  | yes | KEEP |  |
| BrowserGoogleReturn | `scripts/browser-cloud-dev-bridge.ts`, `src/runtime/google-connection-ui.tsx` |  | yes | KEEP | P-workflow |
| WorkflowWorkerStaging | `scripts/workflow-worker-artifact.ts`, `scripts/stage-workflow-worker.ts` |  | no | DELETE; scenarios → test/workflow-worker-staging.test.mjs (U3) |  |
| NativeGoogleHostArtifact | `scripts/native-google-host-artifact.ts`, `scripts/build-native-google-host.ts` +19 |  | yes | KEEP |  |
| PreparedSourceStamp | `scripts/prepare-local-agent.ts`, `scripts/local-agent-source.ts` +1 |  | no | DELETE with prepare-local-agent --requalify-from (U3) |  |
| CloudQaLauncher | `scripts/start-cloud-qa.ts`, `scripts/core-state-preload.ts` +3 |  | yes | KEEP |  |
| BrowserCloudRequestCustody | `scripts/browser-cloud-dev-bridge.ts` |  | yes | KEEP |  |
| GmailAgentMailboxRecovery | `src/runtime/cloud-protocol.ts` |  | yes | KEEP |  |
| DevelopmentDigestPending | `src/runtime/local-agent-storage.ts`, `scripts/local-agent-dev-storage.ts` +1 |  | yes | KEEP |  |
| AndroidGzipAssetStage | `scripts/android-gzip-assets.ts`, `scripts/build-android.ts` +1 |  | yes | KEEP |  |
| AndroidBuildInputReadiness | `scripts/android-build-preflight.ts`, `scripts/build-embedding-host.ts` +3 |  | yes | KEEP |  |
| AndroidBrowserModuleStage | `android/consumer-host.json`, `scripts/android-host.ts` +2 |  | yes | KEEP |  |
| ResidentJavaSourceStage | `scripts/stage-local-agent-sources.ts`, `scripts/local-agent-source.ts` +2 |  | yes | KEEP |  |
| ClientFeaturePublication | `scripts/prepare-client-features.ts`, `scripts/upstream-native-source.ts` |  | yes | KEEP |  |
| AppUpdateCandidate | `scripts/app-update-candidate.ts`, `scripts/deliver-app-update.ts` +2 |  | yes | KEEP |  |
| ProtectedAppUpdatePromotion | `.github/workflows/resident-android.yml`, `.github/workflows/release-cloud-app-signing.yml` +13 |  | yes | KEEP | P-workflow |
| PreparedWorkflowWorker | `scripts/prepared-workflow-worker.ts`, `scripts/local-agent-source.ts` +2 |  | yes | KEEP |  |
| WebReadingReview | `src/browser/reading-review.ts`, `src/prototype/browser-adapter.ts` |  | yes | KEEP |  |
| SmsSend | `src/prototype/sms-adapter.ts`, `src/runtime/image-sms.ts` +1 |  | yes | KEEP |  |
| ContactsSession | `src/prototype/contacts-adapter.ts`, `src/runtime/image-contacts.ts` +1 |  | yes | KEEP |  |
| PhoneSession | `src/prototype/phone-adapter.ts`, `src/runtime/aosp-telephony.ts` +1 |  | yes | KEEP |  |
| PlanAdmissionGrace | `src/runtime/connection-ui.tsx`, `src/runtime/subscription-entitlement.ts` |  | yes | KEEP | P-workflow |
| InboxListPaging | `src/prototype/inbox-cloud-adapter.ts` |  | yes | KEEP | P-workflow |
| ServiceReadCache | `src/runtime/service-read-cache.ts`, `src/runtime/service-read-cache-store.ts` +2 |  | yes | KEEP |  |
| ApprovalDecision | `src/prototype/workflow-adapter.ts`, `src/runtime/workflow-protocol.ts` +1 |  | yes | KEEP | P-workflow |
| WorkflowAuthoring | `src/prototype/workflow-authoring.ts`, `src/runtime/workflow-protocol.ts` +1 |  | yes | KEEP | P-workflow |
| TriggerCursor | `src/browser/workflow-trigger-runtime.ts`, `src/browser/workflow-triggers.ts` |  | yes | KEEP |  |
| WorkflowNoticeTaps | `src/prototype/workflow-adapter.ts`, `src/runtime/workflow-device-contract.ts` +2 |  | yes | KEEP | P-workflow |
| InboxEditCoalescer | `src/runtime/inbox-edit-coalescer.ts`, `src/prototype/inbox-unsaved.ts` +1 |  | yes | KEEP |  |
| WorkflowLifecycleChange | `src/prototype/workflow-adapter.ts`, `src/runtime/workflow-protocol.ts` +1 |  | yes | KEEP | P-workflow |
| MapsConnection | `src/maps/cloud-maps.ts`, `src/maps/agent-navigation.ts` +5 |  | yes | KEEP | P-maps |
| MapsScreenModes | `src/prototype/maps-adapter.ts`, `src/maps/screen.ts` +2 |  | yes | KEEP |  |
| SystemPickerVisibility | `src/prototype/scan-pdf.ts`, `src/browser/file-picker.ts` +5 |  | yes | KEEP |  |
| ScanReviewDialogs | `src/prototype/scan-review.ts`, `src/prototype/scan-searchable-review.ts` +2 |  | yes | KEEP | P-workflow |
| MmsCompose | `src/prototype/sms-adapter.ts`, `src/runtime/image-sms.ts` +1 |  | yes | KEEP | P-workflow |
| AutomationRequestSettlement | `src/prototype/automations-adapter.ts`, `src/runtime/automations-protocol.ts` +1 |  | yes | KEEP | P-workflow |
| MapsGuidanceVoice | `src/maps/navigation-voice.ts`, `src/prototype/maps-adapter.ts` |  | yes | KEEP |  |
| ResidentMapsRelayOffer | `src/maps/resident-relay.ts`, `src/maps/agent-navigation.ts` +1 |  | yes | KEEP |  |
| CoreApprovalServiceCurrent | — | yes | yes | KEEP |  |

#### native (85)

| Model | Main product sources | Upstream-only | Survives | Verdict | Port unit |
|---|---|---|---|---|---|
| ResidentRuntime | `src/runtime/local-agent.ts`, `src/runtime/local-agent-native-events.ts` +9 |  | yes | KEEP |  |
| VoiceSession | `src/runtime/voice-assistant.ts`, `src/runtime/native-live-voice.ts` +8 |  | yes | KEEP |  |
| SpeechResources | `src/local-speech-playback.ts` |  | yes | KEEP |  |
| AlwaysOnListener | `src/runtime/always-on-listener.ts`, `android/sense/src/main/java/ai/alphacompute/alphaphone/sense/ListeningService.java` +2 |  | no | MERGE→AlwaysOnListenerIndicatorReadback, renamed AlwaysOnListener (U3) |  |
| AlwaysOnListenerIndicatorReadback | `src/runtime/always-on-listener.ts`, `android/sense/src/main/java/ai/alphacompute/alphaphone/sense/ListeningService.java` +2 |  | yes | KEEP as merge target, rename AlwaysOnListener (U3) |  |
| ResetRecovery | `java/AlphaDataReset.java`, `java/ResetRecoveryActivity.java` +3 |  | yes | KEEP | J4 |
| DeletionJournal | `java/NativeDeletionCoordinator.java`, `java/DeletionWorker.java` +5 |  | yes | KEEP |  |
| MediaLifecycle | `src/runtime/photo-library.ts`, `src/prototype/browser-camera.ts` +6 |  | yes | KEEP |  |
| DeviceActions | `src/runtime/aosp-telephony.ts`, `src/runtime/aosp-image.ts` +8 |  | no | DELETE (U3) |  |
| ApplicationComposition | `src/runtime/connection-ui.tsx`, `src/runtime/cloud-protocol.ts` +5 |  | yes | KEEP |  |
| NavigationProgress | `src/prototype/maps-adapter.ts`, `src/maps/guidance.ts` +9 |  | yes | KEEP |  |
| ListenerLeaseRecovery | `android/sense/src/main/java/ai/alphacompute/alphaphone/sense/SenseApplication.java`, `android/sense/src/main/java/ai/alphacompute/alphaphone/sense/ListeningService.java` |  | no | MERGE crash half→NativeListenerStore (U3) |  |
| StreamingPlayback | — | yes | yes | KEEP |  |
| ResidentScheduling | `java/ResidentScheduleRearm.java`, `java/ResidentScheduleReceiver.java` +1 |  | no | MERGE→ResidentSchedulingServiceAdmission, renamed ResidentScheduling (U3) |  |
| ResidentSchedulingServiceAdmission | `java/ResidentScheduleRearm.java`, `java/ResidentScheduleReceiver.java` +1 |  | yes | KEEP as merge target (U3) |  |
| RendererRecovery | `java/RendererRecoveryBudget.java`, `java/MainActivity.java` +1 |  | yes | KEEP |  |
| VadSegmentation | — | yes | yes | KEEP |  |
| VoiceIpcAssembly | `java/NativeVoiceBinding.java`, `java/VoiceEventAdmission.java` |  | yes | KEEP |  |
| ListenerLeaseProducer | — | yes | yes | KEEP |  |
| NativeNoteRecordingService | `java/AlphaNoteRecordingService.java`, `java/AlphaNoteRecorder.java` |  | yes | KEEP |  |
| NativeNoteRecording | `java/AlphaNoteRecorder.java` |  | yes | KEEP |  |
| NativeVoiceDraft | — | yes | yes | KEEP |  |
| NativeNotePermission | `java/AlphaVoiceCloudPlugin.java`, `java/AlphaNoteRecorder.java` +1 |  | yes | KEEP |  |
| ControllerComposition | `src/runtime/connection-ui.tsx`, `src/runtime/cloud-protocol.ts` +2 |  | no | DELETE (U3; harness imports deleted calendar-sync-host.ts) |  |
| SharedRecordingAdmission | — | yes | yes | KEEP |  |
| NativeLiveCapture | — | yes | yes | KEEP |  |
| NativeAsrPipe | — | yes | yes | KEEP |  |
| NativePipedCapture | — | yes | yes | KEEP |  |
| NativeCaptureFrames | — | yes | yes | KEEP |  |
| NativeIndicatorProvider | `android/sense/build.gradle` |  | yes | KEEP |  |
| NativeListenerStore | — | yes | yes | KEEP |  |
| NativeListenerService | — | yes | yes | KEEP |  |
| NativeSpeechWarmup | — | yes | yes | KEEP |  |
| NativeRecognizerAvailability | — | yes | yes | KEEP |  |
| NativeOnDeviceRecognizer | — | yes | yes | KEEP |  |
| NativeListenerInput | — | yes | yes | KEEP |  |
| NativeSpeechGate | — | yes | yes | KEEP |  |
| NativeSpeechOutputPreparation | — | yes | yes | KEEP |  |
| BatchCaptureCompletion | `src/prototype/voice-adapter.ts`, `src/runtime/cloud-voice.ts` |  | yes | KEEP | P-voice |
| ReviewedCopies | `java/ReviewedCopies.java`, `java/AlphaMailAttachmentsPlugin.java` +2 |  | yes | KEEP |  |
| GoogleBrowserReturnClaim | — | yes | yes | KEEP |  |
| NativeNavigationOwnership | `java/AlphaMapsTransportPlugin.java`, `java/AlphaNavigationService.java` |  | yes | KEEP |  |
| RuntimeUpdatePause | `java/AlphaDevicePlugin.java`, `java/AlphaApplication.java` +1 |  | yes | KEEP | J1 |
| NativeUpdateActivation | `java/AlphaDevicePlugin.java`, `java/AlphaUpdateStatusReceiver.java` +2 |  | yes | KEEP | J1 |
| CanonicalNotificationTap | `java/AlphaCanonicalNotifications.java`, `java/AlphaNotificationsPlugin.java` +1 |  | yes | KEEP | J4 |
| NativeUpdateComposition | `java/AlphaDevicePlugin.java`, `java/AlphaUpdateStatusReceiver.java` +2 |  | yes | KEEP | J1 |
| WorkflowNoticeDelivery | `java/AlphaNotificationsPlugin.java`, `java/WorkflowNoticeDelivery.java` +3 |  | yes | KEEP | J4 |
| NativeUpdateStaging | `src/prototype/settings-adapter.ts`, `java/AlphaDevicePlugin.java` +3 |  | yes | KEEP | P-settings + J1 |
| NativeHostedResultNotices | `java/HostedResultNotices.java`, `java/AlphaHostedResultsPlugin.java` +2 |  | yes | KEEP | J3 |
| NativeHostedInbox | `java/HostedInbox.java`, `java/HostedDelivery.java` +3 |  | yes | KEEP |  |
| NativeReminderDelivery | `java/AlphaReminders.java`, `java/ReminderReceiver.java` +1 |  | yes | KEEP |  |
| NativeClockReview | `java/ClockAgentReview.java`, `java/AlphaActionJournalPlugin.java` +2 |  | yes | KEEP | J4 |
| NativeSmsDispatch | `java/AlphaTelephony.java`, `java/AlphaTelephonyPlugin.java` +4 |  | yes | KEEP |  |
| NativeMmsDispatch | `java/AlphaTelephony.java`, `java/AlphaTelephonyPlugin.java` +4 |  | yes | KEEP |  |
| NativeTextScaleLifecycle | `java/AlphaDevicePlugin.java`, `java/MainActivity.java` +1 |  | yes | KEEP | J1 |
| NativeCrashJournal | `java/AlphaDevicePlugin.java`, `java/PluginWorkers.java` +1 |  | yes | KEEP | J1 |
| NativeSettingsHandoff | `java/AlphaDevicePlugin.java`, `java/PasswordProviderSupport.java` +1 |  | yes | KEEP | J1 |
| NativeAppInfoHandoff | `java/AlphaSystemPlugin.java`, `android/consumer-host.json` |  | yes | KEEP |  |
| NativeSourceRenewal | `java/SourceRenewalNotices.java`, `java/SourceRenewalHost.java` +2 |  | yes | KEEP | J3 |
| NativeAssistantEntry | `java/AlphaAssistActivity.java`, `java/AlphaPowerVoiceActivity.java` +5 |  | yes | KEEP | J2 |
| NativeActionRecovery | `java/AlphaActionJournal.java`, `java/AlphaActionJournalPlugin.java` +1 |  | yes | KEEP | J4 |
| BrowserUnderlay | — | yes | yes | KEEP |  |
| NativeGmailBackground | `java/GmailBackground.java`, `java/GmailDeliveryWorker.java` +5 |  | yes | KEEP | J4 |
| NativeDigestConsent | `java/NativeDigestSources.java`, `java/NativeDigestHost.java` +2 |  | yes | KEEP | J3 |
| NativeCalendarScopedReview | `java/CalendarScopedDeletionReview.java`, `java/CalendarDeletionIdentity.java` +1 |  | yes | KEEP |  |
| NativeCalendarSyncEnable | `java/CalendarSyncBridge.java`, `java/CalendarSyncConsent.java` +8 |  | yes | KEEP |  |
| KeyboardDictation | `java/KeyboardDictationPolicy.java`, `java/KeyboardDictationCloud.java` +3 |  | yes | KEEP |  |
| KeyboardDictationCloud | `java/KeyboardDictationCloud.java`, `java/KeyboardDictationPolicy.java` +2 |  | yes | KEEP |  |
| NativeDeletionReviewAdmission | `java/DeletionReviewAdmission.java` |  | yes | KEEP |  |
| SpeechCleanupLatch | `src/prototype/voice-adapter.ts`, `src/prototype/local-speech-playback.ts` +3 |  | yes | KEEP | P-light |
| RendererSpeechChunk | `src/local-speech-playback.ts` |  | yes | KEEP | P-light |
| NativeStreamBridge | `src/runtime/local-agent-native-stream.ts` |  | yes | KEEP |  |
| NativeMapsLocation | `src/maps/native-location.ts`, `src/prototype/maps-adapter.ts` +1 |  | yes | KEEP; MOVE to application/ (U3) |  |
| VideoRecorder | `src/browser/video-capture.ts`, `src/prototype/camera-adapter.ts` |  | yes | KEEP |  |
| VideoEditReview | `src/prototype/video-edit-review.ts`, `src/browser/video-edit.ts` |  | yes | KEEP |  |
| CopyReceipt | `src/prototype/browser-camera.ts` |  | no | DELETE (U3) |  |
| HomeInstanceHandoff | `java/MainActivity.java` |  | yes | KEEP |  |
| ResidentStartCancel | `java/AlphaLocalAgentPlugin.java`, `java/ResidentCredentialShutdownRetry.java` +1 |  | yes | KEEP |  |
| RendererBackgroundRebuild | `java/RendererRecoveryBudget.java`, `java/MainActivity.java` +1 |  | yes | KEEP |  |
| NativeRequestWithdrawal | `java/AlphaLocalAgentPlugin.java`, `java/PluginWorkers.java` +1 |  | yes | KEEP | J2 |
| ContactsBook | `src/runtime/telephony-executor.ts`, `src/prototype/contacts-adapter.ts` |  | yes | KEEP |  |
| MessageThreads | `src/runtime/message-draft.ts`, `src/prototype/sms-adapter.ts` +1 |  | yes | KEEP |  |
| PhoneCalls | `src/runtime/telephony-executor.ts`, `src/prototype/phone-adapter.ts` +1 |  | yes | KEEP |  |
| Voicemail | `src/runtime/voicemail-state.ts`, `src/prototype/phone-adapter.ts` +1 |  | yes | KEEP |  |
| TelephonyAttention | `src/prototype/telephony-attention.ts`, `src/prototype/telephony-presenters.ts` +1 |  | yes | KEEP |  |

#### legacy (27)

| Model | Main product sources | Upstream-only | Survives | Verdict | Port unit |
|---|---|---|---|---|---|
| SignIn | `src/runtime/connection-ui.tsx`, `src/runtime/cloud-sign-in-ui.tsx` |  | no | DELETE (U2) |  |
| GoogleConnect | `src/runtime/google-connection-ui.tsx`, `src/runtime/cloud-protocol.ts` |  | no | DELETE (U2) |  |
| Calendar | `src/prototype/calendar-adapter.ts` |  | no | DELETE (U2) |  |
| Maps | `src/maps/cloud-provider.ts`, `src/maps/agent-navigation.ts` +1 |  | no | DELETE (U2) |  |
| ChatInput | `src/prototype/model.js`, `src/prototype/chat-overlay-motion-adapter.ts` |  | no | DELETE (U2) |  |
| HomeLayout | `src/prototype/template.html`, `src/prototype/phone.css` +1 |  | no | DELETE (U2) |  |
| SettingsNav | `src/prototype/model.js`, `src/prototype/settings-adapter.ts` |  | no | DELETE (U2) |  |
| CameraSession | `specs/quint/legacy/view-refresh-configurations.json`, `specs/quint/legacy/check-view-refresh.mjs` |  | no | DELETE (U2) |  |
| PhotosLibrary | `specs/quint/legacy/view-refresh-configurations.json`, `specs/quint/legacy/check-view-refresh.mjs` |  | no | DELETE (U2) |  |
| NotesView | `specs/quint/legacy/view-refresh-configurations.json`, `specs/quint/legacy/check-view-refresh.mjs` |  | no | DELETE (U2) |  |
| FilesBrowser | `specs/quint/legacy/view-refresh-configurations.json`, `specs/quint/legacy/check-view-refresh.mjs` |  | no | DELETE (U2) |  |
| CoreFactWriteDedupe | — | yes | no | DELETE (U2) |  |
| CoreSemaphore | — | yes | no | DELETE (U2) |  |
| CoreSerialise | — | yes | no | DELETE (U2) |  |
| CoreProviderExecution | — | yes | no | DELETE (U2) |  |
| CoreActionSettlement | — | yes | no | DELETE (U2) |  |
| CoreApprovalService | — | yes | no | DELETE (U2) |  |
| CoreInteractionSession | — | yes | no | DELETE (U2) |  |
| CoreInteractiveTask | — | yes | no | DELETE (U2) |  |
| CoreEmbeddingDimension | — | yes | no | DELETE (U2) |  |
| CoreRoomHandlerQueue | — | yes | yes | MOVE → services/CoreRoomHandlerQueue.qnt (U1) |  |
| CoreSingleFlightMemo | — | yes | no | DELETE (U2) |  |
| CorePluginLifecycle | — | yes | no | DELETE (U2) |  |
| CoreRuntimeLifecycle | — | yes | no | DELETE (U2) |  |
| CoreServiceLifecycleDesign | — | yes | no | DELETE (U2) |  |
| CoreTaskScheduler | — | yes | no | DELETE (U2) |  |
| CoreTaskService | — | yes | no | DELETE (U2) |  |

## 2. DELETE ledger

### 2.1 `specs/quint/legacy` (D11, P6)

The family has 27 models (11 design comparisons against source `ef9fbf7cd7`, 16 conversions of upstream TLA+ at
upstream `4787d51a…`). It needs `quint:prepare-history` (a network `git fetch` of two historical upstream commits) in
every `npm run verify`.

**Decision on the 16 `Core*` translations.** Chunk specs-10 proposed moving 13 of them to `services/`. Chunks specs-12,
specs-13 and specs-14 read the harnesses and found that they run upstream modules that ship unchanged, or historical
fragments. AGENTS.md says shared behaviour belongs upstream, and D14 says nothing changes upstream here. This plan
therefore keeps only the one model whose code **the product patches**, and whose only coverage is in this tree:
`CoreRoomHandlerQueue` (`scripts/core-state-patch.ts:11` `ROOM_QUEUE_TARGET`). Every other patched target already has a
live model: `PLUGIN_CONNECTOR_TARGET` → `services/CoreConnectorCustody`, `CORE_STATE_TARGET` (task.ts) →
`services/TaskServiceLifecycle`, `TURN_STATE_TARGET` → `services/CoreTurnControllers`, `EMBEDDING_STATE_TARGET` →
`services/NamedEmbeddingProvenance`. The other 15 are deleted. Their behaviours go to the D14 upstream follow-up list
(read memo, Semaphore/Serialise, interaction sessions, provider execution, action settlement, plugin registration
rollback, the `registerSendHandlers` and TaskService auto-pause divergences).

**What live code imports from `legacy` today, and where each helper moves** (measured with `git grep`):

| Live importer | Imports | Moves to | Action |
|---|---|---|---|
| `specs/quint/refinement/application/browser-deletion-poll.mjs:5,12` | `deferred` from `legacy/core/source-support.mjs` (and hashes that path) | `./support.mjs` (`deferred` already at `refinement/application/support.mjs:62`) | change the import, drop the path from the hashed list |
| `specs/quint/refinement/application/google-access-publication.mjs:5,11` | `deferred` | same | same |
| `specs/quint/refinement/application/resident-liveness.mjs:8,13` | `deferred`, `tick` | same (`tick` at `support.mjs:61`) | same |
| `specs/quint/refinement/services/current-approval-service.mjs:5` | `bundleVendorCore`, `deferred`, `observeFile`, `tick` | new `specs/quint/refinement/support.mjs` (family-neutral: `root`, `deferred`, `tick`, `bundleVendorCore` minus the `historicalRuntime` argument, `observeFile`) | `refinement/application/support.mjs` re-exports `deferred`/`tick` from it so there is one definition |
| `specs/quint/refinement/application/maps-reroute-ownership.mjs:4` | `geo`, `mountClosedMaps`, `route`, `start` from `legacy/maps/check-maps-refinement.mjs` | new `specs/quint/refinement/application/maps-mount.mjs` (`setup`, `mountClosedMaps`, `route`, `start`, `geo`, `open`, `search`, `result`, capability helpers, selectors) | move verbatim first; its `window.inspectHistoricalMaps` splice is ported in unit P-maps |
| `specs/quint/refinement/services/core-runtime/connector-custody.mjs:2` | `checkPluginConnectorCustody` from `legacy/core/check-plugin-connector-custody.mjs` | inline into `core-runtime/connector-custody.mjs` | keep the "authenticated correction" paragraph of `legacy/core/plugin-connector-custody-baseline.md` in `core-runtime/connector-custody.md`, fix its link at line 3 |
| `specs/quint/refinement/services/fact-write-scope.mjs:6,11` | `fixture`, `reach`, `evidence`, `text`, `gate` from `legacy/core/check-fact-write-dedupe-refinement.mjs` (and hashes it as `fixtureSource`) | inline into `fact-write-scope.mjs` | keep lines 79-100 of `legacy/core/fact-write-dedupe-refinement.md` as a header comment of `services/FactWriteScope.qnt` |
| `specs/quint/refinement/services/core-runtime/module.mjs:9,49`, `task-service/module.mjs:10,51` | `materializeHistoricalFormalSources` | nowhere | delete the import and the call (no-op without historical TLA paths) |
| `specs/quint/refinement/native/mms-dispatch.mjs:13,50`, `sms-dispatch.mjs:13,65` | `materializeHistoricalSources` for the `b1817660…` historical probe | nowhere | delete the `historicalProbe` campaigns and `specs/quint/refinement/native/mms-historical-sources.json` (historical evidence, D1/D11) |
| `specs/quint/refinement/services/task-scheduler/index.mjs:7` | reads `specs/quint/legacy/CoreTaskScheduler.qnt` | nowhere | delete `task-scheduler/index.mjs`, `task-scheduler/fixture.mjs` and `test/quint-task-scheduler-refinement.test.mjs`. Move `until` from `fixture.mjs` into `task-scheduler/runtime-fixture.mjs:3` first: the live `TaskSchedulerRuntime` campaign (`task-scheduler/runtime.mjs`, registered at `services/index.mjs:39`) imports it |
| `test/quint-room-handler-queue.test.mjs:4` | `checkRoomHandlerQueueRefinement` from `legacy/core/check-room-handler-queue-refinement.mjs` | `specs/quint/refinement/services/core-runtime/room-handler-queue.mjs`; model `git mv specs/quint/legacy/CoreRoomHandlerQueue.qnt specs/quint/services/CoreRoomHandlerQueue.qnt` + a `services/manifest.json` row | the harness keeps its eight `observeFile` seams on upstream `room-handler-queue.ts` (D14 upstream text; grant/release events are an owner question) |

**Files deleted in U2** (after U1 has done the moves above):
- `specs/quint/legacy/**` (77 files: 27 `.qnt`, `manifest.json`, `README.md`, `check-view-refresh.mjs`,
  `view-refresh-configurations.json`, `core/**` incl. `source-support.mjs`, `formal-source-inventory.mjs`,
  `source-inventory.json`, `check-configurations.mjs`, `interaction-metadata.json`, `lifecycle-metadata.json`, the
  `*.md` notes, and `{chat-input,files-browser,google-connect,home-layout,maps,notes-view,photos-library,settings-nav,sign-in}/**`).
- `specs/quint/refinement/legacy/**` (`index.mjs`, `calendar-navigation.{mjs,md}`, `camera-session.{mjs,md}`).
- `test/fixtures/quint/{ChatInputCurrent,FilesBrowser,HomeLayout,Maps,NotesView,PhotosLibrary,SettingsNav}Comparison.qnt`.
- Tests (21): `test/quint-legacy-{campaign-report,chat-input-refinement,files-browser-refinement,google-connect-refinement,home-layout-refinement,maps-refinement,notes-view-refinement,photos-library-refinement,settings-nav-refinement,sign-in-refinement}.test.mjs`,
  `test/quint-historical-{calendar-navigation,camera-session}.test.mjs`,
  `test/quint-core-{approval-service,interaction-session,interactive-task-traces,plugin-lifecycle-refinement,runtime-lifecycle-refinement,service-lifecycle-design-refinement,task-scheduling,task-service-refinement}.test.mjs`,
  `test/quint-{embedding-sql-refinement,fact-write-dedupe-refinement,provider-execution-refinement,single-flight-refinement,tla-inventory}.test.mjs`.
  **Keep** `test/quint-core-{retirement,service-lifecycle,shutdown,turns}.test.mjs`: they run live `services/` campaigns in `refinement/services/core-runtime/`.
- `scripts/prepare-quint-history.ts`, `package.json` `quint:prepare-history` and its step in `verify`,
  `.github/workflows/browser.yml:130` (`&& npm run quint:prepare-history`), `quint-model-check.yml:46-54`
  (`quint:compare`, `quint:temporal`: their only inputs are legacy models). Delete the `compare`/`temporal` commands
  from `scripts/check-quint.ts:8` and the `currentChecks`/`currentTemporalChecks`/`expectedViolations`/`temporal` handling
  (lines 52-60 of the run loop, `proofPhases` in `scripts/ci/check-changed-models.ts`).
- The family name `legacy` in `scripts/quint-lib.ts:43,227`, `scripts/check-quint.ts:42`,
  `scripts/check-quint-refinement.ts:67,82,152,195-201`, `scripts/ci/check-changed-models.ts:20`,
  `test/quint-checker.test.mjs:32`. Replace the four literal lists with one exported `modelFamilies` from `quint-lib.ts`.

Before U2 deletes them, carry these scenarios to their live twin (specs-10, specs-13) and check each against the
twin's run list:
- `legacy/CoreServiceLifecycleDesign`: `lateStartIsStoppedOnce`, `unloadLastClassClearsStatus`, `failedClassLeavesSiblingAvailable` → `services/CoreServiceLifecycle.qnt`.
- `legacy/CoreTaskService` harness: stale daemon snapshot recheck after one-shot delete, failed reread keeps the row,
  wake revision survives a stale completion → `refinement/services/task-service/index.mjs` campaign of `TaskServiceLifecycle`.
- `legacy/core/check-runtime-lifecycle-refinement.mjs`: "queued waiter enters with an aborted signal after strict stop"
  → `refinement/services/core-runtime/shutdown.mjs` if missing.
- Six historical UI design invariants with no live twin (ChatInput `NoLeak`/`BackInOrder`/`OneTouchDown`, HomeLayout
  `GridStable`/`TopNeverBlank`, GoogleConnect `ScopesNeverShrink`/`TwoTapsToMail`) and the journey cases in specs-11,
  specs-15, specs-17: these are Playwright journey items for the browser-test plan, not Quint work.

### 2.2 Models of deleted code (live families)

| Model | Deleted code (DECISION) | Delete with it |
|---|---|---|
| `native/ControllerComposition` | renderer Calendar sync host (D4); its harness imports deleted `src/runtime/calendar-sync-host.ts`, `src/runtime/google-calendar-selection.ts` | `specs/quint/refinement/composition/controllers.mjs`, `composition/ports.mjs`, the Calendar parts of `composition/index.mjs:1,142`, `refinement/native/index.mjs:224`, the hard-coded exclusion at `test/quint-native-refinement.test.mjs:15,23`, manifest row. Carry `lateVoiceReplyCannotUseReplacementTest` and the three real-browser voice scenarios (`voice-open-signin`, `voice-pending-replacement`, `voice-hidden`) into `native/ApplicationComposition.qnt` and `composition/index.mjs` |
| `application/NotesLifecycle` | legacy Notes engine (D1, C1); canonical half duplicates `CanonicalNotes{Controller,Draft,Feedback,Mutation,View}` | `notesLifecycle` adapter in `refinement/application/contracts.mjs`, its index entry, manifest row |
| `application/PhoneCall` | none deleted, but the model has no harness and is pinned only to `model.js` symbols; the dev call fixture keeps `test/browser/dev-incoming-call.spec.ts` | manifest row |
| `application/PreferencesAndPresentationAuditState` | audit twin with no harness | manifest row |
| `application/VoiceTurnReview` | test-only `'review'` send policy (`reviewConversationTurn`, `conversationReviewRequired` in `src/prototype/voice-adapter.ts`, D8) | same commit as the D8 deletion in `voice-adapter.ts`; manifest row. If that code stays, the model stays |
| `services/PreparedSourceStamp` | `scripts/prepare-local-agent.ts` `--requalify-from` path (scripts-12) | `refinement/services/prepared-source-stamp.mjs`, its wrapper, manifest row; replace with one dirty-tree/moved-base refusal case in the prepare-local-agent integration test |
| `services/ReviewedWorkflowLauncher` | `scripts/start-reviewed-workflow-agent.ts` merge (scripts-13) | `refinement/services/reviewed-workflow-launcher.{mjs,md}`, `reviewed-workflow-launcher-baseline.md`, wrapper, manifest row |
| `services/WorkflowWorkerStaging` | none: a model of a build script | rename `test/quint-workflow-worker-staging.test.mjs` to `test/workflow-worker-staging.test.mjs` and inline the harness scenarios there as plain integration cases against the staging script; delete `refinement/services/workflow-worker-staging.mjs` and the manifest row |
| `native/DeviceActions` | superseded by `NativeSmsDispatch`, `NativeReminderDelivery`, `NativeClockReview`, `ContactsBook` | `JournalTraces.java` `smsTraces()` + `DeviceActions` key, `refinement/native/index.mjs:222`, manifest row |
| `native/CopyReceipt` | browser-preview photo library only; production edits are `MediaLifecycle` | `refinement/native/copy-receipt.mjs`, `native/index.mjs:70,94`, `test/quint-copy-receipt.test.mjs`, manifest row. First move its served-module hashing `transform` into `composition/index.mjs` if receipts survive (they do not after U4) |

Model **trims** that go with product deletions in other plans (same commit as the product change, or the model fails):
`AgentCalendar{Refresh,Mutation,SyncControl}` (U0), `CalendarPresentation` (deleted Google display-hiding),
`BrowserReminderOrphan` (legacy localStorage import), `DevelopmentDevice` (Wallet `fakePayment`, D2), `ShellScreen`
(`secure` branch, D2), `StartupPermissions` (`oldCompletedInstall`, `upgradeTest`, `CompletedUpgrade`, D1),
`PermissionChoices` (historical completion versions, B248), `HostedDigestMutation` (`"legacy"` journal phase, B297),
`NotesDocumentTransfer` (import half, C9), `CredentialVault` (password transfer, D3; also drop the
`createTransferClient` stub at `refinement/application/vault-coordinator.mjs:58`), `WorkflowRequestRecoveryAdmission`
(`capture` = backup download, D3), `DurableStore` (legacy members if still present after C6),
`NativeNoteRecording.legacyRestart` and `NativeReminderDelivery.seedLegacy` (model-only actions no harness drives),
`ResidentRuntime.profile`/`chooseProfile`/`history` with `ApplicationComposition.chooseResidentProfile`
(`ApplicationComposition.qnt:71,471-476`). Every trim also edits that model's manifest `tests` until U4 derives them.

### 2.3 Duplicate models (twins and fragments)

| Removed model | Kept model (new name) | Scenarios to carry |
|---|---|---|
| `application/Application` | `application/AssistantConversation` | AlphaClient trace `owner-switch-retires-actual-request` |
| `application/CredentialVaultReadback` | `application/CredentialVault` | all invariants (they have no refinement today) |
| `application/KeyboardFocus` | `application/KeyboardDetectors` | native-visibility actions + 6 runs, DOM draft/selection preservation observation |
| `application/PermissionWalkthrough` | `application/PermissionChoices` | `failedAttemptWriteRestartTest` if `startup-permission-progress.ts` still persists attempts; delete `refinement/application/startup-permissions-coordinator.mjs` (same coordinator, same test title) |
| `application/PermanentVoiceDeletionAuditLease` | `application/PermanentVoiceDeletion` | lease runs |
| `application/RetainedReminderTapAdmission` | `application/ReminderTapTokens` | 3 scenarios; port onto `reminder-adapter-fixture.mjs` |
| `application/SettingsReads` | `application/SettingsCapabilityReads` + `application/SettingsSession` | 4 scenarios |
| `application/BrowserSession` | `application/BrowserTabLifecycle` | `PrivateNeverSaved`, `PrivatePagesDieWithTab`, popup inherits privacy |
| `application/BrowserOwnerReminderAction`, `BrowserOwnerReminderRead` | new `application/BrowserOwnerReminder` | both run sets (one harness file `browser-owner-reminder.mjs`) |
| `application/CanonicalCalendarDraftHandoff`, `CanonicalCalendarEditorClose` | `application/CanonicalCalendarDraft` | handoff and close runs; the Chromium mounts move to the browser lane (§6) |
| `native/AlwaysOnListener` | `native/AlwaysOnListenerIndicatorReadback` → renamed `AlwaysOnListener` | the `image` gate if the product still has it; move `specs/quint/native/conformance.mjs` listener part to `refinement/native/always-on-listener.mjs`, delete `ComponentTraces.listeners()` and `test/quint-native-conformance.test.mjs`; first carry the three `focus.released()` checks (`conformance.mjs:170-172`) into the `SpeechResources` trace group |
| `native/ResidentScheduling` | `native/ResidentSchedulingServiceAdmission` → renamed `ResidentScheduling` | already verbatim; update `FinitePolicyTraces.java`, `refinement/native/index.mjs:97-109` |
| `native/ListenerLeaseRecovery` | `native/NativeListenerStore` (crash-history half) | reboot/update/permission non-counting scenarios; `ComponentTraces.leases()` breaker part |
| `services/MapsNavigation` | `services/MapsNavigationGuidanceReadback` → renamed `MapsNavigation` | subset already present |
| `services/NoticesAndCaches` | `services/ServiceReadCache` (cache half) | notice half is upstream-only and is dropped (D14 follow-up) |
| `services/WorkflowExecutionAuditAdmission` | `services/WorkflowExecution` | five shared scenarios are identical; carry the rest |

Also delete duplicate **replay** paths that are not models: the RendererRecovery and VAD halves of
`specs/quint/native/recovery-vad-conformance.mjs` and `test/quint-recovery-vad-conformance.test.mjs` (strictly weaker
than `FinitePolicyTraces.java`); `specs/quint/services/scan-source-conformance.mjs` and `test/quint-scan-conformance.test.mjs`
(no model tie); the `BrowserSession`, `CallbackLanding`, `DraftDispatch`, `PermanentVoiceDeletion`,
`PreferencesAndPresentation`, `StartupPermissions` cases in `test/quint-conformance.test.mjs` (duplicates of
`refinement/application/portable.mjs`); `specs/quint/refinement/native/AsrPipeFailureProbe.java`,
`ListenerAdmissionProbe.java`, `ListenerServiceProbe.java`, `LiveCaptureProbe.java`, `NoteBridgeSourceProbe.java`,
`RecognizerRetirementProbe.java`, `SharedRecordingProbe.java` and `recognizer-retirement.mjs` (specs-35 to specs-40), after
running each probe from its `check*` function if test-45 lists it as uncovered (`probeIndicatorProvider`,
`probeListenerService`, `probeListenerAdmission`, `probeRecognizerRetirement`).

Not deleted, with the reason: `NativeCalendarSyncEnable` (D18 keeps the Android bridge), `NativeHostedInbox` (resident
delivery, not D5), `DelegationReceiver`/`RendererDigestQueue`/`RendererHostedInbox`/`RetainedHomeBrief` (Q-HOST-5 is
open), `FixtureBusyLatch`/`ShadeNoticeQuestionAdmission`/`ShadeRowCustody`/`PasswordProviderDialog`/`DevBridgeSignIn`/
`DevelopmentHost`/`BrowserCloudRequestCustody`/`TriggerCursor` (dev surfaces kept by D19/D20), `CloudQaLauncher`/
`CombinedAgentLauncher` (scripts merge pending), `CalendarLinkedSync` (models upstream `plugin-calendar` linked sync;
it loses its last importer with `ControllerComposition` and becomes a plain upstream-only model).

## 3. PORT ledger

A harness is text-anchored when it reads product source as text and slices it (`between(…)`, literal `indexOf` anchors,
marker comments), rewrites it (`.replace` at a literal), strips types and evaluates a fragment in `vm`/`new Function`
(`sourceContext`, `stripTypeScriptTypes`), or regex-parses it. The target shape is the one the import-based harnesses
already use: esbuild-bundle the **real module** and call its **exported** functions with port stubs
(`bundledSource`/`sourceModule` in `refinement/application/support.mjs:32-42`, `loadBundled` in
`browser-model-traces.mjs`, `loadProductModule` in `notes-files-media-itf.mjs`, `capture()` in `refinement/native/telephony.mjs`),
or compile **whole** Java classes with port classes (`refinement/native/java.mjs` `javaTraces`).

Measured with
`grep -lE "between\(|sourceContext\(|stripTypeScriptTypes|exactUpdateMembers|slice\(.*indexOf\(|indexOf\(['\"](\\\\n|\\\\t| )"`:
42 files in `refinement/application`, 7 in `refinement/services`, 20 in `refinement/native`, 11 `test/quint-*.test.mjs`,
18 `test/fixtures/*.mjs`. The table lists them by execution unit.

### 3.0 First: one loader

Before any port, unit U5a adds `specs/quint/refinement/support.mjs#loadModule(entry, {stubs, define, aliases})` (one
esbuild bundle → `data:` import, optional import-specifier stubs). It replaces the five copies: `bundledSource`/`sourceModule`
(`application/support.mjs`), `loadBundled` (`application/browser-model-traces.mjs`), `loadProductModule`
(`application/notes-files-media-itf.mjs`; its `rewrite` option is removed), `sourceModule(path, stubs)`
(`services/identity-comms-traces.mjs`), `capture()` (`native/telephony.mjs`) and `captureRendererImplementation()`
(`native/renderer.mjs`). One ITF replay module `specs/quint/refinement/model-traces.mjs` replaces
`application/browser-model-traces.mjs`, `application/calendar-itf.mjs`, `application/shell-model-traces.mjs`,
`refinement/assistant-model-traces.mjs`, `services/maps-model-traces.mjs`, `services/inbox-workflows-model-traces.mjs`.
`sourceContext` (`application/support.mjs:43`), `test/support/strip-types.mjs` and `test/fixtures/ts-source.mjs` are
deleted when their last user is ported (end of §3).

### 3.1 Port table

"Exports needed" lists what the product module must export after the port. "exists" means it is already exported
(checked with `grep -E "export (function|const|class) NAME"`). Unit names refer to §7.

| Harness / test (`r/` = `specs/quint/refinement/`) | Text tie today | Import instead | Exports needed | Unit |
|---|---|---|---|---|
| `r/application/share-panel-admission.mjs` | whole-file strip + vm of `src/runtime/share-panel.ts` | `src/runtime/share-panel.ts` | its current exports (no imports to stub) | P-light |
| `r/application/own-notice-question.mjs` | strip + vm of `src/prototype/own-notice-question.ts` | `src/prototype/own-notice-question.ts`, stubs for `src/browser/content-question.ts` | existing exports | P-light |
| `r/application/list-focus.mjs` | strip + vm of `src/prototype/keyed-list-focus.ts` | same file | existing exports | P-light |
| `r/application/native-view-subscription.mjs` | `sourceContext` of `src/runtime/native-view-events.ts` | same file with a fake port | existing exports | P-light |
| `r/application/hosted-background-admission.mjs` | `sourceContext` whole-file transplant | `src/runtime/hosted-background.ts` | existing exports | P-light |
| `r/application/modal-toast-forwarding.mjs` | strips `src/runtime/toast-layer.ts`, reads private `installed` | `src/runtime/toast-layer.ts`; observe the DOM | none new | P-light |
| `test/quint-inert-hold.test.mjs` | strips `src/runtime/modal-inert.ts` for private `owners` | `src/runtime/modal-inert.ts`; observe `phone.inert` | none new | P-light |
| `r/application/workflow-request-recovery-admission.mjs` | `sourceContext` of `src/runtime/workflow-request-recovery.ts` | same file | existing exports | P-light |
| `r/application/recovery-ui.mjs` | appends an inspector export to `src/runtime/error-boundary.tsx` | `src/runtime/error-boundary.tsx`; observe rendered fallback | none new | P-light |
| `r/application/browser-hosted-result-notice.mjs` | `sourceContext` over 6 files | `src/browser/hosted-results.ts` | `canonical` (new export) | P-light |
| `test/fixtures/browser-external-handoff.mjs` | `sourceContext` | `src/prototype/browser-external-handoff.ts` | `createExternalBrowserHandoff` (exists) | P-light |
| `test/quint-delegation-receiver.test.mjs` | slices an already exported function | its module | exists | P-light |
| `r/application/maps-share-choice.mjs` | tail slice from `export function installMapsChatAdapter(` | `src/prototype/maps-chat-adapter.ts` | `installMapsChatAdapter` (exists) | P-light |
| `r/native/renderer-speech-chunk.mjs` | regex-strips imports/exports of `src/local-speech-playback.ts` | `src/local-speech-playback.ts` with port modules | `playOwnedSpeech` (exists) | P-light |
| `r/native/speech-cleanup-latch.mjs` | strips `local-speech-playback.ts`, `runtime/app-speech.ts`, `runtime/cloud-voice.ts` | those three | `speakAppText` (exists), `speakCloudText` | P-light |
| `r/application/calendar-agent-selection.mjs` + `r/application/calendar-adapter-fixture.mjs` | bundle-text `closures` probe patch | `src/prototype/calendar-adapter.ts` | a selection getter from `installCalendarAdapter` | P-light |
| `r/application/files-recent-index.mjs` | four exact source rewrites | `src/prototype/files-index.ts` | `createFilesIndex` and the record/revoke API it already returns | P-light |
| `r/application/day-anchor.mjs` | probe `.replace` in bundle | its bundled module | no rewrite; drop the source-rewrite canary | P-light |
| `r/application/permission-choices.mjs` | two text needles (one upstream) | `src/startup-permission-progress.ts`, `src/startup-permissions.tsx` | an observation hook on the coordinator; the upstream needle stays (D14) | P-light |
| `r/application/address-input.mjs` | transplants `navigate` region of `src/prototype/browser-adapter.ts` | new `src/prototype/browser-navigation.ts` | `createBrowserNavigate(deps)` | P-browser |
| `r/application/bookmarks-hydration.mjs` | transplants bookmark region of `browser-adapter.ts` | new `src/prototype/browser-bookmarks.ts` | `createBookmarkQueue(deps)` | P-browser |
| `r/application/browser-session-persistence.mjs`, `r/application/browser-tab-lifecycle.mjs` | slice `browser-adapter.ts` (`ensure`, `restoreSession`, `saveSession`, `clearBrowsingData`, `forgetTabs`, tab listeners); `browser-tab-lifecycle.mjs:36,47` injects `createSessionSaver` | new `src/browser/browser-session-store.ts` | `createBrowserSessionStore(deps)`; drop the `createSessionSaver` injection (D20) | P-browser |
| `r/application/browser-surface-presentation.mjs` | slices `hide`/`update` of `browser-adapter.ts` | new `src/browser/browser-presentation.ts` | `createBrowserPresentation(deps)` | P-browser |
| `r/application/find-in-page.mjs` | slices find bar of `browser-adapter.ts` | new `src/prototype/browser-find.ts` | `createFindBar(deps)` | P-browser |
| `r/application/composer-send.mjs` | 4 slices of `src/prototype/agent-adapter.ts` (`function createdFromSlot(`…, `p.send = async function`…) | new `src/runtime/composer-send.ts` | `createComposerSend(ports)` | P-agent |
| `r/application/chat-attachments.mjs`, `test/fixtures/chat-attachment-composer.mjs` | slices `agent-adapter.ts` twice | new `src/runtime/chat-attachments.ts` | `createChatAttachments(ports)` | P-agent |
| `test/fixtures/first-send-draft-migration.mjs` | slices `function settleFirstSendSlot(` | `src/runtime/composer-send.ts` | `settleFirstSendSlot` (now local in `agent-adapter.ts`) | P-agent |
| `r/application/pending-action-recovery.mjs` | slices `agent-adapter.ts` | new `src/runtime/pending-action-recovery.ts` | `recoverPendingActions(ports)` (now local) | P-agent |
| `test/quint-back-dispatch.test.mjs` | slices `agent-adapter.ts`, regex on `MainActivity.java` | new `src/runtime/back-dispatch.ts`; MainActivity Back script as an asset | `updateBackAvailability` (now local) | P-agent |
| `r/application/observation-turn-dispatch.mjs` | slices `src/runtime/phone-context.ts`, `connection-ui.tsx` | `src/runtime/phone-context.ts` | the context builder `context(shell)` as an export | P-agent |
| `test/quint-connection-controller.test.mjs` | 6 regions of `src/runtime/connection-ui.tsx` (ends at `async function remoteIdentity(`, which C4 deletes) | new `src/runtime/connection-controller.ts`; move the replay to `r/application/connection-controller.mjs` | `createConnectionController(ports)` | P-connection |
| `r/application/cloud-plan-recheck.mjs`, `r/services/plan-admission-ports.mjs` | slices `connection-ui.tsx` | new `src/runtime/plan-recheck.ts` | `schedulePlanRecheck(ports)` | P-connection |
| `r/application/resident-liveness.mjs` | slices `connection-ui.tsx` | new `src/runtime/resident-liveness.ts` (not `resident-recovery.ts`, which is a Lemma source) | `createResidentLiveness(ports)` | P-connection |
| `r/application/account-sheet.mjs` | source-marker injection in `connection-ui.tsx` | derive section/review from DOM | none | P-connection |
| `r/application/accessible-toast-lifetime.mjs` | strip-types + `model.js` slice | new `src/prototype/toast-queue.ts` + `src/runtime/accessibility-timeout.ts` | `createToastQueue` | P-model |
| `r/application/calendar-form-controls.mjs` | `between()` slices of `model.js` (`'      var dayChips = [];'`, `'    // month panel'`) + `new Function` | `src/prototype/calendar-form-inputs.ts` | day-chip, step-button, month-cell helpers | P-model |
| `test/quint-fixture-busy-latch.test.mjs` | slices `model.js` `latchPatch`; manifest pins literal call text | new `src/prototype/shell-helpers.ts` | `latchPatch` (now local at `model.js:125`) | P-model |
| `r/application/settings-page-focus.mjs` | slices `model.js` `var stPageFocus =` | new `src/prototype/settings-page-focus.js` | `stPageFocus` | P-model |
| `r/application/shell-core-fixture.mjs`, `r/application/surfaces.mjs`, `test/quint-shade-pull.test.mjs`, `test/quint-shell-screen.test.mjs` | slice `model.js` at `'\n  S() {'`, `'\n  /* ---- gestures ---- */'`, `'\nvar BASE = {'`, `goHome`…`/* ---- Android` | the shell core module from the `model.js` split | `goHome`, `openView`, `back`, screen/lock state | P-model |
| `r/application/voice-transcript-follow.mjs` | slices `model.js` Component methods | same shell core module | scroll-follow helper | P-model |
| `test/fixtures/workflow-clock-admission.mjs` | slices `agent-adapter.ts`, `model.js`, `template.html` | shell core module + `src/runtime/composer-send.ts` | `leave` handler; merge the fixture into its harness | P-model (after P-agent) |
| `r/application/keyboard-focus.mjs`, `test/quint-keyboard-detectors.test.mjs` | tab-indented anchors in `src/main.tsx` (`'\t\tconst free = keyboardFreeHeight();'`) and slices of `chat-overlay-motion-adapter.ts` | new `src/prototype/dock-keyboard.ts` | `watchDockKeyboard(ports)` (keep it out of the Lemma-annotated functions) | P-main |
| `r/application/mounted-update-admission.mjs` | slices `main.tsx` and `settings-adapter.ts`, gate marker, projection hashes | new `src/runtime/mounted-update.ts` | `admitMountedUpdate(ports)` | P-main |
| `r/application/appearance-preference-admission.mjs`, `test/fixtures/appearance-preference.mjs` | 5 anchors in `settings-adapter.ts`, `main.tsx`, `model.js` | new `src/runtime/appearance-preference.ts` | `createAppearancePreference(ports)` | P-main |
| `r/application/dock-clearance-ownership.mjs` | strips `main.tsx`, `runtime/dock-clearance.ts` | `src/runtime/dock-clearance.ts` | its owner API | P-main |
| `test/quint-chat-dock.test.mjs` | `// chat-release:begin/end` markers | `src/prototype/chat-overlay-motion-adapter.ts` | `chatRelease` (exists); delete the marker comments | P-main |
| `r/application/home-failure-notice.mjs`, `r/application/home-gesture.mjs` | markers `'  const shell = createMobileShellLauncher({'`, `'  let swallow = '';'` | `src/prototype/home-shell.ts` | `homeFailureNotice`, `createHomeGesture` | P-main |
| `r/application/automatic-app-update-schedule.mjs` | marker comments `// settings-facts:begin/end` in `settings-adapter.ts` | new `src/prototype/automatic-update-poll.ts` | `pollAutomaticUpdate` (now local) | P-settings |
| `test/quint-settings-capability-reads.test.mjs`, `test/quint-settings-session.test.mjs`, `test/quint-settings-listener-reads.test.mjs` | 3 anchors and `// settings-reads:begin/end` markers in `settings-adapter.ts` | new `src/prototype/settings-reads.ts` | `createSettingsReads(ports)`, `listenerReadGate` | P-settings |
| `r/native/update-staging.mjs` (renderer half) | transplants `export const UPDATE_SCHEMA`…, `const UPDATE_KEY`… of `settings-adapter.ts` | new `src/prototype/app-update.ts` | `UPDATE_SCHEMA`, `UPDATE_KEY`, the staging functions; `parseUpdateManifest` (exists) moves with them | P-settings |
| `r/application/quiet-voice-retry.mjs` | slices `src/prototype/voice-adapter.ts` | new `src/runtime/quiet-voice-retry.ts` | `quietVoiceRetry` (now local) | P-voice |
| `r/application/voice-owned-navigation.mjs` | slices `voice-adapter.ts` | new `src/runtime/voice-navigation-claim.ts` | owned-navigation factory | P-voice |
| `r/native/batch-capture-completion.mjs` | slices `voice-adapter.ts` | new `src/runtime/conversation-capture.ts` | `captureConversationAudio` (now local) | P-voice |
| `r/application/map-plane-ownership.mjs` | strips `src/prototype/maps-adapter.ts` into vm | `src/maps/map-plane.ts` (exists) | the plane controller | P-maps |
| `r/application/maps-event-return.mjs` | marker in `maps-adapter.ts` + concatenated strip | new `src/maps/event-return.ts` | event-return state | P-maps |
| `r/application/maps-mount.mjs` (from U1) | injects `window.inspectHistoricalMaps` before `'  let returningToEvent:'` in `maps-adapter.ts` | `src/prototype/maps-adapter.ts` dev-gated inspector | `{route, arrived, guidance, session, publication}` inspector behind `ELIZA_DEV_ALLOW_TEST_MOCKS`; keep `connectionController.getCloudClient`, `cloudMapsDiagnostics`, `mapsConnection`, `residentMapsNavigationPort` export names | P-maps |
| `r/services/maps-connection.mjs`, `r/services/maps-model-traces.mjs` | strips `maps-adapter.ts` | `src/maps/runtime.ts`, `src/maps/agent-navigation.ts` | existing exports | P-maps |
| `r/application/canonical-notification-tap-admission.mjs` | slices `src/prototype/notifications-adapter.ts` | new `src/runtime/notification-tap-owner.ts` | `createTapOwner(ports)`; drop `main.tsx`, `connection-ui.tsx` and the two Java plugins from its manifest `sources` | P-notify |
| `r/application/boundaries.mjs` (`notificationCollection`) | `sourceContext` | `src/browser/notifications.ts` | existing exports | P-notify |
| `test/fixtures/shade-notice-question.mjs`, `test/fixtures/shade-row-custody.mjs` | slice `notifications-adapter.ts` | `notifications-adapter.ts` | `installNotificationsAdapter` internals as a dev-gated factory | P-notify |
| `test/fixtures/reminder-open-intent.mjs`, `test/fixtures/retained-reminder-tap.mjs` | slice `src/runtime/reminder-creations.ts`, vm of `reminder-adapter.ts` | `r/application/reminder-adapter-fixture.mjs` (exists, import-based) | none new | P-notify |
| `r/application/hosted-digest-refresh.mjs` | marker `\tconst mounted = useRef(true);` | `src/runtime/hosted-digest-ui.tsx` through ports + DOM | none new | P-notify |
| `r/application/photos-window.mjs` (also serves `PhotosTrash`, `PhotosOwnedAlbumDialog`) | bundles `camera-adapter.ts` with marker rewrites | new `src/prototype/photos-library.ts` | `createPhotosLibrary(ports)` + snapshot | P-photos |
| `r/application/google-calendar-disconnect.mjs`, `google-calendar-link-flow.mjs` | code-string insertions in `google-accounts.ts` | `src/runtime/google-accounts.ts` | `linkGoogleCalendar(ports)` with cleanup/link ports | P-google |
| `test/fixtures/google-account-panel.mjs` (used by `google-calendar-access-choice.mjs`, `google-consent-admission.mjs`), `google-calendar-link-publication.mjs` marker `' function accountRead(){'` | transplant of `google-connection-ui.tsx` | one real-bundle panel fixture `r/application/fixtures/google-account-panel.mjs` | the panel component and its ports. Not part of C3: it tests the live Google panel | P-google |
| `r/services/workflow-adapter-fixture.mjs`, `r/services/workflow-local-source.mjs`, `test/fixtures/workflow-execution-fixture.mjs`, `test/quint-workflow-execution-audit-admission.test.mjs` | transplants of `src/prototype/workflow-adapter.ts`, `workflow-authoring.ts` (strip `^import .*;\n`) | `src/prototype/workflow-adapter.ts`, `src/prototype/workflow-authoring.ts` | `createWorkflowAdapter(ports)`, authoring functions | P-workflow |
| `r/services/automation-request-settlement.mjs`, `test/quint-automation-request-settlement.test.mjs` | strips `automations-adapter.ts`; mutation canary | `src/prototype/automations-adapter.ts` | request-settlement function; delete the canary | P-workflow |
| `r/services/browser-google-return.mjs`, `r/services/inbox-workflows-model-traces.mjs`, `r/services/inbox-list-paging(-ports).mjs`, `test/quint-inbox-provider-drafts.test.mjs` | strip-types transplants | the inbox and Google-return modules they strip | existing exports | P-workflow |
| `r/native/update-barrier.mjs` (`exactUpdateMembers`), `update-composition.mjs`, `update-staging.mjs` (Java half), `runtime-update-pause.mjs` | slice `AlphaDevicePlugin.java` between `' static final long UPDATE_MAX_BYTES='` and the marker `' // End of updater methods for host replay.'`, regex `handOff`/`shareForeground` | new `java/AlphaUpdater.java`, `java/UpdatePause.java` compiled whole | the updater methods as package-private members; delete the marker comment | J1 |
| `r/native/settings-handoff-platform.mjs`, `text-scale-platform.mjs` | slice `AlphaDevicePlugin.java` and `node_modules/@capacitor/.../PluginCall.java` | new `java/SystemSettingsHandoff.java`, `java/TextScale.java`; one hand-written `PluginCall` stub shared by both | the two classes | J1 |
| `r/native/crash-journal-platform.mjs` | slices `AlphaDevicePlugin.java` | the crash-journal bridge class from the D1 `AlphaDevicePlugin` split | that class | J1 |
| `r/native/request-withdrawal-platform.mjs`, `request-withdrawal.mjs` | slices `AlphaLocalAgentPlugin.java` from `' @PluginMethod public void request('`; regex-parses its own `.qnt` `run` text | new `java/LocalAgentRequests.java`; `modelNames` from `model-traces.mjs` | that class | J2 |
| `r/native/assistant-entry-platform.mjs`, `assistant-entry.mjs` | slices `AlphaLocalAgentPlugin.java` | `PowerLaunchPin` in its own file; delete `launchSurface`/`takeInvocation` with the model's `readSurface`/`legacyHasNoVoice` | `PowerLaunchPin` | J2 |
| `r/native/hosted-result-notices.mjs`, `source-renewal-platform.mjs` | 6 and 9 anchors in `AlphaHostedResultsPlugin.java` | new `java/HostedNoticeBridge.java`, bridge logic moved into `SourceRenewalNotices` | those classes | J3 |
| `r/native/native-digest-platform.mjs` | slices `HostedDelivery.java` | `NativeSourceWork` moved out of `HostedDelivery` | `NativeSourceWork` | J3 |
| `r/native/action-recovery-platform.mjs` | prefix slice of `AlphaActionJournalPlugin.java` | the journal delegate class compiled whole | that class | J4 |
| `r/native/canonical-tap-platform.mjs`, `clock-review-platform.mjs`, `gmail-background-platform.mjs`, `workflow-notice-platform.mjs` | literal Java anchors | compile `AlphaCanonicalNotifications`, `AlphaNotificationsPlugin`, the Clock and Gmail classes whole with Capacitor stubs | none (stubs only) | J4 |
| `r/native/reset-orchestration.mjs` | scrapes 18 Android port stubs out of `test/reset-startup.test.mjs` | new `r/native/reset-ports/*.java` | none | J4 |

**Upstream text splices kept (D14, report as follow-ups; they move only on a pin bump):** `r/application/drawer-interaction.mjs`
(`InstalledAppsGridDrawer`), `launcher-{favorites,observer,ownership}.mjs`, `canonical-notes-{draft,view}.mjs`
(+ `CanonicalNotesMutation`), `files-browser-coordinator.mjs`, `files-filter.mjs`, `files-preview.mjs`,
`test/fixtures/committed-view-observation.mjs` (upstream `views-routes.ts`), `screen-focus-ownership.mjs`,
`startup-update-admission.mjs` (upstream `app-update-gate.ts`), `test/fixtures/use-in-email-review.mjs`,
`r/services/current-approval-service.mjs` (`approval.ts`), `r/native/{sms,mms}-dispatch-platform.mjs`,
`speech-output-preparation.mjs`, `browser-underlay.mjs`, `app-info-handoff-platform.mjs` (`SystemLauncherApps` slice),
`r/services/core-runtime/room-handler-queue.mjs`. Their alphaphone-side anchors (if any) are covered in the rows above.

**Removed with the port (B5):** every mutation canary that rewrites product source to prove the oracle fails
(`calendar-agent-selection`, `camera-focus-writes`, `automation-request-settlement`, `day-anchor`, `files-recent-index`,
`media-copy-intent`, `notes-document-transfer`, `quint-video-edit-review.test.mjs:14-18`); `.source.json`/`baseCommit`
provenance asserts (`app-info-handoff-composition.mjs:64-65`, `automatic-app-update-schedule.mjs:19-26`,
`browser-album-storage.mjs:26-32`, `test/fixtures/browser-external-handoff.mjs:32-41`); `checkClientFeatures` calls inside
harnesses (called once by the runner); `captureSources`/`captureInputs`/`boundInputs` hashing. Any of these regex pins
also matches minified text and would fail on the Prettier commit (D9), so they go before D9.

### 3.2 Order inside each port unit

1. Extract the product function or class into the named module and export it. The old file imports it back, so behaviour
   is byte-identical.
2. Change the harness to import it with `loadModule` (TS) or compile it whole (Java). Delete the anchors and the transplant fixture.
3. Run that model's campaign (`node --test --test-name-pattern='^<Model>$' test/quint-refinement.test.mjs`) and
   `npm run quint:check -- --models=<Model>`.
4. If the product file is a LemmaScript source (`settings-adapter.ts`, `chat-overlay-motion-adapter.ts`,
   `context-selection.ts`, `note-recorder.ts`, `calendar-days.ts`, `browser-poll.ts`), run `npm run lemma:check`. It must
   report no generated change, which holds as long as no `//@`-annotated function moved (§5).

## 4. Manifest simplification

### 4.1 What the manifests pin today

| Field | Count (live families) | Read by | Effect |
|---|---|---|---|
| `path`, `module`, `init`, `step`, `invariant` | 343 each | `loadModels` (syntax checks, `.qnt` ↔ manifest bijection), `check-quint` | ties the registry to the `.qnt` |
| `tests` | 343 lists, 2,670 names | `loadModels` (each must be a `run` in the `.qnt`), `check-quint` scenarios phase | every model edit is a two-file change |
| `sources` | 343 lists, 693 distinct paths | `loadModels:233` (`readFileSync` each: a rename breaks **every** Quint command), `check-quint` input hashes, `check-changed-models` selection, harness receipts | ties the model to files |
| `sharedSources` | 78 | mapped to `vendor/eliza/…` in `readModelFamily` | same as `sources`, upstream |
| `symbols` | 104 models, 1,016 `{path,name}` | `loadModels:238-244` word-bounded regex | text pins on names, local variables (`pending`, `seen`, `loadingMore`), string literals (`'Tab limit'`), code fragments (`'async function refresh'`, `'freeHeight(width,layoutHeight,input.editing)'`); 67 are not identifiers |
| `invariants`, `witnesses`, `bounds`, `additionalProofInit` | 295 / 124 / 97 / 2 | `check-quint` | checker inputs |
| `abstractions` (370), `stateMapping` (209), `components` (4), `profiles` (1) | | nothing (prose) | drift with every edit |
| legacy-only: `constants`, `temporal`, `temporalProperties`, `currentChecks`, `currentTemporalChecks`, `historicalSourceLinks`, `actionProperties`, `legacyConfigurations`, `configurations`, `upstreamSources`, `classification`, `historicalRuntime` | | `compare`/`temporal`, legacy harnesses | deleted with U2 |

Manifest shapes also differ: `application/manifest.json` is an array, the others are `{models: […]}`. That is why
`refinement/application/index.mjs:156-157` and `test/quint-native-refinement.test.mjs:14` re-implement
`readModelFamily`.

### 4.2 Smallest pin set (target schema, U4)

Each entry keeps only:

```json
{"path": "specs/quint/application/ComposerSend.qnt", "module": "ComposerSend",
 "init": "init", "step": "step", "invariant": "safety",
 "invariants": ["…"], "witnesses": ["…"], "bounds": {"maxSamples": 80},
 "sources": ["apps/app/src/runtime/composer-send.ts"]}
```

- `symbols`: **deleted in all families** (1,016 pins). The executable tie is the refinement harness, which imports
  **exported** symbols. A renamed export fails the harness at import time, which is the only symbol check worth having.
  For the 21 models that have no harness (§6.3 `MODEL_ONLY`), the `sources` file pin remains the only tie. That is
  intended: they are design models, and the journeys named in specs-07/specs-08 cover their code.
- `sources`: kept, but only **the files the harness imports or compiles** (entry modules), not every file the model
  talks about. Remove the hot shared files that select a model without being loaded: `src/prototype/model.js`,
  `src/prototype/template.html`, `src/main.tsx`, `src/runtime/connection-ui.tsx`, `src/prototype/agent-adapter.ts`,
  `upstream.lock.json`, except where the harness loads them. For models with no harness, keep the one file that holds the
  modelled function. Named examples from the chunk reports: `CanonicalNotificationTapAdmission` (drop `main.tsx`,
  `connection-ui.tsx`, two Java plugins), `CanonicalNotesMutation` (drop `agent-adapter.ts`), `KeyboardFocus`/
  `KeyboardDetectors` (drop `MainActivity.java`), `MountedUpdateAdmission` (drop `AlphaDevicePlugin.java` unless
  `native/update-barrier.mjs` is its refinement), `LauncherObserver`/`LauncherOwnership` (drop `home-shell.ts`),
  `VideoRecorder` (drop `camera-adapter.ts`), `VoiceIpcAssembly` (drop Alpha Java), `TelephonyAttention` (only
  `src/prototype/telephony-presenters.ts`), `Voicemail` (only `voicemail-state.ts`), `AppUpdateCandidate` (drop `resident-android.yml`),
  `ScheduledTaskControls` (drop `template.html`), `ListenerLeaseProducer` (currently `[]`: set the upstream SystemUI file).
  `CalendarApprovalReview`, `BrowserReviews` (`review.ts`, `screen-locked.ts`), `CalendarPresentation`, `CameraPreviewRetirement`:
  narrow to loaded files. The mechanical rule for the rest: `sources` = the harness's esbuild metafile inputs under
  `apps/app/src`/`android` ∪ its `javac` source list. `scripts/quint-lib.ts` gets a `--print-harness-inputs` helper that
  prints them from one run, and U4 writes the result.
- `tests`: **derived**, not listed. Scenarios = every `run <name>Test =` in the `.qnt`. Today 336 of 343 lists already
  equal the `run` set. Before switching: rename the 4 `AccountSheet` scenarios that do not end in `Test`
  (`settingsAndStartupShareAccount`, `switchedOwnerCannotConfirm`, `dismissPreservesData`, `modeAndSignOutPreserveKeys`)
  to `…Test`. Make the 3 unregistered `ConnectionController` scenarios (`noticeDuringRebindShownTest`,
  `rebindBehindRebindYieldsToReturnTest`, `rebindBehindRebindRunsNextTest`) pass, or delete them. The `…Setup`,
  `setup`, `replacement`, `prepared` runs stay helpers (`ListFocus`, `ResetRecovery`, `ApplicationComposition`,
  `ControllerComposition`, `StoppedReplyReconciliation`, `RendererSpeechChunk`, `MapsRerouteOwnership`). Turn
  `AgentCalendarRefresh.completeFirst` into an action. Register or delete `AccountSheet.directSettingsRemainReachable`.
- `sharedSources`: folded into `sources` as literal `vendor/eliza/…` paths (one field).
- `abstractions`, `stateMapping`, `components`, `profiles`: deleted. Any sentence a reviewer wants kept goes into the
  `.qnt` header comment.
- `init`/`step`/`invariant`: default to `init`/`step`/`safety` and are written only when different.
- One shape for all three files: `{"models": [...]}`. `quint-lib.ts` exports `readModelFamily`, `modelFamilies` and
  `loadModels`. `check-changed-models.ts`, `refinement/application/index.mjs:156-157` and the runner use them.

`scripts/quint-lib.ts` after U4: drop the `symbols` loop (lines 238-244), the `runtimeScriptPaths`/`sourcePaths()` hand
list (lines 9-39, 64 named scripts hashed into every composition receipt), and the receipt `sha256` users. Keep the
`.qnt` ↔ manifest bijection, the `sources` existence check, and scenario derivation. `scripts/ci/check-changed-models.ts:22`
drops `package-lock.json` from `checkerInputs`; it keeps `scripts/check-quint.ts`, `scripts/quint-lib.ts` and
`node_modules/@informalsystems/quint/package.json` (version change).

## 5. LemmaScript

### 5.1 Files with `//@` contracts (all live)

`LemmaScript-files.txt` lists 23 files, and `git grep -l '//@' apps/app/src` returns exactly these 23:
`browser/{browser-poll,edit-receipt,journal-retention,notifications,video-capture,video-edit,workflow-triggers}.ts`,
`prototype/{calendar-days,chat-overlay-motion-adapter,context-selection,note-recorder,settings-adapter}.ts`,
`runtime/{canvas-geometry,cloud-environment-selection,cloud-voice-limit,gmail-mailbox,hosted-digests,inbox-edit-coalescer,inbox-operation,resident-recovery,voice-states,workflow-device-contract}.ts`,
`startup-permission-flow.ts`. Companions: `specs/lemma/<same path>.dfy` and `.dfy.gen`. The pairs are byte-identical
except for 8 files with hand-written lemmas: `runtime/canvas-geometry`, `prototype/context-selection`,
`runtime/hosted-digests`, `browser/journal-retention`, `browser/notifications`, `prototype/settings-adapter`,
`runtime/workflow-device-contract`, `browser/workflow-triggers`.

### 5.2 Proofs that die, or change, with deleted code

| File | DECISION | Action |
|---|---|---|
| `browser/browser-poll.ts` | D20 deletes `createSessionSaver` (line 49). It is **not** proved: the `.dfy.gen` has only `surfaceIdleForView`, `retryDelayForCount` | delete the function; `lemma:check` must report no generated change |
| `browser/workflow-triggers.ts` (`cursorThrough`, `placeChanged`, `triggerTickPlan` + hand lemmas) | dev-simulator-only (`browser/workflow-trigger-runtime.ts`); D20 keeps it while the simulator stays | if D19 deletes the simulator: delete the source, both companions, `LemmaScript-files.txt:7`, the `specs/lemma/README.md` section, and the `services/TriggerCursor` model, all in one commit |
| `runtime/hosted-digests.ts` | B297 drops the legacy digest encoding | change the function, then `lemma:regen` and re-apply the hand lemma |
| `runtime/workflow-device-contract.dfy` | none | SIMPLIFY: delete the 4 hand lemmas that restate generated `ensures`, so `.dfy` equals `.dfy.gen`; fix `specs/lemma/README.md:202` |
| `startup-permission-flow.ts` `lateReadyNotice` | owner question (keys on text no code produces) | not changed (D16) |
| `runtime/resident-recovery.ts` | tautological contract, owner question | not changed (D16) |

No other proved function belongs to code that a DECISION deletes. `journal-retention` serves live Calendar deletions,
not the D4 sync stack. The D8 switch behind `updateCheckDue`/`updateIdle` is already gone, and those functions are live.

### 5.3 Moves and regeneration

`check-lemma.ts` fails on: a listed path outside `^apps/app/src/…\.ts$`, a listed file without `//@ verify`, any
`//@` in an unlisted `apps/app/src` file, `//@ assume` / `assume` / `{:axiom}`, an unread contract line, **any change
`lsc gen-check` would make to a `.dfy`/`.dfy.gen`**, and fewer "verified, 0 errors" lines than files. It pins
`lemmascript` 0.6.6 and Dafny 4.11.0.

Procedure when a Lemma source moves (Stage F splits of `settings-adapter.ts`, `chat-overlay-motion-adapter.ts`,
`note-recorder.ts`), all in one commit:
1. `git mv apps/app/src/<old>.ts apps/app/src/<new>.ts` (or move the annotated functions into the new module, and keep
   every `//@` line with its function).
2. `git mv specs/lemma/apps/app/src/<old>.dfy specs/lemma/apps/app/src/<new>.dfy` and the same for `.dfy.gen`.
3. Edit the line in `LemmaScript-files.txt`, and the path in `specs/lemma/README.md`.
4. Regenerate with the three-way merge, which keeps hand lemmas:
   `npx lsc regen --backend=dafny --no-verify apps/app/src/<new>.ts`. `lsc gen` (today's `npm run lemma:regen`) overwrites
   `.dfy.gen` and does not merge. Change `package.json` `lemma:regen` to `lsc regen --backend=dafny --no-verify`.
5. If a function was renamed, rename it in the hand lemmas of the 8 files above.
6. `LEMMA_REQUIRE_BACKEND=1 npm run lemma:check` must pass with no generated change.

Annotated functions stay inside the LemmaScript subset: pure, no closures over mutable state, `number` is `int` unless
`//@ type x real`. A split that pulls an annotated function into a module with side effects still passes. A split
that makes it close over adapter state does not. So extractions leave annotated functions as top-level pure exports.

### 5.4 `check-lemma.ts` simplification (same unit as U4, file owned by U4)

Keep every check listed in §5.3. Delete the receipt (`test-results/lemma/…`), input hashing before and after
(`hashes()`, `finalInputs`), and the frozen-proof write-back (it restores files, which hides the stale state). Make a
missing or wrong Dafny an error whenever `CI` is set, not only with `LEMMA_REQUIRE_BACKEND=1`. Keep one of
`test/lemma-check.test.mjs` / `test/lemma-checker.test.mjs` (the checker gates a release tool) and delete the other.
Delete `.github/workflows/lemma-check.yml`. It is broken: `DAFNY` goes to `$GITHUB_ENV`, but `check-lemma.ts:90` runs
`dafny` from `PATH`, and 0 of the last 40 runs passed. The `lemma` lane (§6) installs Dafny with
`scripts/ci/prepare-dafny.sh`, which writes `$GITHUB_PATH`.

## 6. Running to 100 %, and lanes

### 6.1 What "100 %" means after this plan

1. `quint:check`: every registered model passes scenarios (every `run …Test`), simulation, `additionalProofInit` and
   every witness. No skips.
2. Refinement: every registered model either has a campaign in its family `index.mjs` that passes, or is listed in that
   index's exported `MODEL_ONLY` set. A completeness test in the runner fails when a model is in neither, or in both.
   `MODEL_ONLY` starts as: `AgentPhotoRequest`, `ApprovalRoutes`, `BrowserAlarmRinging`, `CalendarDeviceWrites`,
   `DevBridgeSignIn`, `PhotoLibraryAgentReview`, `ReadAloud`, `ReadReplyLease`, `RecorderStage`, `SignInChooser`,
   `SignInReadinessProbe`, `StoppedReplyReconciliation`, `VoiceSurfaceRetirement` (application), plus each services/native
   model that the first completeness run reports as uncovered, named in its index file with a one-line reason.
3. `lemma:check` with `LEMMA_REQUIRE_BACKEND=1`: 23 of 23 files verified, no generated drift.
4. `quint:verify` (Apalache, bounded depth): nightly only, sharded, every model. It is not a PR gate, because today it
   never finishes (`quint-model-check.yml`: 240 min, every run cancelled; changed-model runs reach 118 min).

### 6.2 Environment

- `npm ci` (Quint CLI from `node_modules/@informalsystems/quint`, `lemmascript` 0.6.6, esbuild, tsx, Playwright).
- `vendor/eliza` submodule checked out at `upstream.lock.json` (`sources` include `vendor/eliza/…`), then
  `npm run upstream:prepare-client` (harnesses read `.eliza/client-features`).
- Refinement extras: JDK 17+ with `javac` and the org.json jar (`refinement/native/java.mjs`), `kotlinc` and Python 3
  (`OSDefaults`, `OSProvisioning`, `OSSourceStaging`), Playwright Chromium (Vite-mounted campaigns).
- Lemma: Dafny 4.11.0 on `PATH` (`dafny --version` prints `4.11.0` here), .NET runtime.
- After U2: no `quint:prepare-history`, no network fetch.

### 6.3 Commands after U4/U5

| Purpose | Command |
|---|---|
| All models, checker | `npm run quint:check -- --jobs=4` (U4 adds `--jobs`: a pool of N child processes. Each model is already a separate `quint` process, so the pool is safe) |
| Selected models, checker | `npm run quint:check -- --models=A,B --jobs=4` |
| All refinement | `npm run quint:refinement` = `node --test --test-concurrency=4 test/quint-refinement.test.mjs` |
| Selected refinement | `npm run quint:refinement -- --test-name-pattern='^(A|B)$'` |
| Changed-model selection | `node scripts/ci/check-changed-models.ts --base=<sha> --print` prints the selected modules (no Apalache). The lane passes them to both commands above |
| Lemma | `LEMMA_REQUIRE_BACKEND=1 npm run lemma:check` |
| Symbolic, nightly | `npm run quint:verify -- --steps=6 --models=<shard k of 8>` |

`npm test` (`scripts/run-node-tests.ts`) stops running formal harnesses. Its globs become `test/*.test.mjs` and
`test/*.test.ts` minus `test/quint-*`. Remove `quint:prepare-history`, `quint:check` and `lemma:check` from
`package.json` `verify`, which becomes the host lane only. The formal lanes are their own CI jobs. Delete the npm aliases
`quint:typecheck`, `quint:test`, `quint:simulate`, `quint:conformance`, `quint:temporal` and `quint:compare` (only
`specs/quint/README.md` names them).

### 6.4 Durations (measured, then expected)

| Run | Measured today | Source | Expected after this plan |
|---|---|---|---|
| `quint:check`, all models, serial | 25 min for 379 models (≈ 4 s/model, dominated by CLI start-up and 2,000-sample witnesses) | CI run 42930847058, 02:43→03:08 | 316 models: ≈ 21 min serial; ≈ 6-7 min at `--jobs=4` (estimate: linear in models, no shared state) |
| Refinement, all | each campaign runs twice (per-model wrapper + family aggregate): application aggregate 1,090 s alone; 401 receipts sum to 1,141 s of replay, excluding trace generation and ≈ 70 `javac` runs; aggregates have 2,400 s budgets | `research/ci-and-formal.md` §8, `research/tests-host.md` P3 | one pass, ≈ 35-45 min serial, ≈ 12-15 min at concurrency 4 (estimate). Slowest single campaigns: 60-137 s (Calendar/Notes Chromium campaigns), `NativeRequestWithdrawal` 51 s, `PipedCapture` up to 360 s budget |
| `lemma:check` | ≈ 10 s in `verify` (gen-check + Dafny on 23 files); `lemma-check.yml` jobs 2-23 min including Dafny download | `research/ci-and-formal.md` §1 | unchanged ≈ 10 s plus ≈ 1 min Dafny setup |
| Changed-model Apalache (`quint:changed`) | 1 min (nothing selected) to ≥ 118 min (hot shared source) | CI run 42930847058 | removed from PRs; nightly shards of ≈ 40 models |

### 6.5 Fast lane (pull requests: changed models only)

Selection (`check-changed-models.ts --print`) after U4's source trimming:
- a changed `.qnt` → that model and every model importing it (`importedModelPaths`, already there);
- a changed manifest entry → that entry;
- a changed path in a model's `sources` → that model;
- a changed harness file under `specs/quint/refinement/<family>/<x>.mjs|.java` → the models whose campaign imports it
  (each family `index.mjs` exports `campaignInputs: Record<Model, string[]>`, the harness's own files);
- a change to `upstream.lock.json`, `android/upstream-native-sources.json`, `patches/eliza/**`, `scripts/core-state-patch.ts`
  → every model with a `vendor/eliza/` source (the 34 upstream-only models and the mixed ones);
- a change to `scripts/check-quint.ts`, `scripts/quint-lib.ts`, `specs/quint/refinement/support.mjs`,
  `specs/quint/refinement/model-traces.mjs`, `specs/quint/refinement/check-traces.mjs`, `test/quint-refinement.test.mjs`
  or the Quint version → the **full** lane.

The lane runs `quint:check --models=<sel>` and `quint:refinement --test-name-pattern=<sel>`. Campaigns that start Vite +
Chromium (`account-sheet`, `cloud-connection-notices`, `camera-preview-retirement`, `canonical-calendar-draft` (merged),
`shell-coordinator`, `browser-album-storage`, `google-calendar-link-publication`, `hosted-digest-refresh`,
`notes-recorder-media-admission`, `modal-scrim-ownership`, `composition/index.mjs`) run in the job that already has
Playwright installed (the browser lane), selected the same way. Lemma runs in the PR lane when any of the 23 sources,
`specs/lemma/**`, `LemmaScript-files.txt`, `lemmascript.json`, `scripts/check-lemma.ts` or `package-lock.json` changes.
It is cheap enough to run on every PR, so the CI plan may run it unconditionally.

Expected PR cost: a renderer change that touches one harnessed file selects 1-5 models, under 3 min. A docs change
selects nothing.

### 6.6 Full lane

Runs on merge to `main`, nightly, and on any change that the fast lane routes to "full": `quint:check --jobs=4` (all),
`quint:refinement` (all, concurrency 4, Chromium available), `lemma:check`, plus the nightly-only `quint:verify` shards.
`quint-model-check.yml` becomes that nightly job (no PR trigger, legacy steps removed). The CI plan owns the workflow
YAML and `scripts/ci/affected.ts`. This plan fixes only the commands those files call.

## 7. Execution units (ordered, non-overlapping file ownership)

Shared files are owned by exactly one unit at a time. The four `manifest.json` files are touched by U0, U2, U3 and U4
**in that order** (strictly serial). From U4 on, no port unit edits a manifest: U4 trims `sources` to entry modules, and a
port that creates a new module edits the `sources` of only the models it ports, which are disjoint between port units
(the column "Port unit" in §1 is the partition). Family `index.mjs` files and `test/quint-*` are owned by U5. Port units
change only harness files and product files, and then add their campaign to the index through a one-line edit that
U5 has pre-registered (U5 registers every campaign, ported or not).

| # | Unit | Owns (only these files) | Depends on | Done when |
|---|---|---|---|---|
| U0 | **Agent Calendar green** (Stage A fallout, now) | `specs/quint/application/AgentCalendar{Refresh,Mutation,SyncControl}.qnt` (drop preservation/legacy phases, `legacyReply`, `retentionReply`, `preservationReply`, `changedPreservationNeverDispatchesTest`, legacy statuses); `refinement/application/agent-calendar-{refresh,mutation,sync-control,event-return}.mjs` (constructor `new AgentCalendar(port, client, cache, cacheIdentity, diagnostic)`, delete preservation-only cases, replace the `Date.now()` text patch with an injected clock, drop `__selected` injection); delete `refinement/application/agent-calendar-{event-return,mutation,refresh,sync-control}.md`; their rows in `application/manifest.json`; count asserts in `test/quint-agent-calendar-*.test.mjs` | — | the 4 campaigns pass; `quint:check --models=AgentCalendarRefresh,AgentCalendarMutation,AgentCalendarSyncControl,AgentCalendarEventReturn` passes |
| U1 | **Legacy prerequisites** | new `specs/quint/refinement/support.mjs`; `refinement/application/{support,browser-deletion-poll,google-access-publication,resident-liveness,maps-reroute-ownership}.mjs`; new `refinement/application/maps-mount.mjs`; `refinement/services/{current-approval-service,fact-write-scope}.mjs`, `refinement/services/core-runtime/{connector-custody.mjs,connector-custody.md,module.mjs}`, new `core-runtime/room-handler-queue.mjs`, `refinement/services/task-service/module.mjs`, `refinement/services/task-scheduler/runtime-fixture.mjs`; `refinement/native/{mms,sms}-dispatch.mjs`, delete `refinement/native/mms-historical-sources.json`; `git mv` `legacy/CoreRoomHandlerQueue.qnt` → `services/`, its `services/manifest.json` row; `test/quint-room-handler-queue.test.mjs` import | U0 (manifest serial) | `git grep -n "quint/legacy\|/legacy/" -- specs/quint/refinement/{application,services,native,composition} scripts test` lists only files U2 deletes |
| U2 | **Legacy deletion** | everything in §2.1 "Files deleted"; `scripts/prepare-quint-history.ts`; family lists in `scripts/quint-lib.ts`, `scripts/check-quint.ts` (also delete `compare`/`temporal`), `scripts/check-quint-refinement.ts`, `scripts/ci/check-changed-models.ts`; `package.json` (`quint:prepare-history`, `verify`); `test/quint-checker.test.mjs` (delete the floor test at :30-35; it forbids retirements); `specs/quint/README.md` legacy row; `refinement/services/task-scheduler/{index,fixture}.mjs`, `test/quint-task-scheduler-refinement.test.mjs`; scenario carries into `services/CoreServiceLifecycle.qnt`, `refinement/services/task-service/index.mjs`, `core-runtime/shutdown.mjs` | U1 | `npm run quint:check` and every remaining refinement campaign pass; no `legacy` string in the four runner scripts |
| U3 | **Model deletions and merges** (§2.2, §2.3, trims that DECISIONS already executed) | the `.qnt` files, harnesses, wrappers and index lines named in §2.2/§2.3; `native/ApplicationComposition.qnt`, `refinement/composition/{index,controllers,ports}.mjs`, `test/quint-composition-refinement.test.mjs`, `test/quint-native-refinement.test.mjs:15,23`; `specs/quint/native/{conformance,recovery-vad-conformance}.mjs`; `specs/quint/services/scan-source-conformance.mjs`; `test/quint-conformance.test.mjs` cases; the 7 Java probes; manifest rows (all three families) | U2 | registry has 316 models; `quint:check` and all campaigns pass |
| U4 | **Manifest + runner simplification** | `specs/quint/{application,services,native}/manifest.json` (target schema §4.2); `scripts/quint-lib.ts`, `scripts/check-quint.ts` (`--jobs`, drop receipts, canaries, rehash, custom supervisor), `scripts/ci/check-changed-models.ts` (`--print`, no receipts, no `package-lock.json`), `scripts/check-lemma.ts` (§5.4), `package.json` `lemma:regen`; `specs/quint/refinement/check-traces.mjs` (drop mid-run re-hashing and the input-snapshot store); the 4 `AccountSheet` renames and the `ConnectionController`/`AgentCalendarRefresh`/`AccountSheet` run fixes in their `.qnt`; `test/quint-checker.test.mjs`, `test/quint-changed-models.test.mjs`, one of `test/lemma-check{,er}.test.mjs`; delete `.github/workflows/lemma-check.yml` | U3 | `quint:check` passes with `symbols` gone and `tests` derived; `lemma:check` passes |
| U5 | **One loader, one runner** | new `specs/quint/refinement/model-traces.mjs`; `support.mjs` `loadModule`; the 6 replaced loader/trace modules (§3.0) and their importers' import lines; `specs/quint/refinement/{application,services,native,composition}/index.mjs` (export `campaigns`, `campaignInputs`, `MODEL_ONLY`; register every campaign that today runs only from a wrapper: ComposerSend, DayAnchor, FilesRecentIndex, FindInPage, MapPlaneOwnership, MapsShareChoice, MediaCopyIntent, NotesDocumentTransfer, OwnNoticeQuestion, PasswordProviderDialog, PendingActionRecovery, AddressInput, ApprovalDecision (2 cases), BookmarksHydration, BrowserReviews, BrowserSessionPersistence, BrowserSurfaceNavigation, BrowserSurfacePresentation, BrowserTabLifecycle, CalendarAgentSelection, CameraFocusWrites, CalendarFormControls, `portable.callbackLanding`, BrowserDownloads, BrowserReadingState, BrowserSiteState, CalendarLinkedSync, WorkflowExecution, SettingsPageFocus; move the in-test replays ConnectionController, DelegationReceiver, FixtureBusyLatch, HomeSurface, InertHold, InlineModalFocus, KeyboardDetectors, KeyboardGeometry, PhoneRecents, BackDispatch, ChatDock, SettingsCapabilityReads, SettingsSession, SettingsListenerReads, ShadePull, ShellScreen into `refinement/application/<model>.mjs`); fold the extra cases test-45 lists (`runInboxEditCoalescerCase3`, `runMmsComposeCase2/3`, `checkRetiredFilesFilterReload`, 3 Photos owned-album stale-control cases, the Photos "old summary failure keeps counts" case, own-notice "changed notice keeps review open", DayAnchor midnight close/reopen, `checkBrowserAlbumWithoutLocks`, `quint-named-embedding-provenance` delayed-insert and restamp cases) into their campaigns; new `test/quint-refinement.test.mjs` (one `test()` per manifest model, completeness check, generic "no unobserved state field" check); delete the 4 aggregates `test/quint-{application,services,native,composition}-refinement.test.mjs`, every other `test/quint-*.test.mjs` except `test/quint-checker.test.mjs`, `test/quint-changed-models.test.mjs` and the 3 `observed-replay` guard cases moved to `test/quint/tooling.test.mjs`; delete `scripts/check-quint-refinement.ts` (keep `specs/quint/refinement/campaigns.mjs`: `native/index.mjs` and `services/index.mjs` import it; fold `test/quint-refinement-campaigns.test.mjs` into `test/quint/tooling.test.mjs`); `scripts/run-node-tests.ts` globs; `package.json` `quint:refinement` and the deleted aliases; move `test/fixtures/{google-account-panel,lifeops-scheduled-task-route,calendar-mounted-editor,modal-scrim-chromium}.mjs` to `specs/quint/refinement/application/fixtures/` | U4 | `npm run quint:refinement` runs each campaign once and passes; `npm test` runs no `specs/quint` code; completeness test green |
| P-light | trivial ports (§3.1 rows marked P-light) | those harness files; `src/browser/hosted-results.ts` (export `canonical`); `src/prototype/calendar-adapter.ts` (selection getter); `src/startup-permission-progress.ts` (hook) | U5 | rows' campaigns pass; no strip/vm in these harnesses |
| P-browser | `browser-adapter.ts` extraction | `src/prototype/browser-adapter.ts`, new `src/prototype/{browser-navigation,browser-bookmarks,browser-find}.ts`, new `src/browser/{browser-session-store,browser-presentation}.ts`; the 6 harnesses; their manifest `sources` lines | U5 | same; then D20 deletes `createSessionSaver` from `browser-poll.ts` (`lemma:check` green) |
| P-agent | `agent-adapter.ts` extraction | `src/prototype/agent-adapter.ts`, new `src/runtime/{composer-send,chat-attachments,pending-action-recovery,back-dispatch}.ts`, `src/runtime/phone-context.ts`; `test/fixtures/{first-send-draft-migration,chat-attachment-composer}.mjs`; `MainActivity` Back script asset; the harness rows | U5 | same |
| P-connection | `connection-ui.tsx` extraction | `src/runtime/connection-ui.tsx`, new `src/runtime/{connection-controller,plan-recheck,resident-liveness}.ts`; rows' harnesses | U5 | same; unblocks C4 deletion of `remoteIdentity` |
| P-main | `main.tsx` and chat motion | `src/main.tsx`, `src/prototype/chat-overlay-motion-adapter.ts` (non-annotated code only; remove `// chat-release:*`), new `src/prototype/dock-keyboard.ts`, new `src/runtime/{mounted-update,appearance-preference}.ts`, `src/runtime/dock-clearance.ts`, `src/prototype/home-shell.ts`; rows' harnesses; delete `test/fixtures/appearance-preference.mjs` | P-agent, P-connection (main.tsx imports their modules) | same; `lemma:check` green |
| P-settings | `settings-adapter.ts` extraction | `src/prototype/settings-adapter.ts` (non-annotated code only; remove `// settings-facts:*`, `// settings-reads:*`), new `src/prototype/{automatic-update-poll,settings-reads,app-update}.ts`; rows' harnesses | P-main (appearance code leaves `settings-adapter.ts` there) | same; `lemma:check` green |
| P-voice | `voice-adapter.ts` extraction | `src/prototype/voice-adapter.ts`, new `src/runtime/{quiet-voice-retry,voice-navigation-claim,conversation-capture}.ts`; rows' harnesses | U5 (runs alongside P-browser/P-agent) | same |
| P-maps | `maps-adapter.ts` | `src/prototype/maps-adapter.ts`, `src/maps/map-plane.ts`, new `src/maps/event-return.ts`; `maps-mount.mjs`, rows' harnesses | U5 | same; `legacy/maps` text gone |
| P-notify | notifications/reminders/hosted digest | `src/prototype/notifications-adapter.ts`, new `src/runtime/notification-tap-owner.ts`, `src/runtime/hosted-digest-ui.tsx`; `test/fixtures/{shade-notice-question,shade-row-custody,reminder-open-intent,retained-reminder-tap}.mjs` (deleted when ported); rows' harnesses | U5 | same |
| P-photos | `camera-adapter.ts` Photos | `src/prototype/camera-adapter.ts`, new `src/prototype/photos-library.ts`; `r/application/photos-window.mjs` | U5 | PhotosWindow, PhotosTrash, PhotosOwnedAlbumDialog pass |
| P-google | Google panel | `src/runtime/google-accounts.ts`, `src/runtime/google-connection-ui.tsx`; `r/application/fixtures/google-account-panel.mjs`, the 5 Google harnesses | U5 | 5 Google models pass |
| P-workflow | workflow, inbox, plan | `src/prototype/{workflow-adapter,workflow-authoring,automations-adapter}.ts`, inbox modules named in the rows; `r/services/*` rows; `test/fixtures/workflow-execution-fixture.mjs` | U5 | same |
| P-model | `model.js` split (with the Stage F split, same unit) | `src/prototype/model.js`, new `src/prototype/shell-helpers.ts`, new `src/prototype/{toast-queue.ts,settings-page-focus.js}` and the shell-core module, `src/prototype/calendar-form-inputs.ts`; rows' harnesses; `test/fixtures/workflow-clock-admission.mjs` | P-agent (WorkflowClockAdmission), P-notify (shade) | same; `model.js` has no text readers in `specs/` |
| J1 | `AlphaDevicePlugin` split | `java/AlphaDevicePlugin.java`, new `java/{AlphaUpdater,UpdatePause,SystemSettingsHandoff,TextScale}.java`, crash-journal bridge class; `r/native/{update-barrier,update-composition,update-staging,runtime-update-pause,settings-handoff-platform,text-scale-platform,crash-journal-platform}.mjs` and their `*Harness.java`/`*Traces.java`; `test/app-update.test.mjs` slice | U5; P-settings for `update-staging.mjs` renderer half | J1 models pass; Android build compiles |
| J2 | `AlphaLocalAgentPlugin` | `java/AlphaLocalAgentPlugin.java`, new `java/{LocalAgentRequests,PowerLaunchPin}.java`; `r/native/{request-withdrawal,request-withdrawal-platform,assistant-entry,assistant-entry-platform}.mjs`, `RequestWithdrawalReplay.java`, `AssistantEntryTraces.java` | U5 | same |
| J3 | Hosted results | `java/AlphaHostedResultsPlugin.java`, `java/HostedDelivery.java`, new `java/HostedNoticeBridge.java`, `SourceRenewalNotices`, `NativeSourceWork`; `r/native/{hosted-result-notices,source-renewal,source-renewal-platform,native-digest-platform}.mjs` and Java harnesses | U5 | same |
| J4 | Remaining Java slices | `r/native/{action-recovery-platform,canonical-tap-platform,clock-review-platform,gmail-background-platform,workflow-notice-platform,reset-orchestration}.mjs`, new `r/native/reset-ports/`; the journal delegate class in `java/AlphaActionJournalPlugin.java` | U5 | same |
| U6 | **Cleanup** | delete `sourceContext` (`r/application/support.mjs`), `test/support/strip-types.mjs`, `test/fixtures/ts-source.mjs`; `specs/quint/README.md` (≈ 40 lines), `specs/quint/refinement/README.md` ("import, never slice"), delete `specs/quint/{develop-state-review,notes-storage-getter-review-20261109,pixel-native-review-20261109,ui-return-review-20261109,verification}.md`, `specs/quint/refinement/application/README.md`, `specs/quint/refinement/services/README.md` and the narrative `*.md` notes the chunk tables mark DELETE; rewrite `specs/quint/native/README.md`; `specs/lemma/README.md` (drop lines 1-31, the per-file counts, fix `skipped-no-*backend`); `docs/formal-model-audit-2026-11/` | all P-/J- units | `git grep -lE "sourceContext\|stripTypeScriptTypes\|between\(" -- specs/quint test` returns only the upstream splices listed in §3.1 |

Parallelism: U0 → U1 → U2 → U3 → U4 → U5 are serial (shared manifests, scripts and indexes). After U5, P-light,
P-browser, P-agent, P-connection, P-voice, P-maps, P-notify, P-photos, P-google, P-workflow, J1-J4 run in parallel. Their
product files are disjoint. Only P-main, P-settings and P-model wait on the units named. The Prettier commit (D9) and
any Stage F move of a file with a row in §3.1 happen only after that file's unit is done (G1). U6 runs last.

Checks at the end of every unit: `npm run quint:check -- --jobs=4`, the unit's campaigns via
`npm run quint:refinement -- --test-name-pattern=…` (the full `npm run quint:refinement` at the end of U2, U3, U5 and
U6), `LEMMA_REQUIRE_BACKEND=1 npm run lemma:check` whenever a Lemma source or `specs/lemma/**` changed, and
`npx tsc --noEmit` plus `vite build` for units that touch `apps/app/src`. A unit that touches `android/` also runs the
Android build named in AGENTS.md. A passing harness is a host replay, and it is not evidence of an emulator or device result.
