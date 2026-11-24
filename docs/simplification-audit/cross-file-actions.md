# Cross-file actions: coordinated-change plan input

This document consolidates the "Cross-file actions", "Text/path pins", "New patterns" and "Owner questions"
sections of the 44 chunk summaries in [`chunks/`](chunks/). It also folds in the per-file reports in
[`files/`](files/) whose verdict includes SPLIT, MERGE, MOVE or RENAME (222 reports). Pattern IDs (A1…P6) refer to
[`PATTERNS.md`](PATTERNS.md). Decision IDs (D1…D14) refer to [`DECISIONS.md`](DECISIONS.md). Chunk IDs (for example
`app-22-p2` or `android-12`) point at the chunk summary that holds the evidence.

The document has six parts:

1. Structural changes (split, merge, move, rename, new shared module), each as one unit with files, target layout and
   order constraints.
2. A consolidated table of text and path pins: which tests, manifests and scripts break when a source file's text or
   path changes.
3. New patterns proposed by reviewers, deduplicated.
4. Owner questions, deduplicated and grouped, with the DECISIONS.md entry that already answers them where one exists.
5. Proposed foldering for `apps/app/src` and for the Android Java package after cleanup.
6. Upstream follow-ups (D14): changes the audit wants in `vendor/eliza`, which this cleanup does not make.

Nothing here has been implemented or verified. It is planning input.

---

## 0. Global ordering rules

These constraints apply to almost every unit below. They come from the same blockers recurring in nearly every chunk.

| # | Rule | Why |
|---|---|---|
| G1 | **Retire text pins before you move or reformat.** Delete or port the T1/T2/T10 tests and harnesses that slice, regex or transplant a file before you split, move, rename or format it (D10, D11). | Almost every structural unit is blocked by marker slicing, such as `connection-ui.tsx` (98 readers), `model.js` (32 host tests), `main.tsx` (14 tests and 10 Quint harnesses), `settings-adapter.ts` (marker comments) and `agent-adapter.ts` (47 manifest paths and 29 symbols). |
| G2 | **Delete before you split.** Remove the code that D1/D2/D3/D4/D5/D8 delete (legacy readers, Wallet, backup, linked Calendar sync, hosted/paired/personal Cloud, constant-false switches) before you split the file that holds it. | Several splits shrink by 30–50 % once dead code is gone. Examples: `agent-adapter.ts` loses about 420 lines and `connection-ui.tsx` part 1 about 480. |
| G3 | **Introduce a shared module once, then migrate.** Each shared helper (`lib/*`, `scripts/lib/app-identity.ts`, Java `util/`, androidTest drivers) is introduced in one change. Callers migrate in follow-ups. | Several chunks propose the same helper under different names, for example `WebViewTestDriver.until` in 8 androidTest chunks and `sha256Hex` in 10 renderer chunks. |
| G4 | **Inventory files change with every move.** Every delete, merge, move or rename edits `test/support/feature-parity.mjs` (exact path inventory checked by `test/feature-parity.test.mjs`) and any `specs/quint/{application,native,services,legacy}/manifest.json` `sources`/`path` entries in the same commit. Android test classes also edit `scripts/android-instrumentation.ts` (`CLASS_REGISTRY`, `NOT_RUN_BY_A_RUNNER`, `CAMPAIGN_RUNNERS`, `DEFAULT_CLASSES`) in the same commit. | `test/android-instrumentation-runner.test.mjs` fails on stale `NOT_RUN` entries and on unregistered `@Test` classes. |
| G5 | **Persisted identities stay byte-identical.** This covers storage keys, slot names, event names, BroadcastChannel names, wire values, export formats and WorkManager worker class names (D1: "current persisted formats stay"). | WorkManager stores the worker's binary class name, so renaming, nesting or merging `GmailDeliveryWorker`, `HostedDeliveryWorker`, `DeletionWorker` or `AlphaNoteAudioPlugin$NotesTrashBackstopWorker` orphans enqueued work unless a cut-over cancels the old unique names (android-13, android-14). |
| G6 | **Formal artefacts regenerate in the same commit.** When a LemmaScript-verified file moves or its `//@` contract changes, update `LemmaScript-files.txt`, regenerate `specs/lemma/apps/app/src/**.dfy(.gen)` and update `specs/lemma/README.md`. Quint manifest symbol pins include local variable names (`pending`, `seen`, `previous`, `loadingMore` …), so grep the manifests before any rename. | D11: every live model keeps passing. |
| G7 | **The formatter runs last** (D9). Prettier runs once as its own commit, after G1 removes the text-anchored tests. Java is formatted only where it is touched. | Tests such as `test/quint-video-edit-review.test.mjs` rewrite exact code substrings, and T2 fixtures strip `^import .*;\n`, so imports must stay single-line until those fixtures are gone. |
| G8 | **D7 dormant features stay.** Always-on listening, hardware/Power invocation and Clef end-of-turn are kept untouched apart from dead helpers. The P-78 deletion units that several Android chunks propose (U-A20) are therefore **not** executed. | DECISIONS D7. |
| G9 | **Upstream changes are follow-ups** (D14). A unit that needs a `vendor/eliza` change stops at the Alpha side and is listed in §6. | AGENTS.md: never edit the vendor checkout. |

---

## 1. Structural units

Each unit is one coordinated change (or a short ordered chain of commits). "Pins" names the extra files that must
change in the same commit, beyond the G4 inventory files that every move edits. Unit IDs: `U-L*` shared libraries and
cross-cutting, `U-R*` renderer (`apps/app`), `U-A*` Android main source, `U-T*` Android instrumentation, `U-O*` AOSP
packets and Android build modules, `U-B*` build config and scripts.

### 1.1 Shared libraries and cross-cutting modules

#### U-L1 Renderer micro-helper library `apps/app/src/lib/`
- **Creates:**
  - `lib/hash.ts` (`sha256Hex`; about 28 copies)
  - `lib/is-record.ts` (plain-object guard; about 35 copies)
  - `lib/ids.ts` (UUID v4 regex / `isUuid`, id regex constants)
  - `lib/abort.ts` (`isAbortError`, `raceAbort`, `abortableDelay`)
  - `lib/base64.ts` (base64 and WAV helpers)
  - `lib/parse.ts` (`object`, `optionalString`, `string`, `uuid` from cloud-protocol)
  - `lib/random.ts` (`revision()` random hex from `browser/revision.ts`)
  - `lib/serial-queue.ts`
  - `lib/json.ts`
  - `lib/session-key.ts`, or `runtime/session-key.ts` (session/owner key; app-10, app-11, app-13)
  - `runtime/civil-date.ts` (civil day, `DAY`, date parse: 12 copies; app-10, app-11)
  - `lib/foreground.ts` / `browser/foreground.ts` (see U-R6)
- **Callers (sources):** app-05 #11, app-06 #9, app-07 #6, app-11 #12, app-15 #9, app-16 #6, app-20 #8, app-24 #13,
  app-25 #8, app-21 #3. Files include agent-calendar.ts, assistant-draft-store.ts, calendar-approval.ts,
  automations-protocol.ts, client-observation-support.ts, alpha-client.ts, local-agent.ts,
  local-agent-native-stream.ts, cloud-protocol.ts, inbox-local-store.ts, reminder-adapter.ts (×3), browser/calendar.ts,
  deletions.ts, hosted-results.ts, workflow-notices.ts, workflow-trigger-runtime.ts, camera-adapter.ts,
  phone-adapter.ts, note-source-adapter.ts, native-recovery-backup.ts, mail-attachments.ts,
  note-recording-journal.ts.
- **Order:**
  1. Create the module.
  2. Migrate one area per commit.
  3. Hash inputs (`JSON.stringify(x)`) stay identical, because persisted digests and `sourceHash` depend on them
     (app-07 #6).
  4. Some vm-transplant harnesses strip imports and must inject the helper, or be retired first:
     `scripts/test-reminder-time-flow.ts`, `test/scanned-calendar-handoff.test.mjs`, `test/calendar-view-rules.test.mjs`
     (app-16 #6).

#### U-L2 Typed native plugin modules `apps/app/src/native/` (C2)
- **Creates** one typed module per plugin, merged with the root `native.ts` and `daily.ts`:
  - AlphaVoiceCloud (about 16 files)
  - AlphaDevice (14)
  - AlphaCalendar (12)
  - AlphaNotifications (8)
  - AlphaHostedResults (5)
  - AlphaConnection (3–5)
  - DailyApps
  - ElizaLocation
  - AlphaPhotoLibrary
  - AlphaFiles
  - AlphaMailAttachments
  - AlphaNoteDocuments
  - AlphaContacts
  - AlphaBrowser
  - AlphaTelephony
  - AlphaPhotos
  - ElizaSystem
  - Agent (`LocalAgentBridge`)
- **Sources:** app-08 #4, app-10 #10, app-12 #11, app-13 #5, app-16 #12, app-17 #15, app-19 #4, app-21 #6,
  app-23 #10, app-24 #1–3, app-25 #9, app-26 #12.
- **Naming conflict:** reviewers proposed `runtime/plugins/*.ts`, `runtime/voice-plugin.ts`,
  `runtime/hosted-results-plugin.ts`, `runtime/agent-plugin.ts`, `runtime/contacts-plugin.ts` and `native/plugins.ts`.
  **Pick one: `apps/app/src/native/<plugin>.ts`** (see §5).
- **Order:**
  - Make members required (B2) only after the web implementations gain the no-op members. For example,
    `browser/hosted-results.ts` needs `withdrawResult`, `setResultsShowing` and `releaseResultQuestion` (app-24 #1).
  - Delete phantom members that no `@PluginMethod` implements (`holdSpeechEngine`/`releaseSpeechEngineHold`, app-24
    #12).
- **Pins:**
  - Path-keyed stubs: `test/contacts-adapter.test.mjs:5` and `test/comms-settings.test.mjs:48`.
  - `specs/quint/refinement/services/contacts-session-replay.mjs` and
    `specs/quint/refinement/application/hosted-digest-refresh.mjs` (stubs `./cloud-delegation-ui`).
  - Test fakes `test/browser/voice-assistant-fixture.ts` and `test/local-reply-speech.test.mjs`.

#### U-L3 One dialog lifecycle and one review scaffold (C4)
- **Creates:**
  - `openOwnedDialog()`, either in `browser/dialog-layout.ts` (renamed `dialog-kit.ts`) or in `runtime/` (from
    `inline-modal.ts`/`modal-inert.ts`).
  - One `dialogs.css`.
  - One review scaffold: move `prototype/source-review-dialog.ts` to `runtime/review-dialog.ts` (`openReview`).
  - Export `focusableControls` and a shared `trapFocus`.
- **Users (about 35 modules):**
  - Calendar: calendar-editor, calendar-meeting, calendar-response.
  - Clock, content-question, domain-recovery, retained-data-notice, review, selected-document-viewer,
    mail-attachments, reading-review, notifications, device (openSettings), password-provider, incoming-simulation,
    location-simulation, simulator-recovery, device-controls.
  - Workflows: workflow-history, workflow-receipts, workflow-result-input, workflow-urgency.
  - passwords/dev-vault, video-edit-review, workflow-filters, hosted-digest-ui.tsx:355-394, connection-ui chooser,
    google-connection-ui.tsx, calendar-approval-review, file-email-review, summary-note-review (with
    agent-adapter.ts:1984-1985), note-web-source-adapter, note-source-adapter, calendar-sync-settings,
    browser/content-question.
- **CSS merges:** calendar-meeting.css, calendar-response.css, review.css, selected-document-viewer.css and
  mail-attachments.css become `dialogs.css`.
- **Sources:** app-05 #7, app-06 #3, app-07 #4, app-10 #11, app-12 #10, app-17 #8, app-19 #11, app-22-p2 #5, app-24 #10.
- **Order:**
  1. Mount every dialog inside `.os`, so the token copying can go.
  2. Adopting `openReview` inerts the phone for summary-note review. That is an owner question (Q-UI-5).
- **Pins:**
  - `test/browser/workflow-dialog-layout.spec.ts`, `remaining-dialog-layout.spec.ts`, `notes-named-review.spec.ts`,
    `notes-query-review.spec.ts` (read and strip types).
  - `specs/quint/refinement/application/boundaries.mjs`.

#### U-L4 Observable browser document `observedDocument()` (C4)
- **Source:** the existing implementation in `browser/preference-documents.ts`.
- **Users:** calendar-store, development-account-document, reminder-store (absorbs reminder-action-document and
  reminder-creation-document), notification-store, hosted-results, workflow-notices, digest-authorization-document.
- **Event names (`alpha:*-document-changed`) stay.** Consumers that listen on `window 'focus'` keep working.
- **Sources:** app-05 #8, app-06 #2, app-07 #7.

#### U-L5 Durable slot adapter `runtime/durable-slot.ts` (C4)
- **Change:** generalise `runtime/reminder-journal-store.ts` (MOVE and rename it).
- **Adopted in:** reminder-creations, reminder-deletions, notes-folders, notes-trash, note-audio-deletions,
  service-read-cache-store and workflow-intents.
- **Every slot and key string stays.**
- **Pins:** `test/native-secure-slots.test.mjs` (text reader) and Quint `reminder-adapter-fixture.mjs:29`
  (app-25 #1).

#### U-L6 Generic deletion journal in `browser/journal-retention.ts`
- **Adds:** `JournalBinding`, `JournalIdentity`, a deletion limit constant, `deletionMethods()` and
  `deletionJournal<Row>`.
- **Folds in** `reminder-deletions.ts` and `calendar-deletions.ts`.
- **Used by:** calendar.ts, daily.ts, deletions.ts, deletion-recovery.ts.
- **Formal:** `journal-retention.ts` is LemmaScript-listed. Re-check Quint `browser-deletion-poll`,
  `browser-reminder-orphan` and the application manifest (lines 2004-2008 and 2530-2535). Sources: app-05 #6, app-06 #7.

#### U-L7 `scripts/lib/app-identity.ts` (C3/C6)
- **Exports:** `appIdentity` and `readAppIdentity(root)`.
- **Replaces** 31 ad-hoc readers of `app.config.json`. Covers 29 scripts listed in app-01 #1, plus `vite.config.ts:18-19`
  (U-B1).
- **Replaces** about 81 hard-coded `ai.alphacompute.alphaphone` literals in 65 files. Examples:
  `android-instrumentation.ts:46`, `android-cloud-voice-timing.ts`, `android-resident-instrumentation.ts`,
  `maps/test-native-*.ts`, `browser-cloud-dev-bridge.ts`. Python CI scripts (`ci/pending-recovery-ui.py`,
  `resident-native.py`, `test-pending-recovery-phases.py`, `resident_crash_diagnostic.py`) read the JSON directly.
  AOSP Python (`core-launcher/prepare.py:136,223`, `stage-alpha-os-branding.py:93`) reads `appId` (android-01 X8).
- **Drop** the three self-assertions (`android-workflow-native.ts:86`, `test-calendar-regression.ts:58`,
  `native-test-fixture.ts:113`).
- **Delete** the dead tablet branch in `prepare-ci-emulator.ts:67-69`. `test/launcher-orientation.test.mjs` keeps its
  pin.
- **Pins:** test fixtures that stage a temporary root need `readAppIdentity(root)`. They are
  `test/fixtures/app-update-candidate.mjs`, `voice-host-product.mjs`, `resident-java-source-stage.mjs` and
  `isolated-native-campaign.mjs`. `test/product-identity.test.mjs` keeps one literal on purpose.

#### U-L8 Java util package `ai.alphacompute.alphaphone.util` (C3)
- **Classes:**
  - `Digests`: hex/SHA-256. It replaces `HostedResultNotices.hash`, which about 18 files use (a misattributed helper),
    plus copies in AlphaDevicePlugin, AlphaCredentialStore, WorkflowWorkerAssets, release/DataIntegrityProvider,
    CalendarSyncSnapshot, GoogleWorkspaceReturnFlow and AlphaCanonicalNotifications:99.
  - `Ids`, `BoundedIo`, `Http`, `Json.wholeNumber`.
  - `Workers`: GmailDeliveryWorker and HostedDeliveryWorker scaffolding. Class names stay (G5).
  - `CalendarPermissions`, `MainThread`, `Diagnostics`.
  - `OwnerSurface.check`: one owner-foreground check, replacing about 10 variants. Each caller is audited against its
    PRD flow; see Q-AND-9.
- **Sources:** android-12 #2/#3, android-13 #8, android-14 #5, android-15 #2, android-16 #9.
- **Pins:**
  - Quint harnesses that compile Java by path (`specs/quint/refinement/native/*.mjs` source lists) must add the util
    sources.
  - Quint stubs that declare `hex` change.
  - javac host tests (`test/*.test.mjs` with `test/fixtures/*Test.java`) must add the util classpath.

#### U-L9 Java base-plugin `background(call, work, closedMessage)` and closed-bridge unification
- **Replaces:** per-plugin executor and `RejectedExecutionException` boilerplate in AlphaDevice, AlphaActionJournal,
  AlphaCloudSignIn, AlphaConnection (+ `SerialStorageTasks`, Q-AND-11), AlphaDeletions, AlphaCalendar, AlphaGmail,
  AlphaFiles, AlphaMapsTransport, CalendarScopedDeletionReview and CalendarSyncBridge.
- **Builds on:** `PluginWorkers.java` and `LateLaunch`.
- **Pins:** `test/plugin-worker-guard.test.mjs` (worker field names; the `AlphaFilesPlugin.worker` entry is already
  stale), `test/native-plugin-teardown.test.mjs:272-332` (asserts the current overrides) and
  `test/serial-storage-tasks.test.mjs`.
- **Order:** the `LateLaunch`/closedMessage fix may belong upstream in the base plugins (§6, Q-AND-14). Otherwise use
  one Alpha base class. Sources: android-12 #4, android-14 #10, android-15 #12.

#### U-L10 Java credential slots `AlphaCredentialStore.asSlots()` and shared `Slots`/`Guard` interfaces
- **Replaces** anonymous slot adapters in AlphaActionJournal, AlphaActionJournalPlugin, WorkflowNoticeTapsFactory,
  AlphaCloudSignInPlugin, AlphaConnectionPlugin (GoogleWorkspaceReturnFlow.Store), AlphaReminders, AlphaTelephony,
  AlphaNotificationsPlugin, HostedDelivery (HostedResultNotices.Storage becomes HostedInbox.Store), GmailBackground,
  NativeDeletionCoordinator, NativeDigestHost, NativeDigestSources, SourceRenewalHost, SourceRenewalNotices,
  WorkflowNoticeDelivery, WorkflowNoticeTaps and NativeOwnerReminderHost.
- **Shared `Guard`:** NativeDigestSources, ResidentResultSession, ResidentCredentialShutdownRetry, HostedInbox,
  HostedTransport and AlphaCanonicalNotifications. Rename `SourceRenewalNotices.Guard` to `Source`.
- **Pins:** tests that construct `new X.Storage(){…}` (NativeDigestSourcesTest, Workflow*Test, androidTest workflow
  suites). Sources: android-12 #5, android-14 #6, android-15 #3/#4.

#### U-L11 Java slot and constant literals (C6)
- `CloudDeployment.PRODUCTION_SLOT` replaces 32 `"cloud:production"` literals in 9 files: AlphaCredentialStore,
  AlphaConnectionPlugin, AlphaLocalAgentPlugin, CalendarSyncBridge, GmailBackground, KeyboardDictationCloud,
  LegacyCloudRecovery, RendererCredentialSlots, ResetBeforeDispatch.
- `LocalAgentProviderAdmission.PROVIDER_SLOT` replaces `"local-agent-provider:v1"` in KeyboardDictationCloud,
  AlphaLocalAgentPlugin and AlphaVoiceCloudPlugin.
- `"mail-attachments"` is shared by AlphaMailFileProvider and AlphaMailAttachmentsPlugin. The XML resource keeps its
  literal.
- Production-owned names are exposed for tests: `alpha-photo-edit-results` and `alpha-owned-media-versions` from
  AlphaMediaConfig/AlphaPhotosPlugin, `note-audio-metadata:v1:` from AlphaNoteAudioPlugin, and
  `WorkflowNoticePoster.TAG_PREFIX`.
- Op-type constants are shared between AlphaActionJournal and AlphaActionJournalPlugin.
- `scripts/cloud-deployment.ts:75` is trimmed to emit only fields that are read. Regenerate `CloudDeployment.java` and
  the TS twin, then update `test/cloud-deployment.test.mjs` and `white-label-copy.test.mjs` (android-14 #7).
- Sources: android-11 #8, android-12 #9/#13, android-13 #9/#10, android-15 #11.

#### U-L12 Resident owner verifier `ResidentOwner` (Java)
- **Replaces** 4–5 copy-pasted `/api/auth/me` owner-session and running-agent checks in NativeNotificationSession,
  NativeOwnerReminderHost, ResidentResultSession, ResidentResultTransport and optionally AlphaLocalAgentPlugin:1186.
- **One strictness rule** covers the placeholder agent and `expiresAt` equality versus `<= now` (Q-AND-23).
- **Pins:** `test/native-notification-session.test.mjs`, `resident-result-transport.test.mjs`,
  `native-deletion-review-fence.test.mjs` and Quint `resident-coordinator.mjs`, `hosted-inbox.mjs`,
  `deletion-coordinator.mjs` (android-15 #1).

#### U-L13 Shared androidTest drivers (one change; T7/C3)
Eight chunks propose overlapping helpers. Introduce them once in this layout. **Agree one name for each.**

| Driver (new or extended) | Contents (union of proposals) | First adopters |
|---|---|---|
| `WebViewTestDriver` (extend) | `until`, `call`, `invoke`, `awaitPromise`, `unquote`, `click`/`clickButton`, `setValue`/`setInput`, `pressKey`, `plugin`, `nativeCall`, `liveActivity`, `resumedPackage`, `countLaunches`, `diagnostics`, `child` | about 180 local copies across about 80 classes (android-04…11) |
| `AppNavigation` (extend) | `requiredSignIn`, `open`, `go(view)`, `SETTLED`, `enterMockMode`, `exitMockMode`, `clickLabel`, `clickText`, `setValue`, `viewIntent`, `alphaIsHome`, `setComposer`, `openSettings` | Accessibility*, Browser*, ChatContinuity, DailyApps, LauncherHome |
| `AccessibilityFixture` (new; android-04 uses this name, android-05/09 call it `AccessibilityTestDriver`/`NativeUiDriver`) | `VIEWS`, `shell`, `fontScale`, `restoreFontScale`, `FOCUS_PROBLEM`, `TEXT_SCALE`, `pressHome`, `oneMainActivity`, `awaitForeground`, `withFontScale` | AccessibilityViews/Lifecycle/HomeRole, AccessibilityInstrumentedTest, AppInfo |
| `BrowserTestDriver` + `BrowserHostProbe` + `LoopbackHttpFixture` (split out of `BrowserFlowInstrumentedTest`) | child/host/address/click/tapChild/until/diagnostics/serveFromMemory, resumedMain, readingDialog, tabs, attemptCleanup; **all** reflection into upstream `BrowserTabHostPlugin` lives in `BrowserHostProbe` | the 11–12 classes doing `new BrowserFlowInstrumentedTest()` |
| `DocumentsUiPicker` (from `SelectedDocumentInstrumentedTest:49-131`) | MediaStore fixtures, DocumentsUI driver, `fixtureBytes`, `selectDocument` | BrowserFlow:144, CameraScan:144/179/223/229, NotesDocument:86/117, PosterCalendarJourney:54 |
| `MainProcessControl` / `ProcessDeathDriver` (from `WorkflowNoticeProcessDeathInstrumentedTest:23-84`) | awaitMain, killMainWithoutTasks, … | WorkflowApprovalNoticeProcessDeath, ReminderTapProcessDeath |
| `TestShell` / `DeviceShell` | `run`, `topResumed`, `awaitTopResumed` | Rotation, Settings*, SystemShade, TextScale, Shell |
| `UiNodes`, `TestDigests.sha256Hex`, `TestAudio`, `NoteAudioFiles`, `Keys`, `Cleanup`, `TestReflection`, `ClockIntents`, `PhaseCheckpoint`, `WorkTestDriver` | small helpers | across all androidTest chunks |
| `CalendarProviderFixture` / `CalendarFixture`, extend `CalendarUiTestDriver` (`click`, `open`, `chooseDate`, `awaitFocus`) | | Calendar*, ScopedCalendarDeletion, HomeCalendarCard |
| `PhotosTestFixture` (extend: `insert`, `revision`, `includeTrashed`, `fixture`, `bytes`) | | PhotoEdit, PhotoFilter, PhotoReplace, PhotoLibrary, PhotosBatch, PhotosCatalogOrder, PhotosLibrary, PhotosTrash, PhotosMultiShare |
| `ReminderTestSupport` (rename `ReminderUiTestDriver`, absorb `ReminderNotificationActions`) | constants from `AlphaReminders.CONFIGURATION` | 14 Reminder* classes |
| `ResidentTestFixture` (extend: `call`, `awaitReady`, `trajectories`, `hash`, `nativeCall`, `startAndEnroll`, admission prologue; absorb `ResidentModelResponseContract`, `TrustedPackagedWorker` helpers) | | ResidentService, ResidentEgressRedaction, ResidentWorkflowCrash |
| `RendererTestDriver` | static helpers from `RendererRecoveryInstrumentedTest` | LauncherHome |
| `WorkflowNoticeTestSupport` + `WorkflowNoticeOwnerFixture.route()/forgetOwner()` | row/present/awaitGone/awaitPublished/awaitPendingTap/approvalId/helper-process preamble | 4 Workflow notice classes |
| `HostedAgentFixture` | | HostedBackgroundWorker, HostedProcessRestart |
| `NotificationAccessTestDriver` (extend: `fixtureIdentity`, `restorePrefs`) | | both CrossApp classes |
| `InboxFixtureSignIn.signIn()`; `InboxFixtureScope` fields go to `InboxFixtureConnection` | | InboxDraft, VoicePermissionDenied |
| `SignedInScope` (AutoCloseable; picks test-mocks vs flag-off sign-in per build, owns cleanup) | | Video, VoicePermissionDenied (android-11 NEW-a) |
| `MapsTestDriver` | | Maps* |

- **Constraints:**
  - Gate text such as `"1".equals(InstrumentationRegistry.getArguments().getString("<gate>"))`,
    `BuildConfig.ELIZA_DEV_ALLOW_TEST_MOCKS` and `isSystemUser()` must remain literally present in each gated class.
    `test/android-instrumentation-runner.test.mjs:143-160` regex-checks it.
  - Delete `test/browser-tab-host-identity.test.mjs:74-75` (a regex on BrowserWebFeatures `field`) in the same change
    (android-05 #1).
  - Re-point or delete `test/accessibility-coverage.test.mjs:163-178` (regexes on VIEWS and TalkBackOrder).
  - Rename `NotesSecureFixture.evaluate` to `evaluateWithNotes` (18 callers).
  - Drop the unused `scenario` parameter in about 70 `eval(scenario, js)` sites.
- **Sources:** android-04 #1–4, android-05 #1, android-06 #5/#7/#8, android-07 #7–9, android-08 #5/#6/#9, android-09
  #3/#7–11, android-10 #1–3, android-11 #1–3, android-16 #8.

### 1.2 Renderer (`apps/app`)

#### U-R1 Dev module boundary `apps/app/src/dev/` (D5/D6, D13 build half in U-B2)
- **Moves to `dev/`.** These are all behind one dynamic import / `@dev` alias:
  - **From `browser/`:**
    - cloud-connection.ts (exports the endpoint for `browser-cloud-resident`)
    - the 12 `development-*` files
    - dev-profile.ts (or its flags only)
    - device-adapter.ts, device-controls.tsx/.css, focus-state.ts, incoming-simulation.ts, location-simulation.ts,
      password-provider.ts
    - the `digest-*` files (authorization-document, delegation-ui, delegation, live-sources, storage)
    - simulated-apps, simulated-inbox, simulated-messages, simulated-voicemail, simulated-workflows
    - simulator-recovery, simulator-writer
    - the 15 dev `workflow-*` simulator modules, merged into `dev/workflow-sources.ts` (U-R7)
    - the dev composer from notifications.ts (`dev/notification-composer.ts`, U-R8)
  - **From `runtime/`:**
    - development-cartesia-conversation.ts → `dev/realtime-voice.ts`, dynamically imported from
      `voice-adapter.ts:633`
    - mock-admission.ts
    - browser-cloud-resident.ts → `dev/cloud-resident.ts`
    - local-agent-storage.ts → `dev/development-storage.ts`
    - the dev bridge, speech and store parts of local-agent.ts → `dev/development-agent-bridge.ts`
    - the `RemoteProtocol` class from remote-protocol.ts (D5 harness)
    - the dev storage/recovery/scheduler from hosted-digest-ui.tsx and the dev half of hosted-live-source-ui, as one dev
      factory
    - the dev hand-off from cloud-protocol.ts (`login/handOffLogin/delay/revokeReplaced`, the Google
      committed-cancellation path, `acceptsReferences`/`clearIfCurrent`) → `DevelopmentCloudProtocol`
  - **From `prototype/`:**
    - development-rail.html, development-system-surfaces.html
    - fixtures.js, fixtures.empty.js, fixtures/img/ → `dev/fixtures/`
    - the fixture-only model views and `reply`/`actions` (U-R10)
    - the simulated shade (notifications-adapter.ts:90-212 and the native-adapter tiles → `dev/simulated-shade-notices.ts`)
    - the browser-calendar dev decorator (calendar-adapter.ts `!isNativePlatform()` branches)
    - dev-only copy recovery in camera-adapter.ts
    - the Settings test-mocks pages
    - the dev rail `renderVals` values
  - **From `passwords/` and `maps/`:** dev-vault.ts and regional-provider.ts.
  - **From `main.tsx`:** the dev-tools command handler, mock banners and mock mode → `dev/mock-mode.tsx`.
  - **Root:** startup-browser-permissions.ts and runtime/workflow-request-recovery.ts go behind the browser/dev boundary
    (app-26 #17).
- **Deletes (D2/D5) instead of moving:** wallet simulation, the personal-Cloud dev UI (development-cloud-ui.tsx,
  development-cloud.ts and documents, if Q-DEV-2 says delete) and simulators of deleted features.
- **Order:**
  1. U-B3: all flags in `build-flags.ts`.
  2. Remove the export folds (`development-cloud-ui.tsx:10`, `development-identity.ts:10`) and inner flag checks.
  3. Move one group per commit.
  4. Run `scripts/audit-production-bundle.ts` with the flag on and off after each move.
- **Pins:**
  - Build config: `vite.config.ts:20-22,27-35,74-85` (stub keys and the importer allowlist; replaced by U-B2),
    `template-source.ts:3-4`, the `model.js:8-16` import specifier, `model.d.ts:5,7`, `prototype/README.md`.
  - Tests: `test/dev-surface-gates.test.mjs` (also `:88`, `:100-120`), `test/password-dev-editor.test.mjs:4`,
    `test/settings-truth.test.mjs:173`, `test/development-cartesia-conversation.test.mjs`,
    `test/development-voice-navigation.test.mjs`, `test/browser/fixtures-empty-runtime.spec.ts:15`,
    `shaw-ui-fixtures.spec.ts:73`, `quint-shell-screen`, `aosp-secure-camera-policy:63`, `theme-palette:10`,
    `voice-in-chat-only:30,33`.
  - Formal: `specs/quint/application/manifest.json:390,8060-8064` (ShellScreen), `contracts.mjs:94`,
    `voice-transcript-follow.mjs`, `development-digest-pending-probe.mjs:5`.
  - Scripts: `scripts/test-local-agent.ts:156`, `test-local-digest-storage.ts:6`.
  - Browser specs: about 40 `test/browser/*` specs that `page.evaluate(import('/src/browser/development-*'))`.
- **Sources:** app-05 #9, app-06 #6, app-08 #8, app-10 #8, app-11 #13, app-12 #7/#8, app-15 #6, app-22-p2 #7, app-23 #4,
  app-24 #5, app-26 #17, app-27 #2.

#### U-R2 `@eliza/*` alias and shim removal (D13)
- **Change:** one wildcard alias for `.eliza/client-features/*`, generated by `scripts/prepare-client-features.ts` as
  `aliases.json` plus `tsconfig.paths.json` (U-B1). Then rewrite the 364 `../../../../.eliza` imports in 197 app files
  and 18 test/spec files.
- **Deletes these re-export shims and repoints their importers:**
  - the 9 maps shims (app-08 #1)
  - `prototype/assistant-draft-controller.ts`
  - `prototype/mock-attention.ts`
  - `runtime/voice-assistant.ts`, `runtime/voice-turn-routes.ts`
  - `runtime/gmail-grants.ts`, `gmail-read-ahead.ts` and the re-export part of `gmail-mailbox.ts`
  - `runtime/inbox-unsaved-record.ts`, `mail-preview.ts`, `maps-contract.ts`, `live-voice.ts`, `live-segment-stream.ts`
  - the `image-sms.ts` aliases
  - the test-only re-exports in `inbox-operation.ts`
  - the `summary-source` aliases
  - the system-shade re-exports (`model.js:20`, `main.tsx:48` import `@elizaos/capacitor-system/shade`)
  - `native-adapter.ts:96` settings helpers (import from `@elizaos/capacitor-system/settings`)
  - the `notes-organize-contract.ts` fork (app-25 #3)
  - the `vendor/eliza/packages/core/src/utils/uuid` deep import in `connection-ui.tsx:25`
- **Pins (the alias half):**
  - `vite.config.ts` resolve.alias, `tsconfig.json` paths, `test/dev-surface-gates.test.mjs:19` (alias copy),
    `test/client-feature-preparation.test.mjs:257,261`, `test/fixtures/shared-batch-voice.mjs:11`.
  - A Node resolve hook in `test/support/strip-types.mjs`.
- **Pins (import-specifier stubs, which silently un-stub when a specifier changes):**
  - `test/cloud-maps-session.test.mjs` (stub keys `./cloud-session`, `./runtime`),
    `specs/quint/refinement/services/maps-connection.mjs:31-49`.
  - `trigger-cursor-replay.mjs:32-40`, `test/video-capture-limit.test.mjs:12`, `video-edit-review.mjs:15`.
  - `test/browser-reading-capability.test.mjs:156`, `test/dc-lite-keys.test.mjs:13`.
- **Pins (per-shim):** `test/assistant-draft-dispatch.test.mjs:8`, `test/quint-conformance.test.mjs:147,178`,
  `test/voice-assistant.test.mjs:8,145,750`, `test/voice-turn-routes.test.mjs:12-13`, Quint
  `composition/ports.mjs:60`, `native/renderer.mjs:13`, native manifest `:70,75,541,1353` and the per-shim
  services-manifest lines (app-24 #9).
- **Sources:** app-08 #1, app-09 #4, app-12 #14, app-13 #2, app-14-p1 #6, app-15 #4, app-17 #10/#13, app-22-p1, app-23
  #5, app-24 #9, app-26 #1, app-27 #1.

#### U-R3 Delete the client-side Calendar linked-sync stack (D4)
- **Deletes:**
  - `runtime/`: calendar-sync-host.ts, calendar-linked-store.ts, calendar-linked-storage.ts, calendar-linked-provider.ts,
    native-calendar-sync.ts, google-calendar-selection.ts, and calendar-sync-settings.ts except its type.
  - `browser/`: calendar-linked-local.ts and calendar-sync-fields.ts (Q-CAL-3).
- **Moves:** `CanonicalCalendarSyncSettings` → `google-accounts.ts`, or to the new `google-calendar-link.ts` from U-R18.
- **Edits:**
  - `cloud-protocol.ts`: the import at L4, and drop `googleCalendarSync` (L548) / `googleCalendars`.
  - Type imports in `google-accounts.ts:5` and `google-connection-ui.tsx:17,224`.
  - Remove the `alpha:calendar-sync-*` dispatchers (connection-ui.tsx:460).
  - The comment at `agent-calendar-adapter.ts:44`.
  - `managed-service-routes.ts:19-20` (Q-CAL-4).
- **Deletes tests:**
  - Browser specs: calendar-sync-settings, calendar-linked-storage, one-calendar, and the sync parts of
    calendar-sync-fixture.
  - Host tests: calendar-sync-settings-navigation, calendar-linked-store, native-calendar-sync-port,
    calendar-agent-write-host, calendar-managed-rejection (check scope), and the slot line in
    native-secure-slots.test.mjs:97.
  - Fixtures and scripts: `test/fixtures/browser-daily-stores.mjs:41`, `test/fixtures/google-account-panel.mjs`,
    `test/browser/accessibility-states.ts:461`, `scripts/test-calendar-sync-provider.ts`,
    `scripts/test-google-calendar-selection.ts`, `scripts/storage-specs.ts:10-11`.
  - Formal: Quint `composition/ports.mjs:58`, `services/calendar.mjs`, `google-calendar-link-publication.mjs`,
    `calendar-linked.mjs`, the sync-host entries in the native and services manifests, and
    `services/manifest.json:2342`.
  - Inventory: `feature-parity.mjs:191,198,469-473`.
- **Android half (owner, Q-CAL-1):** `CalendarSyncBridge/Snapshot/Mutation`, the `AlphaCalendarPlugin` sync methods,
  the `calendar-linked-sync:v1:` slot, `CalendarSyncProvider` androidTest and its registry entry. If the Android half
  stays, CalendarSyncBridge is split into lease/consent and `CalendarSyncJournal` (per-file report); the
  `native-calendar-sync:v1` format is unchanged.
- **Sources:** app-05 #3, app-20 #1, app-21 #11, app-23 #1, app-25 #6, android-05 #9.

#### U-R4 Delete legacy readers (D1), renderer side
These deletions come before U-R10/U-R11/U-R12 split the files that host them.
- **Previous/Older notes chain:**
  - Delete: `prototype/legacy-notes-access.ts`, `note-source-adapter.ts`, `note-web-source-adapter.ts`,
    `notes-query-executor.ts`, `notes-query-review.ts`.
  - Remove the legacy branches in: agent-adapter (≈360 lines: `notesSourceOptions`, `notesSourceMode`,
    `moveNoteToTrash`/`notesFolders`, `reviewDestination==='notes'`), canonical-notes-ui (`olderNotesAction`,
    `Previous notes`, `DEVICE_ONLY_STATE`, `LOCAL_HANDLES`), camera-adapter:194-200, voice-adapter:108-110/134,
    notes-trash-adapter, notes-folders-adapter, note-origin-adapter (v1), notes-organize-executor (host `ready/restore`),
    workflow-authoring, model.js Notes defaults, template.html (2415, 2424-2425, 2461, 2479-2480 and the Trash markup),
    `selection-adapter.ts:4`, `summary-note-review.ts:3`.
  - Runtime: `runtime/phone-context.ts:16` (`legacy-app-notes-source` kind), `runtime/notes-secure-store.ts`
    (`LEGACY_NOTES_SOURCE_KEYS`, `readLegacyDailyNotes`), `notes-store.ts` (`LEGACY_NOTES_KEY`),
    `browser-notes-document.ts` (legacy archive), `runtime/note-origin.ts` v1 types, `retireSharedMail`, the
    credentialId migrate-on-read, `removeStoredCloudCredential`, the `recordingRevision` fallback, and `storage.retained.dailyApps`.
  - Owner-gated: `runtime/note-audio-deletions.ts`, `permanent-voice-deletion.ts` and the notes-trash voice hooks
    (Q-NOTES-4).
  - Re-point `browser/simulated-workflows.ts:36,44` and `workflow-dated-sources.ts:19,23` (`api.localWorkflowNotes`), or
    delete them.
- **Legacy calendar authority:**
  - Delete `runtime/legacy-calendar-preservation.ts`.
  - Edit `agent-calendar.ts`: status union `'transition-required'|'legacy-recovery'`, `legacy` state,
    `confirmLegacyRetention`, the `preservation` constructor argument.
  - Edit `agent-calendar-adapter.ts:15,53,65,151,219,232,235,243,251`, `settings-adapter.ts:862-868`,
    `browser/calendar-store.ts:21` (`capture`) and `phone-context.ts:16,49`.
  - Retire Quint `calendar-preservation-confirmation.mjs`, application manifest :3274 and
    `test/calendar-empty-bootstrap-repro.test.mjs`. Adjust `test/fixtures/calendar-mounted-editor.mjs:20`.
- **Browser store envelopes:**
  - Remove the `legacy` parameter of `BrowserDomainDocument` (`Envelope`, `DomainRecovery.legacy/legacyChanged`).
  - Delete `json-domain-document.ts` (merge into domain-document.ts).
  - Remove the lambdas in calendar-store and the development-*-documents.
  - Delete `migrateAudio`, the video MIME sniffing, the journal "no time" branch, the `{raw}` archive, the
    workflow-history "⤓ Older" download and the workflow-drafts/notices legacy readers.
  - Remove the legacy option in native-assistant-draft-recovery.ts and media-copy-intent.ts:14.
  - Delete 11 `*-migration.spec.ts` specs. Update Quint `domain-document-creation.mjs`, `browser-deletion-poll.mjs`,
    `storage.mjs` and `test/quint-domain-document-creation.test.mjs`.
  - Dev documents may be re-keyed (Q-DEV-5).
- **Clock legacy key:** `clock-handoff-history.ts:12-15`, `clock-adapter.ts:6,27`, `scripts/test-clock-handoff-flow.ts:10,66`,
  `test/fixtures/workflow-clock-admission.mjs:29`.
- **Connection selection:** retire the stored `{kind:'mock'}` (connection-ui.tsx:1602; also delete
  `NoMockProductInstrumentedTest.legacyMockSelectionRequiresSignIn`). Delete
  `test/legacy-hosted-selection.test.mjs` and the seeding in `connection(.boundaries).production.spec.ts`. Remove the
  `{kind:'offline',localApps:true}` seed in ResidentAlwaysPresent.
- **Other D1 readers:**
  - The Photo DB v2→v3 migration (browser-camera.ts:40-45).
  - Camera `legacyFile` (Q-MEDIA-2).
  - The `phoneContextMessage` history recognition (connection-ui.tsx:1679).
  - Startup permission walkthrough versions 1–3 and the sessionStorage fallback (`startup-permission-progress.ts`,
    `test/startup-permission-completion.test.mjs:63,66,68`).
  - The old voice-route key tests (Q-VOICE-6).
  - The Lemma contract `digestPhaseDiscardable` legacy case (Q-FORMAL-2).
- **Sources:** app-05 #4, app-06 #1, app-07, app-09 #1/#2, app-11 #1/#9, app-13 #4, app-14-p2, app-15 #1, app-18-p2 #4,
  app-19 #3, app-20 #7, app-24 #6/#7, app-25 #3, app-26 #9.

#### U-R5 Delete the hosted/paired/personal-Cloud path (D5)
- **Product-side deletes:**
  - `cloud-personal-{protocol,intent,setup}`.
  - The `cloudPersonal` snapshot field and personal methods in connection-ui.tsx (part 1 :45-47, 139, 607-656,
    613-1192, 1527-1592, 2055-2126, 3241-3247, 4062-4063).
  - The `remote/local/cloud` connection-kind arms.
  - `paired-voice.ts` callers: native-reading-voice.ts:28-30, note-recorder-driver.ts:84-93, voice-adapter.ts:30,183,317,1431.
  - The `'agent'` voice route in voice-selection.ts (D8).
  - `voice-states.ts` `paired` provenance.
  - `phone-context.ts:106-129`.
  - native-connection.ts:267-271,289-293.
  - `diagnostics-export.ts` `CONNECTIONS`/`VOICE_ROUTES`, `voice-timing.ts:43`, `scripts/aggregate-voice-latency.ts:39`.
  - The `device-view-profile.ts:24` undefined-version branch.
  - The alpha-client.ts dev-origin option (`agent-adapter.ts:836`, `remote-protocol.ts:81-83`).
  - `scripts/test-cloud-personal-flow.ts`, `test/cloud-personal-protocol.test.mjs`, and the browser specs
    `cloud-personal-onboarding` and `cloud-personal-intent-storage`.
- **Harness (stays while the retained e2e needs it, D5):**
  - The `RemoteProtocol` class moves to `dev/`.
  - Conversation helpers `remote-protocol.ts:297-338` move to `runtime/agent-conversation.ts` **first**. Update
    `local-agent.ts:14`, `local-agent-stream.ts:3` and `connection-ui.tsx:54`.
  - Five e2e specs drive pair/cloudList/personal setup (Q-HOST-3).
- **Android half (P15, D5):**
  - `PairedAgentCredential.java`, `PairedSpeechContract.java`, `NativeDeviceEnrollmentKey.cloud`.
  - `AlphaVoiceCloudPlugin` paired methods (268-323) and `synthesizeBrowserReading`.
  - `HostedDelivery` remote/cloud/local modes and `HostedTransport.java` (Q-HOST-1).
  - androidTest: `Paired*`, `BrowserReadingLive`, `ScopedVoicePlayback`, and the paired-speech parts of
    `BrowserReadingFixture`/`BrowserSensitiveReading`/`BrowserIsolatedReading`/`BrowserUnsupportedReading`.
  - `scripts/android-paired-speech-live.ts`, `scripts/android-browser-reading-live.ts` and their `CAMPAIGN_RUNNERS`
    entries.
  - Tests: `test/paired-speech-contract.test.mjs`, `campaign-speech-routes.test.mjs`,
    `native-voice-listener-rules.test.mjs:29-32`.
  - Quint: `NativeHostedInbox.qnt`, `hosted-inbox.mjs`, `HostedInboxTraces.java`.
- **Sources:** app-19 #1, app-21 #1/#2, app-22-p1, app-22-p2 #1, app-23 #2, app-25 #5, android-05 #5, android-08 #1,
  android-14 #2/#3, android-15 #7.

#### U-R6 `browser/foreground.ts` and one `appInForeground()` (C3/C4/D5)
- **Merges** `screen-locked.ts`, `notice-action.ts` and focus-state's `focusChanged`.
- **Exports:**
  - `noticeActionBlocked`.
  - `appInForeground()`, which absorbs the dev `dataset.devBackground` switch (23 copies in 21 files, including
    production `app-speech.ts:20`).
- **Replaces twins in:** notifications, hosted-results, location, password-provider, review, voice, clock, alert-audio,
  the workflow-* modules, runtime/text-share.ts and cloud-voice.ts:166.
- **Pins:** 13 screen-locked importers, 5 notice-action importers, Quint `browser-hosted-result-notice.mjs`,
  `hosted-digest-refresh.mjs` and the application manifest.
- **Sources:** app-06 #4, app-07 #2, app-20 NEW, app-21 #10.

#### U-R7 Browser folder merges
- **Recovery table:**
  - Delete calendar-recovery, preference-recovery, reminder-recovery and notification-recovery.
  - Add `openRecovery(domain)` in `domain-recovery.ts` (options-object signature, 17 callers).
  - Update `device-controls.tsx:7,36`, `device.ts`, the prototype calendar/settings/browser/camera adapters and the
    `template.html:1039` bindings.
  - Pins: `scripts/fixtures/calendar-adapter.ts:83`, Quint `calendar-adapter-fixture.mjs:98`, and tests
    `calendar-delete-latch:32`, `calendar-view-rules:116`, `calendar-sync-settings-navigation:92`, `browser/domain-recovery-lifecycle.spec.ts:23`,
    `workflow-dialog-layout.spec.ts:11` (app-05 #2, app-06 #5).
  - Delete the calendar backup/restore first (D3): `calendar-backup.ts`, the restore option, `calendar-store.restore()`,
    `RestoreOption`, the specs `calendar-backup-restore.spec.ts`/`calendar-recovery.spec.ts`, and
    `scripts/storage-specs.ts:16-17` (app-05 #1).
- **Other merges:**
  - `deleted-note-origins.ts` → `deletions.ts`.
  - `development-cloud-document.ts` → `development-cloud.ts`.
  - `register-hosted-results.ts` → `register.ts`. Give `platform-plugins.ts` a late `web` attach and drop the
    contradictory ordering comments (app-06 #8).
  - `reminder-action-document.ts` and `reminder-creation-document.ts` → `reminder-store.ts`.
  - `video-codecs.ts` → `video-edit.ts`.
  - `audio-settings` + `audio-levels`, and `camera-frame` + `camera-focus` (research).
- **Dev workflow sources:**
  - `workflow-calendar.ts` + `workflow-dated-sources.ts` + `workflow-messages.ts` → `dev/workflow-sources.ts`.
  - `workflow-resources.ts` + `workflow-speech.ts` → `simulated-workflows.ts`.
  - Add `devAppState(api,name)` to `simulator-recovery.ts`.
  - Pins: `dev-workflow-calendar.spec.ts` and `dev-workflow-dates.spec.ts` (page.evaluate paths).
- **Moves out of `browser/`:**
  - `content-question.ts` and `reading-review.ts` → `prototype/`, or `ui/dialogs/`. Their importers are all prototype
    modules, and keeping them here creates a circular folder dependency.
    - content-question has 8 importers, 3+1 Quint manifest entries, 4 Quint harnesses, `scripts/test-own-notice-question.ts`,
      3 host tests and 5 browser specs.
  - `calendar-sync-fields.ts`: delete with U-R3, or move to `runtime/`.
- **Optional `browser/calendar/` subfolder** (15 calendar files): merge time, alerts and recurrence into records, and
  response and meeting into the dialogs file. This touches about 45 specs that import `calendar-store.ts` by path.
- **Sources:** app-05 #12/#13, app-06 #8, app-07 #5.

#### U-R8 Browser splits
- **`voice.ts`** splits into `voice.ts` (≈200: plugin class, local-agent speech, playback, deletion),
  `voice/note-recording.ts` (≈120), `voice/cloud-speech.ts` (≈45) and `voice/streamed-speech.ts` (≈65).
  - Order: retire the T2 transplants first (`browser-note-pending-audio`, `browser-streamed-speech`,
    `browser-voice-cancellation`, `browser-saved-transcript-audio`, `agent-always-local:256`).
  - Pins: application manifest :3433, `notes-recorder-media-admission.mjs:13` and about 20 specs that import
    `/src/browser/voice.ts` (app-07 #12).
- **`notifications.ts`** splits into the product plugin (~150) and `dev/notification-composer.ts`.
  - Pins: `test/browser-notification-clear.test.mjs` (slices notifications.ts).
- **`native-connection.ts`** splits into `browser/secret-store.ts` and `browser/connection.ts`.
  - Order: the `browser/register.ts:3` import order matters. Rewrite or delete the T2 tests `connection-step-contracts`,
    `managed-service-routes` and `native-connection-headers` first (app-25 #7).

#### U-R9 `main.tsx` split (D1)
- **Target layout:**
  - `main.tsx` ≈120–150 lines.
  - `bootstrap/adapters.ts`: a declarative ordered adapter list with `installAdapters(Component,VIEWS,{…})`.
  - `bootstrap/layout.ts` (`useSurfaceLayout`).
  - `bootstrap/app-update.ts`.
  - `runtime/surface-insets.ts`.
  - `dev/mock-mode.tsx`.
- **Moves out:**
  - `installBrowserCapabilityTiles` → dev device-adapter, or delete it (dead tiles, app-09 #3).
  - The dev-tools command handler → device-controls. Keep the `vite.config.ts:28` stub export shape until U-B2.
- **Also:**
  - Collapse the two Workflows install sites (168/175) into one (Q-UI-1).
  - Preserve the notes render order document → share → trash → folders → canonical → source → web-source
    (`main.tsx:147-153`).
  - Keep calendar draft installs after `installAgentCalendarAdapter`.
- **Pins (rewrite or delete first, Q-TEST-1):**
  - `test/home-inset-layout.test.mjs` (slices), `app-update-automatic:132,161`, `voice-in-chat-only:34,64`,
    `system-bar-appearance:18`, `product-identity:139`, `accessibility-coverage:189,227,274`, `retired-shell-work:7`,
    `startup-warning-retention:6`, `image-contacts-admission:50`, `post-sign-in-setup:157`, `theme-palette:39`.
  - `scripts/test-canonical-notification-navigation.ts:10`, `scripts/dev-ui-remote-host.ts`.
  - Application manifest symbols (`BrowserDeviceControls`, `refreshImage`, `applyImageContacts`, `chatPullBinding`,
    `keyboardFreeHeight`, `canvasGeometry`, `freeHeight(...)`), 10 refinement harnesses, 5 legacy checkers, and the
    fixtures `appearance-preference`, `calendar-mounted-editor`, `notes-trash-read`, `workflow-clock-admission`.
- **Source:** app-07 #13.

#### U-R10 `prototype/model.js` split (D1/D2)
- **Target layout:**
  - `prototype/icons.js`: the `IC` literal with all keys and no `||` self-defaults. Fold the 83 `IC.x = IC.x || …` into
    it or into `icon-catalog.json`. Literal icons in template.html move into it. `ICON_ASSETS` is keyed by name.
  - `prototype/shell-helpers.js` (`latchPatch`, `restoreById`, `findById`, people/time/find helpers).
  - `prototype/views/<view>.js` per view.
  - Product part 2 keeps the Notes view (~250), Contacts grouping (~90) and the Files scaffold consumed by upstream
    `files-browser-adapter` (Q-FILES-1).
- **Deletes:**
  - Wallet (D2): model.js 3848-4160, 4180, 4183, 5484, 5921; template 3231-3526; fixtures `WAL_*`/`COPY.wallet`;
    data-adapter:30,65-69; native-adapter:83,271; agent-adapter:691-695; mvp-features:17-19,23,30; browser/apps.ts:8,10;
    simulated-apps:34; workflow-receipts `recordWorkflowExpense`; the `inventory` view and palette tokens;
    `test/browser/dev-wallet.spec.ts`, `test/wallet-disabled.test.mjs`, the home-views-model wallet slice.
  - Heads-up and `LOCK_SUM`: model `showHeads/fireHeads/heads*`, fixtures `HEADS`/`LOCK_SUM`,
    `development-rail.html:46`, `agent-adapter.ts:1538` (`headsOk`), `test/home-cards.test.mjs:103`,
    `shell-core-fixture.mjs`.
  - The prototype workflow builder (model.js:4460-4542, template.html:3658,3852,3899-3947).
  - The Notes prototype undo (folder sheet, fake amplitude bars).
  - The simulated credential/consent flows (Settings add-account password, OAuth consent page, Wallet card/CVV). See
    NEW-TPL-CRED in §3.
- **Moves to `dev/` (D6):**
  - Fixture-only Phone/Messages/Inbox/Maps/Browser renders → `dev/simulated-{phone,messages,inbox,maps,browser}.ts`.
  - The fixture agent (`Component.reply/send/agentSay/cardAct/startVoice`, view `reply`/`actions`). agent-adapter's
    versions become the class methods.
  - The workflows simulator (4161-4574) → `dev/simulated-workflows.ts`. Keep a stub `render` returning `{}`, because
    `simulated-apps.ts:30`, `automations-adapter.ts:43` and `clock-adapter.ts:11,86` wrap it.
  - Settings test-mocks pages → a dev settings module. Share `stRow/stNav/stTog/stSeg` with the adapter.
  - Dev rail values (5817-5835, 5928-5935, view `jumps:`).
- **Removes undo layers at the same time:**
  - `workflow-adapter.ts:66`, `contacts-adapter.ts:123-124,131,133`, `phone-adapter.ts:198`, `sms-adapter.ts:198`,
    `inbox-cloud-adapter.ts:58-59`.
  - `maps-adapter.ts:180,248`, `browser-adapter.ts:418,424,471-473`, `native-adapter.ts:227,280,395`,
    `camera-adapter.ts:1490,1630`, `selection-adapter.ts:177-178`, data-adapter:242-246.
- **Moves render side effects** (phone deep link, calendar `st.add`, browser `st.url`, maps address) into an `incoming`
  hook. Module globals (`PN`, `CAL_PENDING`, `PH_T`, `MAPS_DRAG`, `NT`) become per-shell state.
- **Order:**
  1. Retire the text pins: `test/home-views-model.test.mjs` (slices about 30 top-level names, `registerView(` ranges and
     `\nvar PN =`), `test/canonical-icons.test.mjs:17-21` (`IC` slice, 148-key count), `notes-empty-close`,
     `native-popover-back`, `quint-back-dispatch`, `quint-fixture-busy-latch`, `final-ui-lifecycle:7`, `chat-transcript-window`,
     `restored-history-limits`, `checkin-choice-presentation`, `toast-undo-offer`, `hosted-digest-panel` (`stTog`) and
     the 32 `readFileSync(model.js)` host tests.
  2. Re-point the Quint application manifest literal pins (`function latchPatch(st, keys)`, the `pn*` functions,
     `PN.boot`, `PN.live`, `startVoice()`, `secureAdmits`, `openView(k, patch, chat, opts)`, …), `surfaces.mjs`,
     `shell-core-fixture.mjs`, `settings-page-focus.mjs` and the legacy checkers.
  3. Split.
- **Owner:** Q-DEV-1 (keep the fixture simulator at all?), Q-FORMAL-3 (`pn*` refinement checks).
- **Sources:** app-12 #6/#8, app-14-p1 #1–7, app-14-p2, app-18-p1 #6, app-18-p2 #1, app-19 #12/#13.

#### U-R11 `template.html` dev-region splice and per-view partials
- **Change:** cut the dev regions into marker comments and add `development-views.html` (or extend
  `development-system-surfaces.html`). `template-source.ts` gets one `.replace(marker, testMocksEnabled ? … : '')` per
  region.
  - The regions are canned Browser pages with the Nopa booking, calendar invites, prototype Phone/Messages, the fixture
    voice panel, prototype Contacts, Settings consent/password sheets, Files fixtures and the shade.
- **Then:**
  - Delete the constant-false overrides (`isNews:false`, `hasPeople:false`, `notNative:false`, `homeShowDate:false`;
    NEW-TPL-FALSE).
  - Delete the home date line (`template.html:35,105,4522`, `data-adapter.ts:199-207`, `main.tsx:183`,
    `phone.css:858-860`, `installHomeCardVisibility`).
  - Merge the calendar draft rows (1030-1038, 1248-1251) with U-R12.
  - Dedupe the Notes detail (2466-2628) and the composer (4439-4468, 4479).
  - Rename `legacyChatRecorder` to `stackedChatRecorder`.
  - Add `data-alpha-chat-action` attributes (Q-UI-4).
  - Fix `<sc-if test=…>` → `value=` (4310, Q-UI-6).
  - Move styles to classes (switch, sheet, skeleton, mark, lucide, file tile).
- **Later:** concatenate per-view partials at build time (research).
- **Pins:**
  - `scripts/audit-production-bundle.ts:104`: add absence assertions for "Nopa", "Confirm booking?" and
    "{{phone.cName}}".
  - `test/phone-adapter.test.mjs:137` (delete the T1 order assertion).
  - Add the new HTML file to the file lists in `test/theme-palette.test.mjs:10` and `product-identity.test.mjs:147`.
  - `test/gesture-zones-single-instance.test.mjs:28-30`.
  - Application manifest (`simulatedShade` :8617, plus 16 template.html entries).
  - Refinement harnesses `modal-toast-forwarding.mjs:153`, `dock-clearance-ownership.mjs:151`, `modal-scrim-ownership`,
    `email-suggestion-review`, `photos-owned-album-dialog`, `calendar-form-controls`.
  - About 51 files name template.html. Slice-sensitive ones: `photos-view.test.mjs:84-121`,
    `browser-reading-capability.test.mjs:29,107,145-157` (keep rows single-line), `files-browser.test.mjs:219`,
    `notes-recorder-controls.test.mjs:9,52,56`, `fixtures/voice-markup.mjs:8-10`, `voice-assistant.test.mjs:772-774`,
    `chat-stop-controls.test.mjs:8,24`, `final-ui-lifecycle.test.mjs:17`,
    `browser/home-attention.production.spec.ts:8,17,19`, `home-daily-overview.production.spec.ts:15`,
    `legacy/home-layout/check-home-layout-refinement.mjs:127`.
- **Sources:** app-12 #4/#9, app-18-p1 #1–6, app-18-p2 #2–8, app-19 #14.

#### U-R12 Calendar drafts merge (C5)
- **Adapters:** `calendar-form-draft-adapter.ts` + `calendar-edit-draft-adapter.ts` + `canonical-calendar-drafts.ts` →
  `prototype/calendar-drafts.ts`. It has one lifecycle/render wrap, a kind table, `installCalendarDraft(config)` and one
  `shell.calendarDrafts`.
  - Keep store keys `'calendar-creation-form'` and `'calendar-inline-edit-form'`, and the output keys, identical.
  - Make the `active` option required (`()=>true` in the Quint fixture).
- **Codecs:** `runtime/calendar-form-draft.ts` + `calendar-edit-draft.ts` + `canonical-calendar-draft.ts` →
  `runtime/calendar-draft-codec.ts`. The persisted shape is unchanged.
- **Order:** install after `installAgentCalendarAdapter` (`main.tsx:133-138`). Drop `?.()` on the now-required hooks in
  `reminder-adapter.ts:225,231,277,330`.
- **Pins:**
  - Quint: `calendar-adapter-fixture.mjs:8-9,40,141-144`, application manifest :6496-6536,
    `canonical-calendar-draft-handoff.mjs:11`, `canonical-calendar-editor-close.mjs:17`, legacy `calendar-navigation.mjs:14`,
    contracts.mjs, services manifest.
  - Host tests: `quint-day-anchor.test.mjs:11-12`, `calendar-view-rules.test.mjs:31`, `calendar-form-inputs`,
    `calendar-end-after-start`, `scan-all-day-draft`, `canonical-calendar-draft-ownership`,
    `quint-canonical-calendar-draft*`.
  - Fixture `test/fixtures/canonical-calendar-draft-owner.mjs:6,25,93`, `scripts/storage-specs.ts`, the comment in
    `scan-event.ts:4` and the vm harness stubs (`scripts/test-reminder-time-flow.ts`,
    `test/scanned-calendar-handoff.test.mjs`).
- **Sources:** app-10 #1/#2, app-11 #4, app-16 #11, app-18-p1 #4, app-20 #2.

#### U-R13 `agent-adapter.ts` split (D1)
- **Order:**
  1. U-R4 legacy notes (≈360 lines) and the dead tile/heads/shadeN code (≈60).
  2. Remove `api.assist`, the wallet terms, stale "Until the pin carries X.patch" comments and `unknown` casts.
  3. Declare the required `ShellHost` methods (B2) in `shell-types.ts`, then drop `?.`. The methods are:
     `cancelReadReplyCompletions`, `closeSummaryReview`, `stopVoiceConversation`, `resumeReadReplyVoice`,
     `retireReadReplyVoice`, `prepareDeviceReadReview`, `browserSelection`, `folderSelection`, `settingsSelection`,
     `calendarSelection`, `calendarDayObservation`, `canonicalCalendarDraftEntryBlocker`, `calendarFormCommitted`.
  4. Then split.
- **Pins:**
  - `specs/quint/application/manifest.json` (47 path entries; **keep all 29 pinned symbol names**).
  - Refinement harnesses `chat-attachments`, `composer-send`, `notes-coordinator`, `pending-action-recovery`,
    `previous-notes-availability`, `shell-coordinator`, `voice-transcript-follow`, and the legacy chat-input,
    notes-view and settings-nav checkers.
  - About 40 host tests, `test/composer-send-ownership.test.mjs:15` (slice `composerNeedsSizing(`…`installAgentAdapter(`),
    `test/assistant-draft-dispatch.test.mjs:102` and `main.tsx:59`.
- **Also:** replace copy matching in `send` refusals with coded refusals (app-09 #11). Fold the system-bar writer into
  `system-bar-appearance.ts` (U-R22).
- **Sources:** app-09 #7/#9/#11.

#### U-R14 `connection-ui.tsx` split into `runtime/connection/` (D1)
- **Order:**
  1. U-R5 hosted path and U-R4 legacy selection and saved sign-in. The `entered-key leak scrub` at 2716 **stays**:
     extract it into a named helper (app-22-p2 NEW-keep).
  2. Delete the dead pieces: `providerChoice` (3865), the dead busy line (3870), `cancelRecoveryReview` (2807, a
     slice-anchor-only member), the unused `saved` flag, the duplicate `testMocksEnabled` guard (4004), orphan comments
     (2159-2165) and the `residentQa` mode (Q-HOST-4).
  3. Extract the in-file triplicated protocol blocks (enrollment, teardown, operation release, plan-end → helper in
     `subscription-entitlement.ts`).
  4. Export `SELECTION` / `readConnectionSelection()` once. It replaces `'alpha.connection.selection.v1'` in 12 files:
     main.tsx:106, hosted-digest-ui, hosted-live-source-ui, workflow-authoring, alpha-product-registration,
     workflow-drafts:9,13 and six browser files.
  5. Export the `CloudBinding`/`sameCloudBinding`, `OpenThread`, `PairedVoiceBinding` and `AutomationsClientBinding`
     types.
  6. The setter hooks (`setDeviceExecutor`, `setForegroundExecutor`, `setDeviceReadReview`, `setNavigationContext`,
     `setViewInteractionExecutor`, `setDeviceRecovery`) become one host object.
  7. `captureConversationChoice` gets a separate sync Android reader (Q-CONN-3).
  8. `lateReadyNotice` message matching becomes the `previousSignInUnconfirmed` flag. Regenerate
     `startup-permission-flow.dfy`.
  9. Sign-in phase prop (cloud-sign-in-ui).
  10. Delete or port the T2 slicers: ≈23 `connectionController`-anchored host tests and ≈11 Quint harnesses (the full
      marker list is in §2).
  11. Split.
- **Target layout:** `runtime/connection/{store,resident,cloud-account,provider-keys,conversation,device-actions,voice-binding}.ts`
  and `ui/{SignInPage,AccountSheet,ProviderKeys,ResidentRecoveryPanel}.tsx`. The dev chooser goes to `dev/`.
- **Pins:** `specs/quint/application/manifest.json` (72 path refs), `specs/quint/native/manifest.json:539,1347`,
  `feature-parity.mjs:9-16` (21 rows naming `connection-ui.tsx deviceCapabilities`), and about 216 `test/` files plus
  browser specs that dynamic-import `/src/runtime/connection-ui.tsx`.
- **Sources:** app-22-p1, app-22-p2 #1–8, app-26 #10.

#### U-R15 `camera-adapter.ts` split into `views/camera/` + `views/photos/`; `browser-camera.ts` move
- **camera-adapter.ts:**
  - Delete the legacy scanned-note path, `legacyFile`, the dead `item.id===''` handling, the duplicate
    `nativeCopyRecovery` set (335) and the test-only exports.
  - The installer disposer and 110 `disposed` fences go if the Photos-window harness is ported (Q-TEST-3).
  - Plugin interfaces are shared with browser-camera.ts, photo-library-adapter.ts and settings-adapter.ts:44.
  - Importers: agent-adapter.ts:13, native-adapter.ts:10, main.tsx:62/128.
- **browser-camera.ts** moves to `browser/` and splits into `browser-photo-library.ts` (~230) and `browser-camera.ts`
  (~110).
- **Pins:**
  - camera-adapter tests: `camera-preview-recovery`, `camera-resume:28-30` (verbatim import), `camera-scan-keep`,
    `camera-scanned-note`, `camera-capture-mode-patch`, `context-selection:164,214`, `photo-library:230`,
    `photo-selection-cancel`, `photos-library-patch:26,89`, `photos-pending-read`, `photos-thumbnail-refresh`,
    `photos-view:84,118`, `recently-deleted:44`.
  - `scripts/test-agent-camera-flow.ts:7-16` (5 slices), `native-adapter-activity.test.mjs:14` (path stub),
    `dev-image-question.spec.ts:8`.
  - Manifests: application (sources and symbols `takeRequestedPhoto`, `untilSettled`, `agentRequest`,
    `requestedCaptureHolds`, `waiters`), native :3761-3789, legacy :864,966. Quint `photos-window.mjs` (esbuild `onLoad`
    filter), `camera-preview-retirement`, `canonical-calendar-draft-handoff`, legacy `camera-session`.
  - browser-camera: 22 Playwright specs plus `test/browser/helpers/owned-photo.ts` (`import('/src/prototype/browser-camera.ts')`),
    `browser-camera-storage.test.mjs:77`, native manifest :441,3914-3938, application manifest :3367,3769, and
    `browser-album-storage`, `camera-preview-retirement`, `photos-window`, `native/copy-receipt`, `legacy/camera-session`,
    `legacy/photos-library/*`.
- **Sources:** app-10 #6, app-11 #11.

#### U-R16 Other prototype splits

| File | Target | Key pins / order |
|---|---|---|
| `settings-adapter.ts` | Adapter keeps the installer and one `PARENTS` table (unifying `settingsParents`/`nestedParents`, Q-UI-3). Page builders go to `prototype/settings/`. Update-manifest policy (L135-228, 272-296) goes to `runtime/app-update.ts`. Appearance storage (L256-270, 684, 1136) goes to `runtime/appearance.ts`. Dead Privacy & data and Models pages are deleted, with their scrub rows in native-adapter (Q-UI-2). `mergeDeviceFacts` is used by `refresh()` or deleted (Q-UI-7). | Marker comments `// settings-facts:*` (settings-truth, app-update-automatic, publish-update-manifest, quint automatic-app-update-schedule), `// settings-reads:*` (comms-settings, quint-settings-listener-reads), `// calendar-settings:*` (calendar-settings-simplicity, assistant-settlement-delivery, calendar-sync-settings-navigation). `LemmaScript-files.txt:12` + `settings-adapter.dfy` regenerate under the new path. `specs/lemma/README.md:185`. 42 path refs + 32 symbol pins in the application manifest. `test/recovery-restart-presentation.test.mjs:26`. Settings top-row labels produced by model.js 4847-4874. `AlphaDevicePlugin.java:233,667` comments. `main.tsx:70`. `scripts/publish-update-manifest.ts`. (app-17 #1–4) |
| `chat-overlay-motion-adapter.ts` | Pure release geometry (81-182) → `runtime/chat-release.ts` (Lemma-annotated). ~18 shell fields become one `ChatDockState`. Tap actions keyed by data attribute. | `LemmaScript-files.txt:9` and the `.dfy` regenerate under the new path (Q-FORMAL-1). Application manifest `chatRelease` 7871-7910. Symbol pins `chatDraggedAt`, `chatSheetShare`, `dockKeyboardWatch`, `keyboardOpen`, `releaseComposer`. `test/chat-release.test.mjs`, `quint-chat-dock.test.mjs`, `quint-keyboard-detectors.test.mjs`, `final-ui-lifecycle.test.mjs:44,59,79,96` (tab-indented markers), `keyboard-focus.mjs`. Keep `chatMotion` (main.tsx, model.js, browser-adapter.ts). (app-11 #6–8) |
| `inbox-cloud-adapter.ts` | `prototype/inbox/{index,home-summary,list,reader,notices}.ts`. | **Blocked** by text pins: `test/context-selection.test.mjs:251-254`, `gmail-background-binding.test.mjs:38-43`, `home-google-connection-source.test.mjs`, `quint-inbox-provider-drafts.test.mjs:32`, `inbox-list-paging-ports.mjs:19` (marker `'  let loadingMore = false;'`). Services manifest symbols `nextPageToken`, `seenCursors`, `loadingMore` … (app-13 #12). Delete `openInbox` first (`scripts/inbox-adapter-fixture.ts:218,252,259`, `test-inbox-attention-flow.ts:25,243`). |
| `local-speech-playback.ts` (prototype) | `prototype/read-aloud.ts` (~150), `message-actions-adapter`, `runtime/voice-timing.ts` part. | `voice-adapter.ts:24,98,394,1333,1350,1494`, `test/fixtures/cloud-voice-view.mjs:45`, `test/local-speech-playback.test.mjs:82`, specs `note-read-aloud`, `speak-replies`, `browser-cloud-dev`, application manifest :4870-4903, native :3306-3333 (symbols `speechRetirement`, `retainSpeechRetirement`, `stopLocalSpeechPlayback`). (app-13 #8) |
| `selection-adapter.ts` | `selected-document-adapter.ts` (~170) + `files-view-adapter.ts` (~30). | `main.tsx:124-127`, `test/selection-ask-readiness.test.mjs:19`, application manifest :961,1739,1810,7312-7345, `files-recent-index.mjs:12-22` (four exact sequences), legacy `check-files-browser-refinement.mjs:309`. (app-16 #14) |
| `native-adapter.ts` | `runtime/return-to-app.ts` (~20), `runtime/egress-privacy.ts` (~70, `honestSettings` keyed by row id, no `defineProperty` trap), slim `prototype/native-adapter.ts` (~80). Dead `honestTiles`, `tileFactsFromSnapshot`, `tileSettingsPages`, `handoffGate`, `watchReturnToApp`. | Region markers `// tile-facts:begin/end` (`test/shade-tile-facts.test.mjs:4-11`), `// return-gate:begin/end` and the `watchReturnToApp` regex (`comms-settings.test.mjs:15,26-33`), slice `type EgressConnection =` (`settings-truth.test.mjs:128-132`), `if (module === 'wallet') {` (`wallet-disabled.test.mjs:48`), `native-adapter-activity.test.mjs:5-28` stubs, Quint stubs `'native-adapter$'`, `contacts-session-replay.mjs:15`, `mms-compose-replay.mjs:20`. Importers of return-to-app: agent-adapter:82, contacts-adapter:2, phone-adapter:6, sms-adapter:7, telephony-attention:12. (app-15 #3–5) |
| `notifications-adapter.ts` | `prototype/notification-taps.ts` (~70) + `dev/simulated-shade-notices.ts` (or deleted). | `scripts/test-canonical-notification-navigation.ts:6` (text eval), `canonical-notification-tap-admission.mjs:147-151`, application manifest :1230,1314,2673,3799, `test/fixtures/shade-row-custody.mjs:106-107`, `shade-notice-question.mjs`. |
| `data-adapter.ts` | `home/home-values.ts` (~110), a shell flags hook, and a Files storage-meter hook. | `final-ui-lifecycle.test.mjs:14-18` (slice `installHomeCardVisibility(`…`/** Neutral Home`), `home-cards.test.mjs:95,291`, `home-views-model.test.mjs:337,357`, application manifest :8253,8273 (`createHomeAgenda`). |
| `subview-accessibility.ts` | Reply announcer (L146-213) → `prototype/reply-announcer.ts`. | `main.tsx:16`, `final-ui-lifecycle.test.mjs` (slices at `type ReplyShell =`), `accessibility-coverage.test.mjs:187,298-300`. (app-17 #11) |
| `phone-adapter.ts` | Voicemail WAV helpers → `runtime/wav.ts`. Module singletons become a returned session. | `agent-adapter.ts:28,687,937`, `voicemail-transcription.ts:8` (runtime imports prototype: NEW-RT-IMPORT), `telephony-executor.ts:47`, Quint `phone-session-replay.mjs:21`, application manifest :8414-8440 (local names `reading`, `dialing`, `session` …). (app-15 #10) |
| `browser-adapter.ts` | `views/browser/` (`browser-adapter.ts` ~250, `browser-session.ts` ~90, …). Delete the teardown disposer and `flags.disposed` in browser-external-handoff. | 70 application-manifest pins. Many T2 `test/browser-*.test.mjs` transplants (bookmark-startup, calendar-open-source, command-refusals, navigation-creation, popup-opener, presentation-lifecycle, reading-capability, receipt-order, session-persistence). `browser-host-modal.test.mjs:3` markers. (app-10 #5) |
| `calendar-adapter.ts` | Android-provider adapter (~260). `runtime/calendar-options.ts` (`zonedInstant…calendarOptionEvent`, one RRULE map shared with agent-calendar-adapter:200). Browser-calendar dev decorator → `dev/`. Status ids for status prose. | 36 application-manifest pins, legacy :258, `quint-calendar-agent-selection.test.mjs` (mutates the source), `scripts/test-calendar-crud-review.ts:58` (regex on the `reminderWallTime` import line), `calendar-options.spec.ts` (T6). (app-10 #7–9) |
| `reminder-adapter.ts` | One `runReminderOperation` + `pendingFor`. Rename "deletion" journal → "operation" journal (Q-UI-9). Moves into the Calendar view folder. | Quint fixture literal `let tapBusy = false, tapRequested = false, tapInteraction = 0;`, mutation anchors `if (createdInput && !dispatched)` / `if (created && !dispatched)`, about 45 manifest symbols (`acknowledgeReminderDeletion`, …), `locale-time-usage.test.mjs:17` pending list. (app-16 #7–9) |
| `scan-*.ts` | Shared `prototype/scan-dialog.ts` (`openScanDialog`, `scanButton`, `errorText`, on-device chip, object-URL helper, `data-scan-child`). Merge `scan-event.ts` → `scan-event-review.ts`. Delete `scan-text-layer.ts`. System-picker counter → `runtime/system-picker.ts`. Video editor CSS → `video-edit-review.css`. | `scan-review-dialogs.mjs` anchors (`  return dispose;`, `if(attempted||!field.value.trim())return;`, `  void(async()=>{for`), `test/scan-page-camera.test.mjs` (transplant), services manifest :905-909,4592-4762, `system-picker-visibility.mjs`, `quint-system-picker-visibility.test.mjs` (rewrites `scan-pdf.ts` text), `scan-event.test.mjs`, `scan-all-day-draft.test.mjs`. (app-16 #1–5) |
| `voice-adapter.ts` | Split after deleting the paired route (≈45), `preparedLocal`, the test-only review policy (≈15) and the legacy device-notes path. | Application manifest :3428,4090,4356-4398,4871-4996,8665-8863, native :1354,1857,3305-3370 (local names `generation`, `startingCapture`, `transcribeClip`, `retirement`, `reviewConversationTurn`, …). Anchor harnesses `quiet-voice-retry`, `voice-owned-navigation`, `voice-transcript-follow`, `notes-recorder-media-admission`, `batch-capture-completion`, `composition/controllers`. 25 host tests. |
| `phone.css` | Delete dead blocks and pasted Maps copies, then split by view. | `accessibility-coverage.test.mjs:227-262` (6 exact rules), `home-inset-layout.test.mjs:23`, `auth-copy-native-cutout:29`, `theme-palette:10`, `font-license:290`, `product-identity:147`, `fixtures/modal-scrim-chromium.mjs:21`, application manifest :2781, legacy :609. (app-16 #17) |

#### U-R17 View owners `prototype/views/<view>/` (C5/D2)
- **Notes owner `views/notes/`:** merge notes-share-adapter, notes-document-adapter (export-only; delete the text
  import, D3), notes-folders-adapter and the shell host of notes-organize-executor. The executor itself moves to
  `runtime/notes-organize-executor.ts`. Merge notes-recorder-control into note-recorder.ts, which moves to `runtime/`.
  Keep the render order (U-R9).
- **Workflows owner `views/workflows/`:** workflow-adapter + automations-adapter (`automationsManaged` handshake,
  `cachedAutomationsHome`) + clock-adapter + workflow-filters + workflow-notice-question + workflow-authoring.
  `main.tsx:168,175` collapse to one install.
  - Run-state predicates go to `runtime/workflow-protocol.ts`.
  - Filter labels become one record.
  - Upstream phone-workflow constants are imported (`PHONE_WORKFLOW_DEVICE_OPERATIONS`, `PHONE_WORKFLOW_MAX_STEPS`,
    `phoneWorkflowOperationProtocol`).
  - `showAgentStatus` → connection module.
  - Add a `workflowDraftSlot(session)` helper.
  - The workflow draft store is injected.
- **Calendar owner `views/calendar/`:** calendar-adapter, calendar-drafts (U-R12), calendar-month-focus,
  calendar-confirmation, calendar-approval-*, reminder-adapter. Pure modules move to `runtime/`:
  calendar-form-inputs, calendar-approval-fields, and optionally calendar-days (Lemma path churn, Q-FORMAL-1).
- **Camera/scan, Photos, Maps, Inbox, Settings, Browser, Phone, Messages, Contacts:** see U-R15/U-R16. The
  `installMapsChatAdapter` live code (maps-adapter.ts:417-455) replaces the dead content of `maps-chat-adapter.ts`.
  - Pins: `maps-share-choice.mjs:21,29-30` ("last export" assertion), `test/maps-chat-markup.test.mjs:53-54`,
    application manifest :4254,4299,9416-9533.
- **Pins** per view are in §2. Every merge edits feature-parity.
- **Sources:** app-11 #4, app-13 #1, app-15 #7, app-19 #9/#10/#15, research app-prototype §5.

#### U-R18 Runtime merges and splits

| Unit | Change | Pins / order |
|---|---|---|
| Notes bindings | `runtime/notes/bindings.ts` + `notes/storage.ts` fold note-audio-lock, notes-store, notes-secure-store constants, permanent-voice-deletion and `readSavedNotesRaw`. 13 files become about 3. | Quint `notes-coordinator.mjs:16-18`, `contracts.mjs:9-10`, `portable.mjs:132`, application manifest, `scripts/test-notes-*`. Android `NOTES_TRASH_SLOT`/`NOTES_TRASH_MAX_BYTES`/`NOTES_TRASH_RETENTION_MS` stay mirrored. (app-25 #2) |
| Reminders folder | `runtime/reminders/` holds reminder-creations, reminder-deletions (renamed `reminderActionJournal`), durable-slot use and workflow-reminder-read. Share reminder statuses and the alarm prefix via `daily.ts`. | `browser/daily.ts:140,161`, `browser/clock.ts:10`. (app-26 #16) |
| Voice folder | `runtime/voice/` holds voice-selection, voice-states, voice-timing (one exported instance instead of 14 forwards; it owns `VoiceStartupStage`/`Timing`), voicemail-*, native-reading-voice, note-recorder-driver, native-live-voice + native-voice-turn (merge), and `native-speech-playback.ts` (renamed from root `local-speech-playback.ts`). | voice-timing: replace the `test/diagnostics-export.test.mjs:220-221` regex first; about 12 tests and scripts. local-speech-playback move: 9 importers, native manifest symbols (`confirmSpeechRetirement`, `speakChunk` …), `renderer-speech-chunk.mjs:44`, `speech-cleanup-latch.mjs`, `web-reading-review.mjs`. (app-07 #11, app-26 #5) |
| Telephony contracts | `phone-dial-contract` + `sms-agent-contract` + `telephony-actions-contract` → `runtime/telephony-contracts.ts`, from one upstream path. | `agent-adapter.ts:20-22`, `phone-context.ts:6-8`, `scripts/test-connection-history.ts:29`. (app-25 #4) |
| Clock | `clock-contract` + `clock-agent-review` + `clock-handoff-history` → `runtime/clock.ts`. | daily.ts, agent-adapter, clock-adapter, phone-context, connection-ui:33. Tests `clock-repeat-days`, `reminder-lifecycle-pure`, `native-secure-slots:125`, `browser/agent-clock-handoff.spec.ts:161,168,220`, `fixtures/workflow-clock-admission.mjs:17-19`, `scripts/test-clock-handoff-flow.ts`, `test-connection-history.ts:28`. (app-20 #3) |
| Owner routes | `app-record-route-policy` + `automations-route-policy` → `owner-route-policy.ts`. `agent-calendar-client.ts` → `app-record-port.ts` `appRecordFetch`. | connection-ui L9/L23, local-agent, cloud-protocol, development-cloud-agents, automations-protocol, agent-calendar, canonical-notes-controller:15-22. Drop the load-time cast in owner-route-policy (`OwnerRouteTable` type; `test/owner-route-parity.test.mjs` holds the `{id}` rule). (app-08 #13, app-20 #4) |
| Effect invalidations | `app-record-completion` + `automation-completion` → `effect-invalidations.ts`. | connection-ui L10 + 3532, automations-adapter:4, canonical-notes-controller:6 (`CANONICAL_NOTES_INVALIDATED_EVENT`, read by `canonical-notes-controller.mjs:59`, `canonical-notes-draft.mjs:30`), agent-calendar-adapter:135,137. (app-20 #5, app-11 #3) |
| Chat markup | `action-message-presentation.ts` → `runtime/chat/{projection,notices,markup}.ts`. One CHOICE parser (absorbs calendar-approval `inboxChoiceText`). | Application manifest pins `mapsChatText`, `SHARE_CHOICE`. (app-20 #6) |
| Google returns | `google-connection-return` + `google-workspace-return` → `google-return.ts`. Split `google-accounts.ts` → + `google-calendar-link.ts`. `google-connection-ui.tsx` → controller + hooks + view. | Quint `google-accounts.mjs`, `google-accounts-lifecycle.mjs`, `google-calendar-disconnect.mjs`, `google-calendar-link-flow.mjs`, `google-calendar-link-publication.mjs`. Tests `google-connection-return`, `google-workspace-return`, `google-calendar-connect`, `google-connections-resource-budget`, `fixtures/google-account-panel.mjs`, `scripts/test-google-accounts.ts`. (app-23 #6/#7) |
| Hosted background | `digest-inbox.ts` → `hosted-background.ts`. `hosted-digest-ui.tsx` → `runtime/digests/` (panel shell + hooks + forms). | Quint `hosted-digest-refresh.mjs`, `renderer-digest-queue.mjs`, `renderer-hosted-inbox.mjs`, `scripts/test-local-digest-storage.ts`. Tests `digest-capabilities:40`, `digest-missed-run-now:62`, `digest-pending-storage:2`, `digest-delegation-host:2`. (app-23 #9, app-24) |
| local-agent split | `runtime/local-agent.ts` (~330, typed `AgentPlugin`) + provider-key module (absorbs `abort-signal.ts runProviderConfiguration`) + dev bridge → `dev/`. | Playwright in-page imports of local-agent.ts (10 specs). `scripts/test-local-agent*.ts`. Native manifest :10,542,4304,4340,4344. |
| cloud-protocol | Delete unused members (~70 lines). Dev hand-off → `DevelopmentCloudProtocol`. Make `CloudProtocol.gmail` public (callers inbox-cloud-adapter, inbox-provider-controls, google-accounts, settings-adapter, scripts/test-gmail-mailbox.ts, inbox-adapter-fixture, browser fakes `gmail-*.spec.ts`). | Tests `cloud-resident-authority`, `google-cancel-*`, `native-google-port-capability`, `browser-cloud-dev-bridge`, `scripts/test-cloud-protocol.ts`. (app-21 #2/#4) |
| startup permissions | `startup-permissions.tsx` → presentation + `useStartupWalkthrough()` + `startup-permission-bridges.ts`. | First move the text anchors in `permission-choices.mjs:41-47`. `startup-permissions-coordinator.mjs`, `test/startup-permission-completion.test.mjs` module hooks, `browser-host-modal.test.mjs:21`. (app-26 #11) |
| Small moves | `deletion-owner.ts` → `browser/` (6 importers, native manifest). `google-authorization.ts` → `browser/` (services manifest). `browser-note-documents.ts` / `browser-notes-document.ts` → `browser/note-documents.ts` / `browser/notes-document.ts` (≈45 specs import the latter by path). `cloud-service-info.ts` → `scripts/lib/`. `cloud-deployment.generated.ts` → `generated/` (optional, Q-BUILD-4; `scripts/cloud-deployment.ts:85`, `product.gradle`, 13 importers). `mvp-features.ts` → `product/view-admission.ts` (`model.js:17,5310,5431,5679`, `device-view-profile.ts:1,30`, `main.tsx:27`, tests accessibility-coverage, aosp-image-capability, aosp-sms, dev-surface-gates, wallet-disabled, quint-view-admission). `files-index.ts`, `locale-time.ts` (17 app importers, 4 scripts, ~10 tests, `locale-time-usage.test.mjs:64` skip path), `note-recorder.ts`, `home-cards.ts`, `photo-viewport.ts`, `telephony-presenters.ts`, `phone-info-page.ts`, `canonical-notes-controller.ts` → `runtime/` or `home/`. UI installers `share-panel.ts`, `status-ui.tsx` (+ new `status-ui.css`), `text-scale.ts`, `toast-layer.ts`, `view-focus.ts` → `ui/` (`main.tsx:84-90`; `accessibility-coverage` asserts the `installViewFocus()` text). | See §2 per file. (app-12 #3, app-13 #7, app-15 #8, app-21 #12, app-23 #15, app-25 #12) |

#### U-R19 Build flags and gating (D5)
- **Deletes:**
  - `updateChannelCheckEnabled` in `build-flags.ts`, `test/settings-truth.test.mjs:20-21` and the stubs
    `chat-dictation-api.spec.ts:14-15` and `voice-stop-speaking.spec.ts:6`.
  - `VOICE_SEND_POLICY`/`setVoiceSendPolicyForTests` (D8; Q-VOICE-1).
  - The `'agent'` voice route (D8).
  - The dead `voicePreferenceKeys` listener.
- **Moves into `build-flags.ts`:**
  - `development-cartesia-flag.ts` and `development-cloud-voice.ts` (deleted as files).
  - `developmentBridgeAllowed`/`browserLocalAgentEnabled` (local-agent.ts:71-72, local-agent-storage.ts:9).
  - `devSurfacesEnabled` (dev-profile.ts imports it).
- **Shim:** add an `import.meta.env` shim in `test/support/strip-types.mjs`, replacing per-file
  `import.meta.env === undefined` shims.
- **Pins:** `test/dev-local-launcher.test.mjs:39`, `dev-surface-gates.test.mjs:88`, `one-runtime-profile.test.mjs:49`,
  application manifest :479-506, `recovery-ui.mjs:33`, `surfaces.mjs:37`, `cloud-connection-notices.mjs:204`.
- **Sources:** app-05 #10, app-07 #8/#9, app-23 #3, app-24 #4, app-26 #2–4.

#### U-R20 Product registration and constants
- Storage keys come from `product/alpha-product-registration.ts storage.retained`, with 15+ consumers (app-08 #10).
- One product character: `product/native-cloud-runtime.ts` and `scripts/agent-identity.ts`.
  `test/product-character-host.test.mjs:18-20` changes from vm eval to an import (app-08 #9).
- The photo-art palette (151 `--alpha-photo-*` tokens) moves to fixtures (Q-DEV-6).
- `basemap.ts` → `map-plane.ts` (app-08 #2).
- The retire-event constant is shared by maps-adapter.ts:397 and 6 browser files.
- `OWN_NOTIFICATION_SOURCE`, the SIM revision pattern, `noteFolderOf` and `CALENDAR_AVAILABILITY_CAPABILITY` are shared
  (app-25 #10).
- `FUNDING_NEEDED` and `BILLING_DECLINED` go into `subscription-entitlement.ts`. Pins: the T1 assertions in
  `test/subscription-entitlement.test.mjs:126,161` (app-21 #8).
- Shared `iconUrl` and mask helpers go in `icon-style.ts` (app-12 #13, app-13 #9).
- A settings row factory (app-08 #11).
- Share-panel wiring is shared by maps/share, notes-share and share-panel-adapter (app-08 #12, app-17 #5).
- `contactNames` goes in telephony-presenters (app-17 #7).

#### U-R21 CSS consolidation
- `connection-ui.css` + `cloud-membership-ui.css`:
  - Merge rules: scrim geometry, segmented controls, the touch-min token.
  - Drop 12 `!important`s.
  - Fix the undefined tokens `--connection-muted`/`--connection-border`. This is a dark-theme bug.
  - Pins: `cloud-connection-notices.mjs:17` (reads connection-ui.css), `scripts/fixtures/{cloud-delegation,hosted-live-source}/entry.tsx`.
- New `status-ui.css`.
- In `prototype.css`, collapse the Public Sans font-face. Pins: `test/font-license.test.mjs:290-310` (the exact Denton
  `@font-face{…}` string) and `scripts/prototype-capture.ts:156`.
- Utility classes `.sr-only` and `.alpha-mask-icon`; delete about 45 lines of dead CSS (app-16 #15/#16).

#### U-R22 One system-bar owner
- Fold `agent-adapter.ts:1532-1535` (Capacitor `SystemBars.setStyle` from `out.sbColor`) into `system-bar-appearance.ts`,
  or reverse it (Q-UI-8).
- Pins: `test/system-bar-appearance.test.mjs` (regex on the main.tsx call line and the AlphaDevicePlugin.java body) and
  `capacitor.config.ts:8`.
- Sources: app-17 #9, app-27 Q5.

### 1.3 Android main source

#### U-A1 Split `AlphaDevicePlugin` → `update/AppUpdater`
- **New `update/` package:**
  - `AppUpdater.java` (~560): `UpdatePause`, `UpdateActivation`, `UpdateResume` and all static update state.
  - Moves into it: `AlphaUpdateStatusReceiver` and `UpdateConfirmationReceipt`.
- **AlphaDevicePlugin keeps** five `@PluginMethod` forwards under the `AlphaDevice` plugin name.
- **Edits:** `AlphaApplication.java:11`, AlphaLocalAgentPlugin (UpdatePause users), `product.gradle`, and
  `AndroidManifest.xml` (the receiver class name is a manifest component; G5 applies to installed component names).
- **Pins:**
  - Quint `runtime-update-pause.mjs:23,26` (slices `' static final class UpdatePause {'` and `' static String appSigner('`
    up to `" /**\n  * A session's binding:"`), `update-barrier.mjs:30` (slices to
    `' // End of updater methods for host replay.'`), `update-staging.mjs`, `update-composition.mjs`.
  - Harness classes `RuntimeUpdatePauseTraces`, `UpdateBarrierHarness`, `UpdateCompositionHarness`,
    `UpdateStagingHarness`, and `specs/quint/native/manifest.json` (7 AlphaDevicePlugin entries).
  - Tests `test/app-update.test.mjs`, `test/fixtures/UpdateDownloadTest.java`, `UpdateFlowTest.java`,
    `scripts/test-automatic-update-platform.ts`.
- **Also:** add a package-private `AlphaDevicePlugin.snapshotFacts(context)` for SettingsSystemFacts (android-10 #11).
- **Source:** android-12 #1.

#### U-A2 Split `AlphaLocalAgentPlugin` → `agent/`
- **Target classes** (package-private, same package or `agent/`):
  - `ResidentLifecycle` (~380): static state, epochs, enrollment, attach/start/stop, recovery review, update pause.
  - `CredentialAuthority`: locks, intents, mutate.
  - `ProviderSettingsPlugin` methods.
  - `ResidentLaunchEnvironment` (`configureEnvironment`).
  - `ResidentRequestGate`: the 1,097-character route `if`.
  - `CanonicalNotificationSession`.
- **Order:**
  1. Delete the provider forwards (`saveVerifiedProvider`, `providerIdentity`, `applyProviderEnvironment`, the four
     test-only statics at 300, 323, 482 and 496-499, `AlphaConnectionPlugin.java:225`, and `LocalAgentProviderInstrumentedTest`).
  2. Move the test hooks to the testMocks source set: `attachForTest`, `lifecycleEpochForTest`, `adoptStreamForTest`,
     `instrumentationRecoveryEndpoint` (44-45, 151-160, 680-689) and `AlphaNavigationService.snapshot()`. They are
     reached by reflection from ResidentWorkflowCrash and from Quint `CredentialResidentTraces.java`/`NavigationServiceTraces.java`
     (Q-AND-7).
  3. Merge `VoiceEventAdmission` → `NativeVoiceBinding` (4 sites here).
  4. Make `packageStamp` required (`WorkflowWorkerAssets.java:36,53,79`, here 624-626).
  5. Split. Break the `AlphaCredentialStore` cycle.
- **Pins:** 17 static-caller files, the `test/fixtures/app-update-jvm/ai/alphacompute/alphaphone/AlphaLocalAgentPlugin.java`
  stub, **61 host tests** (list in android-13 pins) and about 42 specs files. The tests that slice it include
  `resident-recovery-review`, `resident-credential-shutdown-retry`, `legacy-cloud-recovery:44`,
  `product-character-host:38-39`, `local-agent-provider-admission:19`, `native-embedding-profile:19`,
  `power-cold-native-pin:47-131` and `always-on-listener:29-45`.
- **D7:** `PowerLaunchPin`, `capturePowerLaunchPin`, `launchSurface` and `takeInvocation` stay (G8). Move them intact
  into `ResidentLifecycle`.
- **Sources:** android-07 #3, android-10 #4, android-13 #3/#5/#12, android-15 #8/#13.

#### U-A3 Split `AlphaVoiceCloudPlugin`
- **Moves:**
  - Notes recording methods → `AlphaNoteAudioPlugin`. This changes the renderer plugin name in
    `runtime/note-recorder-driver.ts` in the same commit.
  - `Streaming` → `AlphaCloudSpeechStreamPlugin.java`, registered in `MainActivity`.
  - 429 parsing → `CloudVoiceLimit.java` (`test/cloud-voice-limit.test.mjs`).
  - Shared Cloud STT upload helper with `KeyboardDictationCloud` (android-15 #5).
  - Move the test seam `instrumentationBaseUrl`/`instrumentationCredentialSlot` to testMocks (android-06 #6, Q-AND-7).
- **Pins:** host tests that slice the file (`notes-recorder`, `streaming-speech`, `cloud-voice-profile`,
  `plugin-worker-guard`, `native-plugin-teardown`, `live-voice`, `power-cold-native-pin`), Quint note-bridge
  refinements and `keyboard-dictation-cloud.mjs`.
- **Paired methods** go with U-R5.
- **Optional:** merge `CloudSpeechPolicy` + `KeyboardDictationPolicy` + `CloudVoiceLimit` into one voice-policy class
  (research).
- **Source:** android-14 #4.

#### U-A4 Split `AlphaNoteAudioPlugin` → `NotesTrashBackstop.java`
- **Change:** extract the backstop with its constants, worker, two sweeps, one `runBackstop` and `AlphaApplication.java:26`.
- **G5:** the WorkManager class `AlphaNoteAudioPlugin$NotesTrashBackstopWorker` is persisted. Keep the binary name
  (nested class kept with a forwarding alias), or ship a cut-over that re-enqueues with `UPDATE`.
- **D1 first:** delete `migrateLegacyMetadata`/`migrationStatus`/`migrationWorker` (20-23, 49-55, 231), the browser
  `migrationStatus` (`browser/voice.ts:346`), `NoteAudioMetadataEncryptedInstrumentedTest`,
  `NoteAudioInstrumentedTest.optInRetiredDeletionCannotArriveAfterReloadAndRestore` and the `audio-fence` tuple in
  `scripts/ci/pending-recovery-ui.py:24`.
- **Pins:** `test/notes-deletion-lease.test.mjs:16`, `notes-recorder.test.mjs:325,519`, `reset-startup.test.mjs:48`
  (stub), `plugin-worker-guard.test.mjs:29` (`migrationWorker`) and androidTest `NotesTrashBackstopInstrumentedTest`.
- **Sources:** android-07 #2, android-13 #7.

#### U-A5 Split `MainActivity`
- **New classes:**
  - `HomeInstanceHandoff`.
  - `RendererEscapeView`.
  - `SystemInsetsBridge`.
  - `HomeSettings`, from the RendererRecoveryBudget Settings/HOME helpers (also used by `AlphaDeviceAppsPlugin:24`).
- **Merges:** `NavigationOpenRequest` becomes a nested class.
- **Removes:**
  - The `AlphaListenerPlugin` registration (U-A7).
  - The `PasswordTransferPlugin` dev registration (D3, Q-AND-15).
- **Pins:**
  - Native manifest (35 MainActivity pins) and application manifest.
  - `test/gesture-zones-single-instance.test.mjs` (exact MainActivity lines), `renderer-recovery-budget.test.mjs` and
    about 30 MainActivity regex tests.
  - Quint `MainActivityRecoveryTraces.java`, `HomeInstanceHandoffReplay.java`, `main-activity-platform.mjs`.
  - `test/fixtures/app-update-jvm/.../MainActivity.java`, `test/aosp-image-capability.test.mjs:256` (call order) and
    `scripts/pilot-update.ts`.
- **D7:** `isAssistantSurface` and its conjuncts stay.
- **Source:** android-15 #9.

#### U-A6 Split `AlphaConnectionPlugin`
- **Change:** extract the Google Workspace return (~65) and the static Cloud reads → `CloudReads`. Delete the
  `ConnectionRoutes` facade; call `ConnectionRoutes.POLICY`/`CloudConnectionPolicy` directly (263-359).
- **Pins:**
  - `AlphaCredentialStore.java:209`, `AlphaLocalAgentPlugin.java:463`, `CalendarSyncBridge.java:102,107`.
  - Stubs in `test/legacy-cloud-recovery.test.mjs:73` and `power-cold-native-pin.test.mjs:91`.
  - Quint `calendar-sync-enable-platform`, `resident-platform`, `services/credential-platform.mjs`.
  - Tests `test/connection-routes.test.mjs`, `fixtures/ConnectionRoutesTest.java`, `login-surfaces`,
    `cloud-sign-in-flow`, `cloud-deployment`, and androidTest `ConnectionRoutesInstrumentedTest`.
- **Sources:** android-12 #8, android-14 #8.

#### U-A7 Small Java merges and deletes

| Change | Edits | Pins |
|---|---|---|
| `AlphaImageCapabilities` → `AlphaImageCapability` (Q-AND-6) | AlphaContactsPlugin:15, AlphaDeviceAppsPlugin:16-17, AlphaSystemPlugin:42,45, AlphaTelephony:25, comments in both AndroidManifests | `test/aosp-capabilities.test.mjs`, `aosp-image-capability.test.mjs:83-86,133`, `native-plugin-teardown.test.mjs:366`, `support/feature-parity.mjs:63-64`, androidTest ImageCapabilities, native manifest :493,2519,2581, `app-info-handoff-platform.mjs:52-53` |
| Delete `AlphaListenerPlugin` | `MainActivity.java:355` | `test/always-on-listener.test.mjs:29-45`, `feature-parity.mjs:66`, native manifest :219,260 (check D7 first: is this the listener D7 keeps?) |
| `CalendarZones` → `AlphaCalendarPlugin` | delete the availability unit method | `test/calendar-availability-reader.test.mjs:17`, `fixtures/CalendarAvailabilityReaderTest.java`, runner count `calendarAvailability,4`→`3` in `scripts/test-calendar-regression.ts` |
| `HostedDeliveryCancelled` → `HostedDelivery`; `HostedStorageFault` → `HostedInbox` | | Quint hosted-inbox, deletion-coordinator and resident-coordinator source lists, `test/fixtures/ResidentDeliveryTest.java`, androidTest HostedBackgroundWorker |
| Delete `CalendarCreationStore` facade | `AlphaCalendarPlugin.java:97` uses the upstream store; delete CalendarUpgrade + the `test-installed-upgrade.ts` calendar kind | application manifest :5853,5925-5933, `feature-parity.mjs:93`, `scripts/owner/emulator-campaign-check.ts:68` |
| `VoiceEventAdmission` → `NativeVoiceBinding`; `SourceRenewalHost` → `SourceRenewalNotices`; `WorkflowNoticeTapsFactory` → `WorkflowNoticeTaps.create`/`WorkflowNoticeDelivery.create`; `NavigationOpenRequest` → nested in MainActivity | AlphaLocalAgentPlugin ×4; AlphaHostedResultsPlugin ×6, HostedDeliveryWorker; AlphaHostedResultsPlugin, AlphaNotificationsPlugin, WorkflowNoticePoster, about 35 androidTest sites | native manifest, `WorkflowNoticeTraces.java`, javac host tests pinning the tiny classes (Q-AND-24) |
| `GmailBackground` + `GmailDeliveryWorker` (research) | | **G5:** worker class name persisted |
| Hosted notice constants → `HostedNoticePoster` | `AlphaHostedResultsPlugin.java:18-19`, `AlphaNotificationsPlugin.java:56` | `test/context-selection.test.mjs:231`, `HostedResultNoticeTraces.java:281-282`, androidTest HostedResultNotice:81-82 |
| Delete `AlphaBrowserPlugin` aliases; point tests at `AlphaBrowserStores`; drop `LEGACY_PREFIX` (D1) | BrowserContinuity, CookiePolicy, ExternalHandoff, Signins tests | `test/browser-construction.test.mjs:28`, `browser-tab-host-identity.test.mjs:33` |
| `platformCapabilities` shape | `AlphaDeviceAppsPlugin.java`, `apps/app/src/native.ts:12` | |
| Maps dev transport → testMocks plugin | `AlphaMapsTransportPlugin.java`, `MainActivity.java:333` (register the dev subclass under test mocks), `maps/regional-provider.ts:33` | `test/plugin-worker-guard.test.mjs:28`, `navigation-service.mjs:19`, `NavigationServiceTraces.java:17,26`, androidTest MapsBackgroundNavigation:101 |
| AlphaHostedResultsPlugin: one `run(...)` wrapper; optional split into a Workflows notice plugin (Q-HOST-2) | renderer plugin name | |

Sources: android-12 #10/#11/#13, android-13 #1/#2/#6/#11, android-14 #9, android-15 #8.

#### U-A8 Legacy Cloud sign-in restore removal (D1)
- **Deletes:**
  - `LegacyCloudRecovery.java`.
  - The `ResetBeforeDispatch` legacy step.
  - `AlphaCredentialStore` pieces: 79-80, 105, 135, 180, 196-216, 239, `readLegacySlotBeforeAttach` and
    `retainedLimit` (43, 59-70).
  - `AlphaCloudSignInPlugin.java:25,74-125,90` (`savedSignInRecoveryStatus`/`restoreSavedSignIn`).
- **Renderer:** `cloud-sign-in.ts:44-50` and `connection-ui.tsx` (snapshot :120, 2826-2844, 3669-3674, 3880).
- **Also:** `scripts/cloud-deployment.ts:96` message, the `cloud-signin` journal in RendererCredentialSlots, and
  `androidTest/assets/video-account-fixture.js:20`.
- **Tests:**
  - `test/legacy-cloud-recovery.test.mjs`, `test/fixtures/legacy-cloud-recovery/*`.
  - `quint-saved-sign-in-recovery`, `reset-cloud-revocation`, `reset-wiring`, `power-cold-native-pin`,
    `native-recovery-admission-order`.
  - `browser/saved-signin-retry.production.spec.ts`: verify which "saved sign-in" it covers. The resident
    `residentSavedCredential` retry stays.
  - Quint `SavedSignInRecoveryReplay.java`, `saved-sign-in-recovery.mjs`, `forward-replays.mjs`,
    `credential-coordinator.mjs`, `refinement/services/credentials.mjs`, native manifest :3577-3618, feature-parity.
  - `CredentialCoordinatorTraces.java:197`, `ServiceCredentialTraces.java:27` (retainedLimit).
- **Sources:** android-08 #4, android-12 #6, android-15 #6, app-22-p2 #2.

#### U-A9 Other Android D1 readers
- `AlphaFilesPlugin` retired SAF tree.
- `AlphaMediaConfig.legacyCaptures("Pictures/")`, with `KeptCaptureLegacyPathInstrumentedTest` and
  `test/owned-captures-legacy-path.test.mjs`.
- Reminder legacy store (needs an upstream change, because `ReminderConfiguration` requires a non-null `legacyName`; see §6):
  - androidTest: ReminderAgent, ReminderOneOff, ReminderUpgrade, ReminderLifecycle (channel), ReminderTiming
    (timing-less receipts), `WorkflowLegacyReminderUpgradeInstrumentedTest`.
  - The `scripts/test-installed-upgrade.ts` legacy seed (38, 117).
  - `test/installed-upgrade-runner.test.mjs:61-77`.
  - `ReminderDeliveryTraces.java:253`.
  - The `AlphaReminders.java:12` second argument.
  - The `legacyAlarm` fixture key in `WorkflowPhoneNativeInstrumentedTest:90,95` and the comment at
    `NativeDigestSources.java:79`.
- `AlphaActionJournal` legacy terminal Clock replay (Q-AND-4).
- `UPDATE_BINDING` makes `/intent` mandatory (Q-AND-3).
- `DataIntegrityProvider` pilot export (Q-AND-5).
- `AlphaPhotosPlugin.preserveClosedVideoCopy` (30-31), with `VideoCopyClosedFailureReviewInstrumentedTest` (Q-AND-12).
- Notes import (D3): `AlphaNoteDocumentsPlugin.importText` gated branch, the `NotesDocumentInstrumentedTest` test-mocks
  flow, the `notes-document` case in `scripts/test-native-restart.ts:56`, `SelectedDocumentAccess.selections()`, the
  "Import text note" control (`template.html:2460`) and `canImportText` plumbing. Keep `exportText`/`exportPdf`.
- **Sources:** android-07 #1/#10, android-09 #4, android-11 #5, android-13 Q1.

#### U-A10 Java package foldering
After U-A1…U-A9, move the classes into subpackages (§5.2). Do it in a **separate** commit after the splits, because the
package move touches every Quint harness source list, every javac host test classpath, `proguard-rules.pro`, both
AndroidManifests (component class names: G5 applies to manifest components, which are installed identity), and
`consumer-host.json:169` (`AlphaCanonicalNotifications.resumeExisting`).

#### U-A11 P-78 dormant entry, not executed (G8/D7)
- **What was proposed:** android-02 #5, android-04 #5, android-09 #15, android-12 #7, android-13 #4, android-14 #1,
  android-15 #10, android-16 #4 and app-26 #4 propose deleting:
  - `AlphaAssistActivity`, `AlphaPowerVoiceActivity`, `AlphaQuickSettingsTile`.
  - `PowerLaunchPin`, `launchSurface`, `takeInvocation`.
  - The image defaults (config_defaultAssistant, long-press Power, lockscreen preset, `power-voice/`).
  - Assistant* androidTests, `voice-entry-policy.ts` and the external-voice-invocation paths.
- **DECISIONS D7 keeps them.** Allowed here:
  - (a) Mark `AssistantInstrumentedTest`, `AssistantResidentReuseInstrumentedTest` and the PhotosTrash two-Activity
    race as `NOT_RUN_BY_A_RUNNER` with a reason. They launch a component declared `enabled="false"`, so they can only
    fail (NEW-DISABLED-COMPONENT).
  - (b) Add the image-vs-manifest agreement check (NEW-IMAGE-MANIFEST) to `scripts/apk.ts`/`stage-aosp.ts`.
  - (c) Split `values/alpha-system-entry.xml` → `alpha-runtime-notification.xml`. The tile strings stay
    (`test/alpha-system-entry.test.mjs:15`, `android-host.test.mjs:160`).
- **Owner:** Q-P78-1 asks the owner to reconfirm D7 given the image/app contradiction.

### 1.4 Android instrumentation (androidTest)

#### U-T1 Never-run and duplicate class deletions
- **Rule (G4):** each deletion removes its key from `scripts/android-instrumentation.ts` (`NOT_RUN_BY_A_RUNNER` or
  `CLASS_REGISTRY`) in the same commit. `test/android-instrumentation-runner.test.mjs:203-205` fails on stale NOT_RUN
  entries. It does **not** flag stale registry entries, so check those by hand.
- **Delete (never run):**
  - CombinedAgent, CombinedAgentRestart, DeviceAction, ContactsFlow (329-332; Q-AND-16 for the combined-agent launcher
    script and the Quint model).
  - LiveAgent, LocalServerSocketRelease (326, 333; also edit the `PrototypeFlowInstrumentedTest.java:18` comment).
  - PosterCalendarJourney, RemoteAgent, PublicCloudTransportProbe, ResidentModelResponseContractTest,
    ResetExternalFixture (325, 339, 338, 340, 327).
  - SpeechPipelineTrace (341), VoiceFloatPathDiagnostic (342), VideoCopyClosedFailureReview (337), PairedMaps,
    PairedReminder (334-335).
  - AllViewAgentContext (328).
- **Delete (registered but redundant):**
  - ClockRepeatDays (197). Add an `EXTRA_DAYS` assertion to ClockAgentReview; the method name stays, pinned by
    `pending-recovery-ui.py:24` and `test-pending-recovery-phases.py:90`.
  - HostedResultsLifecycle (269).
  - UiDispatch (257).
  - JourneyJ05 (238, `test/android-instrumentation-runner.test.mjs:628-643`; Q-AND-17), then make the
    BrowserPageQuestion helpers private.
  - BrowserUnsupportedReading (+ `test/ci-emulator-evidence.test.mjs:234`).
  - `ConnectionInstrumentedTest#productionTransport…`: add its URLs to ConnectionRoutes and update
    `android-instrumentation-runner.test.mjs:544-547`.
  - `CalendarFlow.calendarFormPersists…`: change `scripts/test-calendar-regression.ts:63` `calendarFlow,5` → `4`, and
    update `calendar-regression-runner.test.mjs` and `fixtures/isolated-native-campaign.mjs`.
  - `SettingsRoles.calendarRowMatchesRuntimeGrant`: move its check into SettingsNative.
- **Merges:**
  - `InboxOperationJournal` + `LargeInboxAttachment` → `InboxSecureSlotsInstrumentedTest` (registry 209/244 become one
    entry and one gate argument).
  - `DispatchClaim` → `TestUiDispatch`.
  - `AccessibilityBounds` → `TalkBackOrder`. Delete `test/accessibility-visible-bounds.test.mjs` and
    `fixtures/AccessibilityBoundsTest.java`.
  - `ReadinessEpoch` → `StartupDocumentProbe`.
  - `ResidentModelResponseContract` → `ResidentTestFixture`.
  - `ReminderLifecycleTestAccess` → `ReminderTestAccess`.
  - `WorkflowApprovalNoticeProcessDeath` absorbs `WorkflowNoticeProcessDeath#approvalNotice…`. Update
    `pending-recovery-ui.py` (PHASES, OWNER_PREPARED, result regex :33, runner :96) and
    `test-pending-recovery-phases.py:79-121` (Q-AND-18).
  - Optional: NoteRecordingSave → NoteAudio (Q-AND-19).
- **Wire or delete orphan methods** (per-method reachability: NEW-PER-METHOD):
  - `CameraFlow.cameraDeniedForever…` → `scripts/test-native-permissions.ts` + `native-permission-runner.test.mjs`.
  - `CalendarAgentCrud.insertHandoff…` → `test-calendar-regression.ts`.
  - The Maps regional methods.
  - Gates no runner passes: `notesSecureMigration`, `photoLibraryGrantTest`, `photosForeign*`, `posterJourney`,
    `reminderAgentPhase`, `noticeQuestion`, `publicCloudProbe`, `ownedCloudRead`, `localRemote`, `resetFixture*`,
    `mapsLatitude`, `mapsRegional`, `liveAgent`.
- **Sources:** android-04 #7/#8, android-05 #2/#4/#8, android-06 #1–4, android-07 #4–6/#12, android-08 #2, android-09
  #1/#2/#6, android-10 #6/#10, android-11 #4/#6.

#### U-T2 Move upstream-engine tests upstream (D14, §6)
- **Candidates:** PhotoReplace, PhotoFilter, PhotosCatalogOrder, PhotosLibrary, VoiceWorkerSettlement,
  ReminderDeletionJournal (+ `androidTest/java/ai/eliza/plugins/reminders/ReminderDeletionJournalFixture.java`),
  ReminderRecurrence.civilScheduleSkips, NativeVoiceLatency, the LocalSpeechBridge drain-ordering check,
  CloudSignInAuthorization (reflection into `CloudSignInPlugin$Attempt`), CrossAppNotifications (`NotificationMirrorListenerService.events`),
  and the pure-upstream classes SystemFacts, SystemSettingsPages, SystemShade, CrashLog, DeferredDeletionJournal,
  StorageCatalog, SessionSpeech, ResidentStreamTransport, SpeechSentenceCancellation, StorageCategories,
  SelectedCalendarReader, BrowserExternalHandoff, BrowserPageReading.sensitiveUrl and the reflective
  BrowserReviewedReading.reviewQuestion.
- **Order:**
  1. Upstream PR.
  2. Advance the pin and update `upstream.lock.json`.
  3. Delete here and drop the `CLASS_REGISTRY` entries (254-256, 272-274, 277) and the PhotosCatalogOrder text assertion
     (`android-instrumentation-runner.test.mjs:177-184`).
- **Owner:** Q-AND-20.

#### U-T3 Instrumentation assets
- **`trusted-worker.mjs`:** split into a 37-line `trusted-worker-harness.mjs` plus a generated prelude, generated at
  instrumentation build time (`agent:stage-android` or `scripts/android-instrumentation.ts`).
  - Add an androidTest assets srcDir in the generated host (`consumer-host.json`/`android-host.ts`).
  - Delete `test/trusted-worker-prelude.test.mjs`.
  - `scripts/ci/resident-native.py:39-42` computes the digest from the generated asset.
  - `ResidentWorkflowCrashInstrumentedTest.java:348` fixture `trustedWorkerSha256`.
  - Source: android-03 #5.
- **PDF fixtures:** store the three `.base64` files as binary (`IsolatedPdfInstrumentedTest.java:38`; android-03 #9).
- **Readiness query JS:** move from `StartupDocumentProbe.java:49` to an androidTest asset. Pins:
  `test/browser/mock-readiness.spec.ts:4-7`, `scripts/ci/affected.ts:13`, `test/ci-affected.test.mjs`
  (android-10 #7).
- **Accessibility rule constants:** a shared JSON read by `TalkBackOrder.java` and `test/browser/accessibility-audit.ts`
  (android-10 #8).
- **Optional renames** (pins): `ReminderDeletionStorageInstrumentedTest` (`pending-recovery-ui.py:24`,
  `scripts/ci/fixtures/recovery-storage-e4d-pass.txt`, `test-recovery-ui-guard.py:112`) and the `ReminderTiming` method
  `...LegacyReceiptsRemainBound`. Also rename the misleading "legacy" fixtures (`legacy-worker-client` in Hosted*,
  `synthetic-legacy`).

### 1.5 AOSP packets and Android build modules

#### U-O1 Shared AOSP packet tool `android/aosp/branding/packet.py`
- **Contents:** digest, safe path walk, `fetch(lock)`, `admit(manifest, apply)`, `PatchBuilder`, `java_binary`,
  `android_api_jar`, `REPO`.
- **Merges:** `system-entry/{apply,fetch,portable_tools}.py`, and `hidden-navigation-handle/apply.py` into
  `system-entry/apply.py` (optionally with a `requiredExistingResource` check).
- **Callers:** `system-entry/prepare.py`, `test_native_plan.py`, `hidden-navigation-handle/{prepare,test_hidden_handle}.py`,
  `core-launcher/{prepare,test_policy}.py`, `scripts/fetch-alpha-os-preset-inputs.py`, `scripts/stage-alpha-os-branding.py:9,18-25,58-64`,
  `test/aosp-fresh-presets.test.py:7-8`.
- **Pins:** Quint `OSSourceStaging` hashes the stage/fetch scripts (`specs/quint/application/manifest.json:3990-3992`,
  `scripts/quint-lib.ts:10`). Add `packet.py` to those source lists.
- **Sources:** android-01 X2/X3, android-02 #1.

#### U-O2 Packet regeneration units (each regenerates a patch and manifest pair)
- **Wire or delete the Launcher3/LatinIME patches** (Q-AOSP-1). `home-back-keyboard.patch` and
  `hidden-navigation-handle.patch` are applied by nothing, while the dependent overlays are staged.
  - Edits: a generic `patch_plan(packet)` in `stage-alpha-os-branding.py`, `home-back-keyboard-inputs.json` (becomes a
    manifest), `hidden-navigation-handle/manifest.json`, `provision/source-inputs.json`, `test/aosp-fresh-presets.test.py`,
    the READMEs and `os-source-staging.mjs`. Fix the misplaced Javadoc at `home-back-keyboard.patch:34-36`.
- **System-entry generated sources:** move them out of Python strings into `system-entry/src/**` (6 files). This is a
  pure refactor; the patch hash `58e75d2a…` must not change.
  - Then the behaviour fixes (prepare.py:101-117 double reads, the `fits(..., false)` parameter) regenerate the patch,
    `system-entry/manifest.json` (`patchSha256`, `afterSha256`) and `power-voice/manifest.json:7`, and delete
    `PROVENANCE.json`. **These need a full SystemUI build and device acceptance.**
- **core-launcher:**
  - Drop the unread status booleans (`prepare.py:224-226` → `manifest.json`). This changes `corePolicyManifestSha256`,
    which is informational.
  - Drop `url` from the pin files.
  - Optionally drop the blank-context rewrite (prepare.py:220) in favour of `.gitattributes`. That regenerates the patch,
    `patchSha256` and `test/quint-os-application-refinement.test.mjs`. `os-defaults.mjs` slices
    `    private void grantAlphaSharedStorageDefault(` and asserts `AlphaQsDefaultsPolicy.VERSION==3`.
- **Secure-camera duplicate removal** (Q-AOSP-2): delete both `alpha-secure-camera.xml` overlays and
  `secure-camera-inputs.json`; edit `branding.mk:3` and `stage-alpha-os-branding.py:103`. Fix
  `test/aosp-cloud-power-defaults.test.mjs:18-22`, which claims the camera stays stock while the RRO sets the gesture
  (NEW-TEST-STOCK).
- **Provision cleanup:**
  - `AlphaAppearance.applyPalette` → `AlphaFreshPresets` (Q-AOSP-4).
  - `AlphaFreshSetupPolicy` inline.
  - `AlphaWelcome.fail`.
  - `os-provisioning.mjs:80-85` (text anchors, `$Completion` reflection).
  - `stage-alpha-os-branding.py:27-48,124-138`.
  - `admitted-previous-sources.json` (Q-AOSP-3).
- **Ignore/attribute consolidation:** one `android/aosp/branding/.gitignore` (+ `.cache/`) and one `.gitattributes`
  (`*.patch -whitespace`). Delete the 6 per-packet files.
- **README consolidation:** fold `POWER-INVOCATION.md` and `keyboard-dictation/README.md` into `branding/README.md`, and
  remove the `builder/` reference.
- **Icon:** move `drawable/app_icon.xml` into `provision/`, trimmed of dead geometry. This changes the pinned SHA in
  `provision/source-inputs.json:77-90` and `test/aosp-fresh-presets.test.py:102` (Q-AOSP-5).
- **Manual Python tests (T9):** wire `test/aosp-fresh-presets.test.py`, `system-entry/test_native_plan.py`,
  `hidden-navigation-handle/test_hidden_handle.py` and `core-launcher/test_policy.py` into
  `test/python-suites.test.mjs` with input-dir skips, or delete them (Q-AOSP-6).
- **Sources:** android-01 X1/X4–X7, android-02 #2–8, android-03 #6, android-16 #1/#2.

#### U-O3 Android build modules and records
- **Theme resources:**
  - One `values/styles.xml`.
  - Delete `values-night/styles.xml`.
  - New `values/colors.xml` and `values-night/colors.xml`.
  - Delete `values/alpha-launcher.xml`; `drawable-v26/app_icon.xml:3` uses `@color/alpha_brand`.
- **Remove the `video-fixture` module:** move `qa-source.mp4` → `test/fixtures/`.
  - Pins: `consumer-host.json:46`, `test/android-host.test.mjs:119,122`, `scripts/ci/affected.ts:14`,
    `test/browser/native-video-library-change.spec.ts:7`, `media-polish.spec.ts`.
- **Drop redundant app dependencies:** `consumer-host.json:50-56`. Regenerate via `android-host.ts`, check
  `gradle-verification`, and re-pin the consumer-host digests in the native and services manifests.
- **Shared `android/paradee-abis.gradle`:** used by `product.gradle:138-140`, `local-speech/build.gradle:2-4` and
  `sense-speech/build.gradle:5-8`. The generator must copy it. Keep the `test/one-runtime-profile.test.mjs:54-68`
  regexes green.
- **One upstream speech-source locator:** `prepare-patched-native.ts` root.
- **One ASR record:** fold `paradee-voice/asr-inputs.json` into `voice-host/qualified-voice-host.json`.
  - Edits: `paradee-runtime.ts:47-56,89-91`, `voice-host.ts`, `ci/speech-candidate.ts:35-37`,
    `host-speech-admission.ts:54`, `source-snapshot.ts:26`.
  - Tests: `paradee-runtime`, `voice-host-record`, `voice-host-absent-admission`, `android-build-path`.
- **One fingerprint record:** delete `signing/public/fingerprints.json` and `PROVENANCE.json` (Q-AND-28). Optionally
  `release-custody-proof.py` reads `android/release-signer.json`.
- **Owner-gated:**
  - Rotation block (Q-AND-27): `release-signer.json:10-24`, `sign-release-apks.ts`, `update-apk-admission.ts`, the
    release workflow, `pilot-rotation.ts`, `pilot-update.ts:381`, tests.
  - Empty native patch list (Q-AND-29): `prepare-patched-native.ts:22-60`, `quint-lib.ts:119`.
  - Sense shims (Q-AND-30): the `pixel10a-composition.json:29` componentPackage and 7 `sense/*.java` files; pins
    `always-on-listener.test.mjs:13`, `aosp-pixel10a.test.mjs:15`, native manifest :216-218,257-259,322. **D7 applies:
    the listener stays.**
  - Retire the foreign-Photos campaign (Q-AND-26): `MediaFixtureActivity`, notification-fixture manifest/asset/provenance,
    `PhotosForeignLibraryInstrumentedTest`, registry :255.
- **Private peer fixture trims:** `build.gradle:7`, `PrivateSocketProbeService.java:56` and manifest line 4, all in one
  change. Their bytes are hashed together per run, so there is no pinned digest.
- **Embedding-host record cleanup:** `build-toolchain.json`, `build-embedding-host.ts:21,88`,
  `android-build-preflight.ts:260`, `strict-build-inputs.test.mjs`; `jniIdentityRelocated` in `stage-embedding-host.ts`,
  `qualified-host.json:31`, `embedding-host-admission.test.mjs:156`, `android-build-path.test.mjs:239`.
- **`product.gradle`:**
  - Private-QA update admission: Gradle checks only the digest; Node `update-channel.ts` is the admission. This fixes the
    lowercase `x-goog-*` divergence. Shrink or delete `test/update-channel-gradle.test.py`, which slices between
    `// One-tap app update` and `\nandroid {` (Q-AND-31).
  - Remove the removed-profile refusals (8-9, 151-159; `one-runtime-profile.test.mjs:57`, `android-host.test.mjs:110`).
  - Remove the App Link host input (33-38, 96). Keep the BuildConfig field name `ELIZAOS_APP_LINK_HOST`.
  - Optionally merge the preBuild Exec tasks into `scripts/verify-android-inputs.ts`.
- **Others:** pilot enrollment single source (Q-AND-32), the soong-memory patch upstream (§6), a ProGuard trim
  (`proguard-rules.pro`, verified via the release `mapping.txt` and `verify-apks`).
- **Sources:** android-03, android-16 #3–7, android-18.

### 1.6 Build config and scripts

#### U-B1 One alias source and one identity reader
- **Alias source:** `prepare-client-features.ts` emits `aliases.json` and `tsconfig.paths.json`. `tsconfig.json`
  extends it and `vite.config.ts` reads the JSON (Q-BUILD-3).
- **Identity:** `vite.config.ts:18-19` uses a JSON import, matching `capacitor.config.ts:2` and U-L7.
- **Pins:** `test/one-runtime-profile.test.mjs:48` (regex over vite.config.ts) and `account-sheet.mjs:68` (esbuild-bundles
  vite.config.ts; new imports join its input set automatically).
- **Sources:** app-27 #1/#6.

#### U-B2 `@dev` alias replaces `disabledModuleSource` + importer allowlist
- **Touches:** `vite.config.ts`, `main.tsx:36-38,99,121,174`, `connection-ui.tsx:3314`, `password-manager.ts:5-6,47`,
  `device-controls.tsx:51`, `simulated-apps.ts:17-20`, and the comments that name `disabledModuleSource`.
- **Backstop:** `scripts/audit-production-bundle.ts`.
- **Fail-open:** the swap at `vite.config.ts:69-70` falls back to the real fixtures when `fixtures.empty.js` is missing.
  Make it fail the build (NEW-FAIL-OPEN).
- **Source:** app-27 #2.

#### U-B3 Single test-mocks env name and config-time side effects
- **Env name:** accept only `ELIZA_DEV_ALLOW_TEST_MOCKS` as input (Q-BUILD-1).
  - Edits: `vite.config.ts:17`, `browser-cloud-dev-bridge.ts:501`, `gradle-verification.ts:277`, `qualify-head.ts:368`,
    `dev-cloud.ts:23`, `dev-ui-remote-host.ts:12`, and the `.github/workflows/{android,android-emulator,browser}.yml` env
    blocks.
  - Tests: `dev-ui-remote-host:27`, `verify-apks:259`.
- **Cloud-deployment check:** move from `vite.config.ts:16` to an `apply:'build'` hook, or drop the duplicate in `verify`
  (Q-BUILD-2).
- **Cartesia preview flag:** `vite.config.ts:110` contradicts `development-cartesia-flag.ts:3` and
  `test/private-preview-cartesia-route.test.mjs:17-30` (Q-BUILD-5).
- **Source:** app-27 #3–5.

#### U-B4 Delegation-return HTML
- **One commit:** the inline script, the CSP `script-src 'sha256-…'` and (if its block is deleted)
  `test/quint-conformance.test.mjs`. It must stay a single inline `<script>` (Q-FORMAL-4).
- **Canonical icons:** if `test/canonical-icons.test.mjs` is deleted, its SVG-vs-`source.json` hash check moves into
  `audit-production-bundle.ts` in the same change.
- **Source:** app-01 #2/#4.

---

## 2. Text and path pins

Kinds of pin:
- **P**: path (file is named, imported or compiled by path)
- **T**: text (regex, slice marker, literal line, or exact substring rewrite)
- **S**: symbol (a formal manifest names a function, class or local variable)
- **I**: import-specifier stub (an esbuild/vm stub keyed on the import string)
- **H**: hash (a byte digest of the file is recorded)
- **R**: runner (a class or method name is pinned in a runner)

Any change to a pinned file must update every pin listed for it in the same commit, or delete the pinning test (D10).

### 2.1 Universal pins (apply to every file in the area)

| Pin | Covers | Kind | Effect |
|---|---|---|---|
| `test/support/feature-parity.mjs` (+ `test/feature-parity.test.mjs:24-31`, generated by `scripts/feature-manifest.ts`) | Every `apps/app/src` TS/TSX file and every Android main Java class (exact inventory, about 636 lines). Some rows also name owners, for example `:31` system-bar-appearance, `:39` template-source, `:40` local-reply-speech → voice-adapter. | P | Every delete, merge, move or rename edits it. Q-TEST-2 asks whether to reduce it to directories. |
| `specs/quint/{application,native,services,legacy}/manifest.json` | `sources` paths, `symbols` (including local variable names) and literal strings for most renderer and Android files | P/S/T | Grep before any rename. Symbol pins break silently under refactors that a formatter would otherwise do freely. |
| `specs/quint/refinement/**/*.mjs` and `*Traces.java` / `*Harness.java` | Compile, bundle or slice sources by path; stub modules by specifier; compile Java with `javac` from source lists | P/T/I | Treat each as a test that must be ported to imports (T10, D11). |
| `LemmaScript-files.txt` + `specs/lemma/apps/app/src/**.dfy(.gen)` + `specs/lemma/README.md` | Files carrying `//@` contracts: browser-poll, workflow-triggers, calendar-days, chat-overlay-motion-adapter, context-selection, note-recorder, settings-adapter, cloud-environment-selection, cloud-voice-limit, gmail-mailbox, hosted-digests, inbox-edit-coalescer, inbox-operation, resident-recovery, canvas-geometry, voice-states, workflow-device-contract, startup-permission-flow, edit-receipt, journal-retention, notifications, video-capture, video-edit | P/T | A move or `//@` change regenerates the `.dfy` under the new path. |
| `scripts/android-instrumentation.ts` (`CLASS_REGISTRY`, `NOT_RUN_BY_A_RUNNER`, `DEFAULT_CLASSES`, `CAMPAIGN_RUNNERS`) + `test/android-instrumentation-runner.test.mjs` | Every androidTest `@Test` class. Gate literals `"1".equals(InstrumentationRegistry.getArguments().getString("<gate>"))`, `BuildConfig.ELIZA_DEV_ALLOW_TEST_MOCKS`, `BuildConfig.IS_LAUNCHER`, `isSystemUser()`; forbidden labels (`:647-655`) | R/T | Class deletes and renames edit the registry. Gate text must stay literal. |
| `scripts/ci/emulator-suite.ts` (`READING_CLASSES`, `READING_TEST_MOCKS_CLASSES`, `FUSED_SPEECH_CLASSES`) + `test/ci-emulator-evidence.test.mjs` | Reading and speech instrumentation classes | R | |
| `scripts/ci/pending-recovery-ui.py:24-33,80,96` + `scripts/ci/test-pending-recovery-phases.py` (CI `resident-android.yml:606`) | ClockAgentReview, CloudDelegationCallback, Connection, NoteAudio, ReminderTiming, ReminderDeletionStorage, ReminderAgent, ReminderTap*, WorkflowNoticeTap, WorkflowNoticeProcessDeath (method names, phases, result keys) | R | |
| `scripts/test-native-restart.ts`, `test-native-permissions.ts`, `test-calendar-regression.ts` (including **method counts**), `test-installed-upgrade.ts`, `android-workflow-native.ts`, `maps/test-native-*.ts`, `test-cross-app-notifications.ts`, `owner/emulator-campaign-check.ts` + their runner tests + `test/fixtures/isolated-native-campaign.mjs:12,18,53,114` | androidTest class, method, gate and phase names | R | |
| Playwright `page.evaluate(import('/src/...'))` | About 120 specs for `browser/`, about 45 for `runtime/browser-notes-document.ts`, 22 for `prototype/browser-camera.ts`, and others (per-file lists in the chunk summaries) | P | Moves break them at runtime only (T6). Rewrite them as journeys or update the paths. |
| `scripts/audit-production-bundle.ts:30-63,104,113-134` | Copy markers and denylist strings (`'__alpha-browser-cloud'`, `'Development reply'`, password-provider strings, hosted-agent markers, `alpha:force-render-error`, "owner directive 2026-10-14", "(#406)") | T | Before stripping an A8 comment, check whether it is a text anchor. |
| T2 fixtures that strip `^import .*;\n` (`test/fixtures/use-in-email-review.mjs:6`, `workflow-execution-fixture.mjs`, workflow-adapter/workflow-authoring transplants and others) | Their source files | T | Imports must stay single-line, with type imports inline, until the fixture is retired (blocks D9). |

### 2.2 Renderer: root, build and product

| Source file | Pinned by | Kind |
|---|---|---|
| `app.config.json` | `test/launcher-orientation.test.mjs:16` (`orientation === 'unspecified'`), `product-identity`, about 28 other tests, `.github/workflows/release-cloud-app-signing.yml:120`, `android/app/product.gradle:40`, `capacitor.config.ts`, `system-entry/prepare.py`, `hidden-navigation-handle/test_hidden_handle.py`, `account-sheet.mjs:77`, `scripts/ci/hosted-native-inputs.py`, 31 script readers (U-L7) | P/T |
| `apps/app/index.html` | `scripts/quint-lib.ts:39 runtimeAssetPaths` (+ `test/quint-checker.test.mjs:7,79`), `account-sheet.mjs:79`, `cloud-connection-notices.mjs:151` | P |
| `public/delegation-return.html` | Its own CSP sha256 (exact script bytes), `scripts/test-cloud-delegation-return.ts`, `test/quint-conformance.test.mjs:44`, `portable.mjs:44,58,67`, application manifest :1408,6909, `scripts/ci/export-browser-proof.ts:73`, `test/browser/adapters.spec.ts:6`, the upstream redirect URI convention | H/T/P |
| `public/icons/lucide/source.json` + `LICENSE.txt`, `icon-catalog.json` | `test/canonical-icons.test.mjs:10-21` (package, version, licence, every sha256, key set), `scripts/vendor-lucide-icons.ts:16`, `test/fixtures/workflow-execution-markup.mjs:14` | H/T |
| `public/icons/senders/*` | `test/mail-sender-image.test.mjs:5-6`, `runtime/connection-ui.css:90` | P |
| `vite.config.ts` | `test/one-runtime-profile.test.mjs:48` (regex), `account-sheet.mjs:68` (bundled import graph), 9 legacy checkers, refinement `account-sheet`, `cloud-connection-notices`, `shell-coordinator`, `composition/{controllers,index}`, `native/copy-receipt`, `test/fixtures/calendar-mounted-editor.mjs:13,247`, `scripts/quint-lib.ts:34`, `source-snapshot.ts:5`, `dev-ui-remote-host.ts:13`, 6 browser specs | T/P |
| `tsconfig.json` | `test/fixtures/shared-batch-voice.mjs:11` (parses `compilerOptions.paths` keys), `tsconfig.scripts.json` extends it, services manifest :2375, 5 services refinement harnesses | T/P |
| `capacitor.config.ts` | `scripts/quint-lib.ts:34`, `source-snapshot.ts:5` | P |
| `build-flags.ts` (+ emitted `build-flags.json`) | `test/settings-truth.test.mjs:20`, `dev-local-launcher.test.mjs:39` (transplant), `one-runtime-profile.test.mjs:49`, route stubs `chat-dictation-api.spec.ts:15`, `voice-stop-speaking.spec.ts:6`, application manifest :479-506, `recovery-ui.mjs:33`, `surfaces.mjs:37`, `cloud-connection-notices.mjs:204`. JSON: `scripts/apk.ts:221-225`, `audit-production-bundle.ts:113-134`, `product.gradle:154`, `android-cloud-voice-timing.ts:173` | T/P |
| `main.tsx` | See U-R9 (14 host tests, 2 scripts, 10 refinement harnesses, 5 legacy checkers, 4 fixtures, application manifest symbols). Also `accessibility-coverage` asserts the `installViewFocus()`/`installToastLayer()`/`installTextScale()` text, and `home-shell` checks the main.tsx call via `product-identity:139` | T/S |
| `daily.ts` | `scripts/test-clock-handoff-flow.ts:8`, 9 browser specs import `/src/daily.ts` | P |
| `native.ts`, `platform-plugins.ts`, `maps/*`, `passwords/*` | `feature-parity.mjs:313-337`. Services manifest (maps sources and symbols `retireCloudMaps`, `previous`, `mapsSession`, `sameAccount`, `keepCloudMapsCoverage`, `pending`, `seen`, `NavigationVoice`, `latest`, `owed`, `resume`, `owe`, `hiddenDuringSpeech`, `activeOffer`, `connected`, `withMapsNavigationRelay`, `residentMapsNavigationPort`, `MapsController`). Native manifest (`SharedLocation`, `ElizaLocation`). Application manifest (`MapPlane`, `cloudMapsBasemap`). `map-theme-colors.test.mjs:72-74` (map-plane line 51). `navigation-voice.test.mjs:8-10`, `native-speech.production.spec.ts:66-68`, `navigation-voice-pause.test.mjs:22` (single-line imports). `dev-surface-gates:100-120`. `settings-truth:217-219` and `login-surfaces.mjs:146-147` (password-manager text). `cloud-maps-session.test.mjs` (I). `map-plane-ownership.mjs:37` (reads cloud-provider.ts text). `vite.config.ts:33-34,80` | P/S/T/I |
| `product/alpha-product-registration.ts`, `owner-route-table.ts`, `native-cloud-runtime.ts` | `font-license.test.mjs:290`, `scripts/feature-manifest.ts:29`, `agent-identity.ts:3`, `consumer-host.json:122`, `android-host.test.mjs:107`, `scripts/apk.ts:1`, `android-host.ts:20` (byte-exact asset), `native-google-product-host.ts:9`, `product-character-host.test.mjs:18-20` (vm eval), `one-runtime-profile.test.mjs:71-73` | P/T/H |
| `local-speech-playback.ts` (root) | Native manifest symbols `confirmSpeechRetirement`, `speakChunk`, `dispose`, `playOwnedSpeech`, `speakLocalText`, `strictDrain`, `preparation`, strings `speech-cleanup-unconfirmed`, `playback-busy`; `renderer-speech-chunk.mjs:44` (source eval), `speech-cleanup-latch.mjs`, `web-reading-review.mjs`, application manifest | S/T |
| `icon-style.ts` | `automations-unified.test.mjs:69`; the import line `import {iconStyle} from '../icon-style';` is rewritten by `browser-reading-capability.test.mjs:156` and `dc-lite-keys.test.mjs:13` | I |
| `startup-permissions.tsx`, `startup-permission-flow.ts`, `startup-permission-progress.ts`, `startup-browser-permissions.ts` | `feature-parity.mjs:615-633`, application manifest, Lemma (`startupPermissionsActiveCore`, `lateReadyNotice`), `permission-choices.mjs:41-47` (anchors `async function allow() {`, `const ticket = sequence.current, credentialId = …`), `startup-permissions-coordinator.mjs`, `startup-permission-completion.test.mjs` (hooks `./platform-plugins`, `connection-ui`), `browser-host-modal.test.mjs:21` (`/panel\.showModal\(\)/`), `startup-access-flow.test.mjs`, `quint-conformance`, `portable.mjs`, `product-identity` | T/S/I |

### 2.3 Renderer: `browser/`

| Source file | Pinned by | Kind |
|---|---|---|
| (all 121 files) | feature-parity (exact) | P |
| `alert-audio`, `audio-capture`, `browser-poll`, `browser-surface`, `calendar`, `calendar-store`, `calendar-deletions`, `camera-focus`, `clock`, `content-question`, `daily`, `deletion-recovery`, `dev-profile` | Application manifest lines and symbols: alert-audio 6404; audio-capture 3434; browser-poll 5145-5150, 5750, 5786, `surfacePollIdle`; browser-surface 332, 429, 5239, 5281-5285, 5678-5706, `setBookmark`, `bookmarks`; calendar 1869, 2004; calendar-store 1871, 2006, 3275; calendar-deletions 2008; camera-focus 7542-7562, `BrowserCameraFocus`, `cameraFocusTarget`, `applyConstraints`, `writes`, `epoch`; clock 97, 2531, 6403-6444, `BrowserClock`, `owns`, `ringing`, `soundTimer`, `alpha.browser.alarm-owner`, `ifAvailable`, `stopSound`, `retire`, `allowed`, `poll`; content-question 1232, 3053, 3402; daily 1870, 2005, 2530; deletion-recovery 2535; dev-profile 481, 5597, 5630, `browserDevProfile`. Services manifest: content-question 785, calendar-sync-fields 2342 | S/P |
| `browser-poll.ts` | `LemmaScript-files.txt:1`, `specs/lemma/README.md:159-160`, `browser-surface-presentation.mjs`, `browser-tab-lifecycle.mjs`, `test/browser-session-persistence.test.mjs` | P/T |
| `content-question.ts` | 8 importers, `hosted-digest-refresh.mjs`, `own-notice-question.mjs`, `photos-window.mjs`, `services/reading.mjs`, `scripts/test-own-notice-question.ts`, 3 host tests, 5 browser specs | P |
| `dev-profile.ts`, `development-*` | `test/dev-surface-gates.test.mjs`, `settings-truth.test.mjs` (read the source), `surfaces.mjs`, `contacts-session-replay.mjs`, `hosted-digest-refresh.mjs`, about 40 browser specs, `test/digest-occurrence-delivery.test.mjs:122-129` (re-exports and upstream regex) | T/P |
| `calendar.ts`, `clock.ts` | `test/locale-time-usage.test.mjs` (pending list), `calendar-view-rules.test.mjs` (clock, calendar-recurrence) | T |
| `domain-document.ts`, `json-domain-document.ts`, `domain-recovery.ts`, `preference-documents.ts`, `reminder-store.ts`, `notification-store.ts`, `hosted-results.ts`, `note-audio-store.ts`, `location-simulation.ts`, `documents.ts` | Application manifest; Quint `domain-document-creation`, `browser-deletion-poll`, `storage`, `browser-hosted-result-notice`; about 60 Playwright specs import them in-page (documents.ts about 35; keep its path); `calendar-adapter-fixture.mjs` (`openCalendarRecovery`); `scripts/fixtures/calendar-adapter.ts:83`; `scripts/storage-specs.ts` | P/S |
| `journal-retention.ts`, `edit-receipt.ts`, `notifications.ts`, `video-capture.ts`, `video-edit.ts` | `LemmaScript-files.txt` (`//@ verify` blocks); `browser-notification-clear.test.mjs` (slices notifications); `video-capture-limit.test.mjs` (strips types; also rewrites the `'./video-transcode'` specifier with `video-edit-review.mjs:15`); native manifest (files, video-capture, video-edit) | T/I |
| `voice.ts` | T2 host tests `browser-note-pending-audio`, `browser-streamed-speech`, `browser-voice-cancellation`, `browser-saved-transcript-audio`, `agent-always-local:256`; application manifest :3433; `notes-recorder-media-admission.mjs:13`; about 20 browser specs | T/P |
| `workflow-triggers.ts` | `LemmaScript-files.txt:7`, `workflow-triggers.dfy(.gen)` (`placeChanged`, `cursorThrough`, `triggerTickPlan`), `specs/lemma/README.md:172`, services manifest symbols, `trigger-cursor-replay.mjs:41`, `workflow-trigger-detection.test.mjs:4` | T/S |
| `workflow-trigger-runtime.ts` | `workflow-trigger-detection.test.mjs:153-160` (exact source including `private wake=()=>{this.blocked=false;this.held=false;this.calendarEvents.clear();`), `trigger-cursor-replay.mjs:32-40` (specifier replacement of `workflow-focus`, `platform-plugins`, `location-simulation`, `sensor-policy`, `saved-places`, `native-location`), services symbols `WorkflowTriggerRuntime`, `blocked`, `held`, `wake`, `position`, `watching`, `triggerState`, `workflowNeedsReview` | T/I/S |
| `workflow-notices.ts`, `workflow-history.ts`, `workflow-result-input.ts`, `workflow-urgency.ts`, `workflow-receipts.ts` | 13 specs import workflow-notices; `dev-workflow-history.spec.ts:13` reads the key `alpha.browser.workflow-notices.v1`; dialog-layout and dev workflow specs assert copy and labels | P/T |
| `password-provider.ts`, `device-controls.tsx`, `simulated-apps.ts` | `login-surfaces.test.mjs`, `audit-production-bundle.ts` strings, `vite.config.ts:28-29,79-80` (stub keys and importer allowlist), `scripts/storage-specs.ts` (device, location, password-provider, storage-usage) | T/P |
| `incoming-simulation.ts`, `simulated-workflows.ts`, `development-workflows.ts` | `locale-time-usage.test.mjs`, `workflow-reminder-midnight.test.mjs` | T |
| `register.ts`, `register-hosted-results.ts` | Import order is behaviour (NEW-IMPORT-ORDER) | — |

### 2.4 Renderer: `prototype/`

| Source file | Pinned by | Kind |
|---|---|---|
| (all) | feature-parity `:338-441` | P |
| `model.js` | U-R10 list: `home-views-model.test.mjs` (about 30 names, `registerView(` ranges, `\nvar PN = `, `PH_T`, `NT`, `CAL_PENDING`, wallet slice, `ctGroups`, `ctLetter`, `stDownloadModel`, `resetViewGlobals`, `everyBg/laterBg/stopBg`, `homeHint`, `this.secureAdmits(` ordering), `canonical-icons.test.mjs:17-21` (`var IC = {`…`\n};`, `IC.x = IC.x || "…";`, 148 keys), `notes-empty-close`, `native-popover-back`, `quint-back-dispatch` (`notesLeave`), `quint-fixture-busy-latch` (`latchPatch`), `final-ui-lifecycle.test.mjs:7` (`'var stPageFocus ='`…`'/* the prototype page'`), `chat-transcript-window`, `restored-history-limits`, `checkin-choice-presentation`, `toast-undo-offer`, `hosted-digest-panel` (`stTog`), `home-cards` (`showHeads` absence). Application manifest literals (`function latchPatch(st, keys)`, `pn*`, `PN.boot`, `PN.live`, `callWho`, `latchPatch(st, ["ag"])`, …) and symbols (`toastQueue`, `closeToast`, `scheduleToast`, `back()`, `shellNavigate`, `secureAdmits(secure, k)`, `openView(k, patch, chat, opts)`, `keepState`, `goHome(chat)`, `startVoice()`, `openSystemShade`, `simulatedShade`, `vreset(k, p)`, `getSnapshotBeforeUpdate`, `followVoiceTurn`, …); `surfaces.mjs`, `shell-core-fixture.mjs`, `settings-page-focus.mjs`, `voice-transcript-follow.mjs`, `accessible-toast-lifetime.mjs`, `VoiceTranscriptFollow.qnt`, legacy settings-nav, files-browser and chat-input checkers. 86 files mention model.js; 32 host tests read its text; about 35 Playwright specs | T/S/P |
| `template.html` | U-R11 list (about 51 files) plus `template-source.ts` markers `<!-- alpha-development-system-surfaces -->` and `<!-- alpha-development-rail -->` (4564, 4591); `accessibility-coverage.test.mjs:48-57` (at least 25 `data-alpha-subview`); `aosp-secure-camera-policy:59-62`; `home-shell.test.mjs:439-440`; `scanned-calendar-handoff:239-241,311`; `dc-lite-keys:66-67`; `assistant-settlement-delivery:166-171`; `calendar-settings-simplicity:23`; `automations-unified:129-132`; `fixtures/workflow-clock-admission.mjs:15,54-55`; `fixtures/workflow-execution-markup.mjs:6`; `fixtures/shade-row-custody.mjs:9`; `test/support/login-surfaces.mjs`; 16 application-manifest entries | T/P |
| `template-source.ts` | `dc-lite-keys.test.mjs:14`, `browser-reading-capability.test.mjs:157` (replace the dc-lite import line), `voice-in-chat-only.test.mjs:33` (regex on L10) | I/T |
| `dc-lite.js` | `template-style-cache.test.mjs:8` (whitespace-sensitive markers `'  function camel('`/`'  function props('`), `dc-lite-keys:12`, `chat-transcript-window`, `dev-surface-gates:19` (path stub), `fixtures/voice-markup.mjs`, `fixtures/workflow-execution-markup.mjs` (`DCLogic`) | T/P |
| `fixtures.js`, `fixtures.empty.js` | `vite.config.ts:21-22`, `fixtures-empty-runtime.spec.ts:15`, `shaw-ui-fixtures.spec.ts:73`, `model.d.ts:5,7`, README:11-38 (cites non-existent tests); value consumers `home-views-model`, `notes-view-defaults`, `history-initial-state`, `reset-wiring`, `agent-always-local`, `shell-core-fixture.mjs`, `surfaces.mjs` | P |
| `development-rail.html`, `development-system-surfaces.html` | `template-source.ts:3-4`, template markers, `theme-palette:10`, `voice-in-chat-only:30,33`, application manifest :8060-8064 (`data-alpha-development-lock-screen`), `quint-shell-screen:14`, `aosp-secure-camera-policy:63` | P/T |
| `agent-adapter.ts` | Application manifest (47 paths, 29 symbols), refinement `chat-attachments`, `composer-send`, `notes-coordinator`, `pending-action-recovery`, `previous-notes-availability`, `shell-coordinator`, `voice-transcript-follow`, legacy chat-input, notes-view and settings-nav, about 40 host tests and 5 fixtures, `test/support/attachment-restoration.mjs`, `notes-photos-list-focus.spec.ts`, `composer-send-ownership.test.mjs:15` (slice), `assistant-draft-dispatch.test.mjs:102` | S/T/P |
| `agent-calendar-adapter.ts` | Application manifest (7), services :3589,3637 (`serviceReadCache`), legacy google-connect :164, `scanned-calendar-handoff.test.mjs:16,337-344` (markers `const DAY=86400000;`…`export const nativeCalendarScope`), `browser-calendar-open-source.test.mjs:7-8` (markers `export const browserCalendarScope=`…`export const deviceCalendarScope=`), `calendar-connection-scope:6`, `home-cards:197,203`, fixtures `calendar-mounted-editor.mjs:11`, `canonical-calendar-draft-owner.mjs:16` | S/T |
| `browser-adapter.ts`, `calendar-adapter.ts`, `automations-adapter.ts`, `browser-camera.ts`, calendar drafts, `calendar-approval-*`, `calendar-days.ts`, `calendar-month-focus.ts`, `calendar-form-inputs.ts`, `browser-external-handoff.ts` | Application manifest (browser-adapter 70, calendar-adapter 36, automations-adapter 3, browser-camera 2, calendar-form-draft-adapter 6, calendar-edit-draft-adapter 3, calendar-approval-adapter 3, calendar-days 3, calendar-month-focus 2, others 1), services :4947-4981 (automations-adapter 9), native :441,3914-3938 (browser-camera 7), legacy :258; refinement drivers listed in app-10 pins; `LemmaScript-files.txt:8` (calendar-days); host tests in app-10 pins (`quint-calendar-agent-selection` mutates calendar-adapter source); `scripts/test-calendar-crud-review.ts:58`; `scripts/prepare-client-features.ts` (browser-adapter); fixtures `reminder-open-intent.mjs:9`, `scheduled-task-controls.mjs:10`, `browser-external-handoff.mjs:8`, `modal-scrim-chromium.mjs:13`; feature-parity :33-35 owner mappings | S/T/P |
| `camera-adapter.ts`, `canonical-calendar-drafts.ts`, `canonical-notes-*.ts`, `chat-overlay-motion-adapter.ts`, `clock-adapter.ts` | See U-R15/U-R16/U-R12. `canonical-notes-ui.ts`: `canonical-notes-webview-abort.test.mjs:37` (whole-file eval with injected imports), `notes-view-defaults:32-33`, `notes-recorder-controls:106`, `browser/canonical-notes.spec.ts:65,484,504`, Quint `canonical-notes-feedback.mjs:9`, `canonical-notes-view.mjs:23`. `canonical-notes-controller.ts`: application manifest :282,1615,1665,1716, `canonical-notes-controller.mjs:7,59`, `browser/helpers/canonical-notes.ts:15,21`. `clock-adapter.ts`: `scripts/test-clock-handoff-flow.ts:11,66` (vm eval with injected globals), application manifest :1268 | T/S/I |
| `contacts-adapter.ts` | Services manifest :3213-3243 (local names `epoch`, `loading`, `readable`, `available`, `editor`, `clear`), native :4373, `contacts-session-replay.mjs:13`, `telephony.mjs:334`, `contacts-adapter.test.mjs:5` and `comms-settings.test.mjs:48` (I) | S/I |
| `context-selection.ts` | `LemmaScript-files.txt:10`, `.dfy`, `specs/lemma/README.md:182`, application manifest :1231,3054, `native-adapter-activity:16`, `fixtures/shade-notice-question.mjs:9`, `scripts/test-own-notice-question.ts:5`, `context-selection.test.mjs` (also regexes Java and vendor sources), `AlphaNotificationsPlugin.java:51` comment | T/P |
| `data-adapter.ts`, `home-cards.ts`, `home-overview-cards.ts`, `home-shell.ts` | `final-ui-lifecycle:14-18`, `home-cards:95,105,164,291`, `home-views-model:337,357`, `wallet-disabled:45-48`, `home-overview-cards.test.mjs` (bundle + markup regex), application manifest :569,612,8252-8273 (HomeSurface, `selectHomeAgenda`), native :4538, legacy home-layout :357, `home-daily-overview.spec.ts:133,349,387`, `scripts/test-inbox-cloud-flow.ts:8`; home-shell: BackDispatch symbols `p.back`, `closeEdit`, `openAllApps`, `home-gesture.mjs:16`, `home-failure-notice.mjs`, `drawer-interaction-fixture.tsx:4`, `quint-back-dispatch:30`, `home-shell.test.mjs`, `template.html:31` | T/S |
| `files-index.ts`, `selection-adapter.ts`, `file-email-review.ts` | Application manifest :529,961,1739,1810,7311-7345 (`createFilesIndex`, `recentKey`, `record`, `revokeTree`, `RECENT_LIMIT`), `files-recent-index.mjs:12-22` (four exact sequences), `services/{scan,system-picker-visibility}.mjs`, `boundaries.mjs:28`, `photos-window.mjs:20`, `FilesAndSharing.qnt:1`, `files-index.test.mjs`, `quint-files-recent-index`, `scan-*`, `selection-ask-readiness:7,19`, legacy files-browser :309 | T/S/P |
| `inbox-cloud-adapter.ts`, `inbox-unsaved.ts`, `inbox-drafts.ts`, `inbox-provider-controls.ts` | Services symbols (`nextPageToken`, `seenCursors`, `generation`, `loadingMore`, `rememberList`, `restoreList`, `cachedListShown`, `invalidateList`, `firstPageRevision`, `loadedQuery`, `offlineStore`; `inboxUnsaved`, `editCoalescer`, `invalid`, `peek`, `retire`, `tooLarge`, `visibilitychange`), `inbox-list-paging-ports.mjs` (`  let loadingMore = false;`), `home-google-connection-source.test.mjs` (`    const googleConnected=`…), `context-selection:252-254`, `gmail-background-binding:39-43`, `quint-inbox-provider-drafts:33`, `native-secure-slots:86-87`, load-by-name loaders (`scripts/fixtures/prototype-script.ts` users, `inbox.test.mjs:25`, `inbox-operation-guards:110`, `inbox-draft-copies:63`) | S/T/P |
| `maps-adapter.ts`, `maps-chat-adapter.ts` | Services symbols (`readCloudMaps`, `onMapsConnectionChange`, `pendingHandoff`, …), application symbols (`installMapsChatAdapter`, `answered`, `current`, `hasMapsChoice`, `mapsChoices`, `mapGeneration`, `dropPlane`, `planeElement`, `planeBasemap`, `mapCopyright`, `retryNativeMap`, `mapRef`, `released`; :4299 pins the **dead** maps-chat-adapter), native `navigationLocation`; markers `  let mapCopyright='';` (`map-plane-ownership.mjs`), `  let returningToEvent…` (`maps-event-return.mjs`, legacy maps checker), `export function installMapsChatAdapter(` must be the last export (`maps-share-choice.mjs`), `const readCloudMaps = ` (`maps-connection.mjs`), `/** Presentation only:` (`maps-chat-markup.test.mjs`) | S/T |
| `local-speech-playback.ts`, `locale-time.ts`, `local-ocr.ts`, `media-review-controls.ts`, `keyed-list-focus.ts` | Application manifest :1452,4870-4903, native :3306-3333; `fixtures/cloud-voice-view.mjs:45`, `local-speech-playback.test.mjs:82`; I-stubs `./local-ocr` (7 sites), `./media-review-controls` (3 harnesses); `list-focus.mjs` (`return {\n    capture()`); in-page imports by URL; `locale-time-usage.test.mjs:64` | S/I/T |
| `mvp-features.ts` | `accessibility-coverage:14-16`, `aosp-image-capability:39-41`, `aosp-sms:253`, `wallet-disabled:25,42`, `dev-surface-gates:74-82`, `quint-view-admission:12,19`, `contacts-session-replay.mjs:12`, application manifest :7007-7042, services :3256-3268, `specs/quint/application/README.md:85`, `AccessibilityViewsInstrumentedTest.java:38` | P/T |
| `native-adapter.ts`, `note-*`, `notes-*`, `notifications-adapter.ts`, `own-notice-question.ts`, `phone-adapter.ts`, `phone-info-page.ts` | Listed in U-R16 and in app-15 pins (region markers, slices, application-manifest local names). `note-recorder.ts`: `LemmaScript-files.txt:11` (`recordingClockParts`), `fixtures/cloud-voice-view.mjs:59` (rewrites `export class`). `own-notice-question.ts`: `scripts/test-own-notice-question.ts:10` (text eval), `own-notice-question.mjs:27` (text concat) | T/S |
| `phone.css`, `prototype.css`, `scan-dialog.css` | U-R16/U-R21; `font-license:290-310` (exact Denton block); `theme-palette:10`; in-page CSS imports (`native-cloud-signin.ts:16`, `native-cloud-subscription.spec.ts:21`, `startup-access.spec.ts:11`) | T/P |
| `photo-library-adapter.ts`, `photo-viewport.ts` | `photo-library.test.mjs:15,170-172,217,235-236` (slices `'async function confirmReview'`/`'const visibleHost'`…`'mountedAgent = agent;'`, count of `port.(share|requestChange)(` = 2), `fixtures/photo-library-adapter.mjs` (Node import, forces `typeof document` guards), application :7403-7431, legacy :967, native :442, legacy photos-library :20, `photo-viewport.test.mjs:3`, feature-parity :21,36 | T/P |
| `reminder-adapter.ts`, `scan-*.ts` | U-R16 rows | T/S |
| `settings-adapter.ts`, `sms-adapter.ts`, `subview-accessibility.ts`, `system-shade.ts`, `telephony-*.ts`, `share-panel-adapter.ts`, `source-review-dialog.ts`, `system-bar-appearance.ts` | app-17 pins: settings markers (U-R16); sms: services (20 refs), `sms-send-replay.mjs`, `mms-compose-replay.mjs`, `observed-sms-adapter.mjs`, `image-sms`, `sms-incomplete-rows`, `aosp-telephony-views.spec.ts`; `system-shade-timeout.test.mjs` (slices `/** Reads what a pull started on.`, `export const SHADE_REQUEST_TIMEOUT`, `  p.expandAndroidShade = async function () {`); `telephony-attention-lifecycle.test.mjs` (I: `../runtime/aosp-image`, `./native-adapter`, `./mvp-features`, `../platform-plugins`); `telephony.mjs:147`; `share-panel-watch.test.mjs` (strip-types transplant); `notes-named-review.spec.ts`/`notes-query-review.spec.ts` (read and strip source-review-dialog); `system-bar-appearance.test.mjs` | T/I/S |
| `use-in-email-review.ts`, `video-edit-review.ts`, `voice-activity.tsx`, `voice-adapter.ts`, `workflow-*.ts` | app-19 pins. `quint-video-edit-review.test.mjs:14-18` rewrites the literal substrings `loaded=false;video.pause();updateControls();` and `busy=true;video.pause();updateControls();status.textContent='Saving video copy…';`. Workflow-adapter T2 transplants: `workflow-adapter-recovery.test.mjs:18`, `fixtures/workflow-execution-fixture.mjs:4`, `scripts/workflow-renderer-fixture.ts:18,131`, `workflow-adapter-fixture.mjs:25`, `workflow-local-source.mjs:82,147`. Services :480-481,537-538,627-676,3692-3722,3791-3833,3996-4051,4245-4311 | T/S |

### 2.5 Renderer: `runtime/`

| Source file | Pinned by | Kind |
|---|---|---|
| (all) | feature-parity `:442-633` (exact) | P |
| `connection-ui.tsx` | 98 source readers. Slice markers inside it: `export const connectionController` (23 files), `async send(` (19, including `composer-send.mjs`, `observation-turn-dispatch.mjs`, `mms-compose-replay.mjs`, `sms-send-replay.mjs`), `const hosted` (8), `export function ConnectionChooser` (6; `scripts/test-connection-history.ts:197`), `productionCloudSignInRequired`/`explicitSignedOutCloudEntry` (8 each), `async beginSignIn` (5), `recheckPlanOnReturn` (5, `cloud-plan-recheck.mjs`), `async cancelSignIn` (4), `residentPlanSettings` (4, `cloud-connection-notices.mjs`), `async initialize` (4), `async residentRedeem` (3, `plan-admission-ports.mjs`), `function ResidentRecoveryPanel` (3), `async configureLocal` (2), `function OwnKeyForm` (`chooser-direct-entry`), `function OwnProviderChoice` (`direct-provider-module-budget`), `async restartRecovery`/`cancelRecoveryReview()` (`recovery-restart-action`), `getAutomationsClient` (7). Application manifest (72), native :539,1347, legacy manifests, 216 test files plus dynamic imports, `audit-production-bundle.ts:30-63` copy markers | T/S/P |
| `connection-ui.css` | `cloud-connection-notices.mjs:17` (reads text), `scripts/fixtures/{cloud-delegation,hosted-live-source}/entry.tsx` (sibling path), application manifest :2807 | T/P |
| `cloud-*.ts(x)`, `subscription-entitlement.ts`, `cloud-deployment.generated.ts` | app-21 pins: application symbols (`delegationCancelStep`, `CloudDelegationPanel`, `run`, `callback`, `recover`, `cancelPending`, `signInFailureMessage`, `cloudVoiceServiceLimit`), services and native manifests (`restoreSavedSignIn`, `savedSignInRecoveryStatus`), legacy sign-in checker; `quint-delegation-receiver.test.mjs:15-21` and `connection-step-contracts.test.mjs:12,140` (slice `export function delegationCancelStep(`…`export function CloudDelegationPanel(`); `subscription-entitlement.test.mjs:70,126,154-161` (import lists and the regex `fundingRefusedReply(cloudServiceName(cloud.environment))`); `white-label-copy:14,35`; `LemmaScript-files.txt:14-15`; `scripts/cloud-deployment.ts:85` (writes and checks the generated file); `calendar-linked.mjs` (fakes `googleCalendarSync`); `google-*.mjs` (call `initiateGoogle(`); tsconfig/vite alias entries for `subscription-entitlement` | T/S/P |
| `alpha-client.ts`, `accessibility-timeout.ts`, `aosp-image.ts`, `always-on-listener.ts`, `canvas-geometry.ts`, `aosp-telephony.ts`, `action-message-presentation.ts`, `app-speech.ts`, `automations-protocol.ts` | Manifest symbols listed in app-20 pins (`AlphaClient`, `run`, `send`, …; `canvasGeometry`, `keyboardFreeHeight`, `WIDE_CANVAS`, `isEditing`; `createAospTelephony`, `normalizePhoneNumber`, `reviewMms`, `MMS_MAX_ATTACHMENTS`; `mapsChatText`, `SHARE_CHOICE`; `retirement`, `speakAppText`; `AutomationOutcomeError`, `mergeAutomationRows`). Path-keyed esbuild stubs `runtime/aosp-image`, `runtime/aosp-telephony` (image-sms, phone-adapter, quint-phone-recents, quint-view-admission, sms-incomplete-rows, telephony-attention-lifecycle, `*-replay.mjs`). `wallet-disabled.test.mjs:22-27` rewrites the aosp-image import. `voice-in-chat-only:35,41`. `app-speech-route.test.mjs:6`. `canvas-geometry.dfy`. Android `AlphaAssistActivity.java:19` mirrors `INVOCATION_EVENT` | S/I/T |
| `agent-calendar.ts`, `calendar-approval*.ts`, `calendar-*` linked/sync, `clock-*` | `agent-calendar-refresh-state.test.mjs:7,11-13`, `canonical-maps-return:6`, `upstream-owner-gate-compat:89-90,147-149`, `calendar-linked-store:336`, `calendar-sync-settings-navigation:8`, `native-secure-slots:97,125` (`clockHandoffSlot`), Quint `scheduled-snooze-admission.mjs:12`, `automation-request-settlement.mjs:17`, `services/calendar.mjs:10,18`, `composition/ports.mjs:58`; Playwright in-page imports `/src/runtime/{calendar-availability,clock-agent-review,clock-contract,calendar-sync-host,calendar-sync-settings,calendar-linked-store,calendar-linked-storage}.ts`; scripts `test-connection-history`, `test-agent-calendar-mutation-flow`, `test-calendar-availability-*`, `test-calendar-sync-provider`, `test-clock-handoff-flow`, `test-notes-documents-browser`, `storage-specs`, `prepare-client-features` | T/P |
| `google-*.ts(x)`, `gmail-*.ts`, `deletion-*`, `digest-inbox.ts`, `hosted-background.ts`, `dock-clearance.ts`, `error-boundary.tsx`, `crash-log.ts`, `development-cartesia-*` | app-23 pins: `LemmaScript-files.txt:16` (gmail-mailbox `newestWithinBudget`, `sizeFrom`); refinement harness list; `fixtures/google-account-panel.mjs` (slices google-connection-ui); about 20 T1/T2 host tests; `scripts/prepare-client-features.ts` (crash-log, device-record-presentation, dock-clearance); storage keys `alpha.crash-log.v1` (`recovery-ui.mjs:73`), `alpha.google-calendar-selection.v1` (`one-calendar.spec.ts:32`); `product.gradle` comment tying `ELIZAOS_APP_LINK_HOST` to `GOOGLE_WORKSPACE_CALLBACK`; `CrashJournalTraces.java` | T/S/P |
| `hosted-*.ts(x)`, `image-*`, `inbox-*`, `inline-modal.ts`, `local-agent*.ts`, `maps-event-return.ts`, `media-copy-intent.ts`, `mock-admission.ts`, `modal-inert.ts`, `managed-service-routes.ts`, `live-*` | app-24 pins: manifest line lists; refinement harness list (`agent-calendar-event-return.mjs:8,50,223` imports `mapsEventOriginOf` by name); `LemmaScript-files.txt:17-19`; module-stub key `'inbox-attachment'` (`inbox-draft-copies:26`, `inbox-operation-guards:19-20`, `scripts/test-inbox-multiple-drafts.ts:20`); `inbox-operation-guards` asserts `receiptReads.length`; `vite.config.ts:31-32` (mock-admission stubs); `browser-cloud-dev-bridge.ts` imports `mapsTilePath`; `storage-specs.ts` (media copy key); Playwright in-page imports (local-agent 10, inbox-local-store 12, hosted-digests 8, …) | S/I/T/P |
| notes, owner, reminder, share, telephony, view-focus, text-scale, toast-layer, voice and workflow files (n–z) | app-25/app-26 pins: refinement harness list (`modal-toast-forwarding.mjs:11,156` and `screen-focus-ownership.mjs:12,168` read the variable `installed`); `LemmaScript-files.txt:20` (resident-recovery), voice-states (`deniedSettingsChoice`), workflow-device-contract (`readyTapStep`, `tapRecheck`); T2 tests `voice-completed-action-context.test.mjs:6-9` (view-navigation slice by tab-indented anchors `'\tmetadata(context:'`…`'\n\tcapture('`), `voice-prepared-navigation:12-13` (whole-file eval), `voice-selection.test.mjs:20,36,136-138` (vm transplant; asserts no `localStorage` in the source), `diagnostics-export.test.mjs:220-221` (`const voiceTimingRoutes`), `voice-denied-recovery:3`, `scripts/workflow-renderer-fixture.ts:36-39` (workflow-intents vm transplant); scripts `test-calendar-availability-flow.ts` (phone-context), `test-calendar-crud-review.ts` (reminder-creations); Android mirrors `NOTES_TRASH_SLOT`, `NOTES_TRASH_MAX_BYTES`, `NOTES_TRASH_RETENTION_MS`, `RendererCredentialSlots.java:14` | T/S/P |

**Persisted values that must stay byte-identical (G5), from app-26 and others.**
- Storage keys:
  - `alphaphone:voice-timing:v1`
  - `alphaphone:realtime-voice-timing:v1`
  - `alpha.workflow.pending.v1:`
  - `alpha.browser.workflow-intents.v1:`
  - `alpha.startup-permissions.v1`
  - `alpha:startup-permission-walkthrough:v1`
  - `alpha.connection.selection.v1`
  - `alpha.maps.saved-places.v1`
  - `alpha.files.recent.v1`
  - `alpha.files.open.v1`
  - `alpha.notes-deletion-claim.v1:`
  - `calendar-creation-form`
  - `calendar-inline-edit-form`
  - `alpha.browser.reminder-deletions.v1` (rename only under a D1 reset, Q-DEV-4)
- Slot names:
  - `notes-records:v1:device` (envelope `currentRaw`)
  - `note-origins:v1:device`
  - `native-calendar-sync:v1`
  - `hosted-background:v1:active`
- Export format: `alpha-voice-timing-v1`, read by `scripts/aggregate-voice-latency.ts:85`.
- Events: `alpha:startup-permissions-reopen`, `alpha:workflow-intents`, `alpha:*-document-changed`.
- BroadcastChannel: `alpha.workflow-intents`.
- Wire: `workflowProtocol` 1/2/3, the lifecycle route and its error code.

### 2.6 Android main source (`android/app/src/main/java/ai/alphacompute/alphaphone/`)

| Source file | Pinned by | Kind |
|---|---|---|
| (all 131 classes) | feature-parity; most are in `specs/quint/native/manifest.json` (33 of the android-14 set, MainActivity 35 pins); javac host tests via `test/fixtures/*Test.java`; Quint `*Traces.java` compile lists | P/S |
| `AlphaLocalAgentPlugin.java` | 61 host tests (android-13 pins); about 30 platform stubs declare its members; about 42 specs files; `test/fixtures/app-update-jvm/.../AlphaLocalAgentPlugin.java`; `scripts/test-android-notification-device-slot.ts` | P/T/S |
| `AlphaDevicePlugin.java` | Native manifest (7); `runtime-update-pause.mjs:23,26`; `update-barrier.mjs:30` (comment marker `' // End of updater methods for host replay.'`); `system-bar-appearance.test.mjs` (body regex); `product.gradle`; `settings-adapter.ts` comments :233,667 | T/S |
| `AlphaCredentialStore.java`, `AlphaConnectionPlugin.java`, `AlphaCloudSignInPlugin.java` | About 30 Quint platform stubs declare `class AlphaCredentialStore`/`AlphaConnectionPlugin` members; `cloud-sign-in-flow.test.mjs:31,89-90` (`DELEGATION_SCHEME`/`DELEGATION_HOST` line, `DelegationCallback.admit(...)` text); `cloud-deployment.test.mjs:42` (slices `PENDING_SLOT`…`receiptSl`); `native-secure-slots.test.mjs:167-168` (`NOTE_ORIGINS` lines; also the androidTest regex `android-instrumentation-runner.test.mjs:641` `"note-origins:v1:device"`) | T/S |
| `AlphaBrowserPlugin.java` / `AlphaBrowserStores` | `browser-site-permissions.test.mjs:21` (`BrowserSessionStore(...sealer(SESSION_KEY_ALIAS,2000000))`), `browser-construction:28` (copies the `BrowserTabHostConfig` builder text), `browser-tab-host-identity:33` | T |
| `AlphaAssistActivity`, `AlphaPowerVoiceActivity`, `AlphaQuickSettingsTile` (D7: stay) | `always-on-listener.test.mjs:61` (`sense.recordInvocation(isProtectedPowerEntry() ? null : caller);`), `power-sense-entry`, `apk-alpha-power-policy`, `apk-alpha-tile-policy`, `alpha-system-entry`, `launcher-orientation`, `voice-in-chat-only`, `proguard-rules.pro`, `scripts/apk.ts:89,145`, `stage-aosp.ts:202`, Quint assistant-entry family | T/P |
| `AlphaDeviceAppsPlugin`, `AlphaContactsPlugin`, `AlphaTelephonyRoles`, `MainActivity` | `aosp-image-capability.test.mjs:139-140,222,238-264,254` (`static void sync\(Context context\) \{\}`), `:256` (MainActivity call order); `gesture-zones-single-instance.test.mjs` (exact lines) | T |
| `AlphaGmailPlugin`, `GmailBackground*` | `gmail-background-binding.test.mjs:18-46`, `gmail-lifecycle-custody:4`, `GmailBackgroundTraces.java` (reflects on the field `io`) | T |
| `AlphaFilesPlugin` | `files-browser.test.mjs:245-379`, `files-legacy-storage:11`, `files-storage-refusal:10`, application manifest :960 | T |
| `AlphaHostedResultsPlugin`, `HostedResultNotices` | `native-deletion-admission.test.mjs:77` (method markers), `context-selection.test.mjs:231`, native manifest :2317,2808 | T/S |
| `AlphaNoteAudioPlugin`, `AlphaNoteRecorder`, `AlphaVoiceCloudPlugin` | `notes-recorder.test.mjs:312-607`, `notes-deletion-lease:16` (slices and regexes the renderer constant), `note-source-references:28-35`, `streaming-speech`, `cloud-voice-profile`, `live-voice`, `power-cold-native-pin:47-131`, `NativeNoteRecording.qnt` | T |
| `AlphaKeyboardDictationService`, IME XML | `keyboard-dictation.test.mjs:14-16,64`, `aosp-fresh-presets.test.py:93,96-97`, `apk-keyboard-dictation.test.mjs:13`, `scripts/apk.ts:92,171-177` | T/P |
| `AlphaMediaConfig` | `owned-captures-legacy-path.test.mjs` (re-declares the builder) | T |
| `AlphaPhotosPlugin` | `native-plugin-teardown.test.mjs`, `context-selection.test.mjs` (read the text), `photos-debug-diagnostics`, `photo-library-permission-owner` | T |
| `CloudDeployment.java` (generated) | `scripts/cloud-deployment.ts` (generator), `cloud-deployment.test.mjs` | P |
| `release/DataIntegrityProvider.java` | `pilot-update-export.test.mjs:54-70` (`HmacSHA256`, `List.of("cache", "code_cache")`, unspaced `){throw new UnsupportedOperationException`, manifest provider attributes), feature-parity :175, `scripts/apk.ts:101` | T |
| WorkManager workers (`GmailDeliveryWorker`, `HostedDeliveryWorker`, `DeletionWorker`, `AlphaNoteAudioPlugin$NotesTrashBackstopWorker`) | Persisted in each installed WorkManager database (G5); `proguard-rules.pro` (HostedDeliveryWorker, IsolatedPdfService, AlphaNotificationListener) | installed identity |
| Plugin worker fields / overrides | `plugin-worker-guard.test.mjs:23-30,56-57` (stale `AlphaFilesPlugin.worker`), `native-plugin-teardown.test.mjs:113,272-332,366` (counts executor/timer calls, override lists) | T |
| Both `AndroidManifest.xml`, `res/` | About 30 tests regex `src/main/AndroidManifest.xml`. Standalone manifest: `android-host:73`, `aosp-image-capability:163-172,236-240`, `aosp-sms:244-249`, `launcher-orientation:17`, `source-snapshot.ts:8`. testMocks manifest: `android-host:93`, `cloud-sign-in-flow:78-92`, `login-surfaces:230-242`, `apk.ts:120`. `alpha-system-entry.xml`: `alpha-system-entry.test.mjs:15`, `android-host:160`. Notification icon R ids: `alpha-system-entry:17,107`, Quint assistant-entry, gmail-background, source-renewal, navigation-service platform files, `WorkflowNoticeTraces.java`. `drawable/app_icon.xml`: `provision/source-inputs.json:77-90` (sha256 `b3d0e893…`), `stage-alpha-os-branding.py:133-136`, `aosp-fresh-presets.test.py:102`, provision README:50. `mail_attachment_paths.xml`: native manifest :1888, `reviewed-copies.mjs:17`. `network_security_config`: upstream `apk-distribution.mjs:120-122`. `custom_url_scheme` is read via `getIdentifier` (invisible to grep). `AppTheme.NoActionBar` is applied by Capacitor `BridgeActivity` | T/H/P |

### 2.7 androidTest

| Source | Pinned by | Kind |
|---|---|---|
| Every class | Registry (§2.1) plus campaign scripts. Per-class line numbers are in the chunk pins of android-04 … android-11 | R |
| `AccessibilityViewsInstrumentedTest` (VIEWS), Lifecycle, HomeRole, `TalkBackOrder` | `accessibility-coverage.test.mjs:163-178` | T |
| `AccessibilityBounds` | `accessibility-visible-bounds.test.mjs:8,13` (javac by path) | P |
| `BrowserIsolatedReading`, `BrowserPageQuestion`, `JourneyJ05` | `browser-reading-capability.test.mjs:58-61` (probe text), `android-instrumentation-runner.test.mjs:628-643` (regex over JourneyJ05 for public hosts) | T |
| `BrowserWebFeatures` | `browser-tab-host-identity.test.mjs:60-75` (regex over every androidTest source) | T |
| `BrowserFlow`, `BrowserReadingNavigation` | `instrumentation-outcome-status.test.mjs:4-5,16,19` (status keys `browserFlowSearch`, `browserReadingProvider`) | T |
| `ConnectionRoutes`, `Hosted*` | `android-instrumentation-runner.test.mjs:430-473,536-547` (`!BuildConfig.ELIZA_DEV_ALLOW_TEST_MOCKS`, URL literals, `"Connection request failed"`, `"VALIDATE"`, `isSystemUser()`) | T |
| `NativeVoiceLatency` | `native-voice-latency.test.mjs:148-149` (line 134 verbatim), `scripts/native-voice-latency*.ts` status keys | T |
| `LocalSpeechInstrumentedTest` | `scripts/ci/speech-candidate.ts:32` (`CANONICAL_TEST` path), `ci-emulator-evidence.test.mjs:245` (gate regex) | P/T |
| `NotesCapacityFixture` | `notes-capacity-fixture.test.mjs:12-13` (javac) | P |
| `PhotosCatalogOrder` | `android-instrumentation-runner.test.mjs:177-184` (regex at l.44) | T |
| `PasswordVault*`, `PasswordBrowserFill` | `android-instrumentation-runner.test.mjs:551,569-587` (exactly three `confirmDeviceCredential();` lines, `type("Add website", website)`, `.example.invalid", (typedSecret|null))`, fixture `set = true;…catch (Throwable failed) { close(); throw failed; }`, `systemui:id/lockPassword`, `isFocused()…field.setText(PIN)`) | T |
| Any androidTest `.java` | `gesture-zones-single-instance.test.mjs:34-39` scans for `['pointerdown',50]` | T |
| `StartupDocumentProbe` | `test/browser/mock-readiness.spec.ts:4-7`, `scripts/ci/affected.ts:13` (`evaluateJavascript("…",value` text) | T/P |
| `StorageCategories` | `files-browser.test.mjs:261-262` | T |
| `ResidentStreamTransport`, `ResidentWorkflowCrash`, `ResidentService`, `ResidentEgressRedaction`, `PrivateResidentSocket` | `scripts/ci/resident-native.py:39-42,59,85-100` (frozen digest, method and arg names, proof JSON keys), `resident_crash_diagnostic.py:87` (`missingModelRequest`), `test/resident-crash-diagnostic.test.py`, `scripts/android-resident-instrumentation.ts:2,23-24` (proof files) | R/T |
| `trusted-worker.mjs` (asset) | `trusted-worker-prelude.test.mjs` (marker `// Instrumentation-only trusted harness.`), `resident-native.py:39-42` (SHA freeze), `ResidentWorkflowCrashInstrumentedTest.java:348`, comment at :377 | T/H |
| `ShareReceiverActivity`, `WorkflowNoticeProcessRunner`, `PasswordFillFixtureActivity` | `androidTest/AndroidManifest.xml` (label "Alpha share verification" read by `ShareFlowAssertions:71`, `PhotosMultiShare:50`; the `:workflowNoticeTest` process), `scripts/native-test-fixture.ts:154`, `test-calendar-regression.ts:107` | T/P |
| Renderer copy pinned by instrumentation | Sign-in strings in `InboxFixtureSignIn.DRIVE_*`; Maps `NOT_CONNECTED`; `'Saved locally on this device'`, `'Document selection cancelled. Nothing imported or exported.'`, `'Saved.'`; cross-app UI strings `Posted `, `Cleaned `, `Tapped … count 1` | T |

### 2.8 AOSP packets, Android build modules and records

| Source | Pinned by | Kind |
|---|---|---|
| `aosp/branding/Android.bp`, `branding.mk`, `overlay/.../config.xml` | `aosp-cloud-power-defaults.test.mjs:5-34` (AlphaFrameworkOverlay block, `PRODUCT_PACKAGES +=`), `stage-alpha-os-branding.py:52-113` | T/P |
| `core-launcher/*` | `manifest.json` `afterSha256` pins the three Java files byte for byte (regenerate with `prepare.py --fetch`); application manifest :3945-3947,3990-3991; `os-defaults.mjs:13,148,153-162,175` (hashes, slices `    private void grantAlphaSharedStorageDefault(`, `AlphaQsDefaultsPolicy.VERSION==3`) via `quint-os-application-refinement.test.mjs`; `os-source-staging.mjs`; `stage-alpha-os-branding.py:191` | H/T |
| `system-entry/*`, `power-voice/*`, `PROVENANCE.json` | `system-entry/manifest.json:6` = patch sha `58e75d2a…` (repeated in `power-voice/manifest.json:7`, `PROVENANCE.json:10,59`); `:92` product-overlay sha; `test_native_plan.py`, `test_hidden_handle.py:5-6` import `portable_tools`; `core-launcher/README.md:13`; `aosp-fresh-presets.test.py:79-80` | H/P |
| `provision/*` | `source-inputs.json:79,81` hash `app_icon.xml` and `logo-mark.svg` (editing either breaks staging); `fetch-alpha-os-preset-inputs.py:10`; `os-provisioning.mjs:10,79-85` (line anchors in AlphaWelcome, reflection on `Completion.waiting/generation`, `R.string.*` harvest); `os-source-staging.mjs:102-103`; application manifest :3968-3971; `stage-alpha-os-branding.py:8,27-48,126-130` (injects `AlphaFreshPresets.shouldRunWelcome`, `AlphaWelcome.show`, `AlphaAppearance`); `aosp-fresh-presets.test.py` (literal text in `AlphaFreshPresets.java:63/67`, `AlphaWelcome.java:96`) | H/T |
| `hidden-navigation-handle/*`, `home-back-keyboard.patch` | `test_hidden_handle.py:65,104,116` (slices by Javadoc; literal patch line) | T |
| `android/aosp/product.json`, AOSP JSON records, `pixel10a-composition.json` | `stage-aosp.ts`, `aosp-product-lock.test.mjs:25-81` (field regexes), `verify-apks.test.mjs:37`, upstream `brand-config.ts` (requires every field), `aosp-pixel10a`, `pixel10a-source`, `always-on-listener`, `aosp-capabilities`, `aosp-secure-camera-policy`, `aosp-release-signing`, `aosp-retain-known-good`, `owner-sign-aosp-release-edges`, `enroll-release-keys`, `os-update-enrollment`, `aosp-staging-patches:50-62`, `signing/alpha-key-manifest.json`, `scripts/enroll-release-keys.ts` (writes the digests) | T/H |
| `android/app/product.gradle` | `update-channel-gradle.test.py:10-11` (T2 slice), `one-runtime-profile:54-57`, `android-host:105-110`, `app-update:95`, `google-workspace-return-native:87`, `cloud-sign-in-flow:78`, `release-signing:177`, `login-surfaces:242`, `android-app-abi-selection.test.py:29`, `gradle-verification.test.mjs:18` + `scripts/gradle-verification.ts:55`, `source-snapshot.ts`, `android-host.ts`, `consumer-host.json:114` | T/P |
| `cloud-deployment.generated.gradle` | `scripts/cloud-deployment.ts:87` (writer, `--check` in verify), `source-snapshot.ts:11`, `account-sheet.mjs:78` | P |
| `proguard-rules.pro` | `consumer-host.json:77`, `source-snapshot.ts:20` | P |
| `android/consumer-host.json` | `android-host.test.mjs` (paths, module list, residentHost), `alpha-system-entry.test.mjs:99-127`, native and services manifests (digests), 8 Quint native refinement files, many scripts | P/H |
| `local-speech/build.gradle`, `sense/build.gradle` | `one-runtime-profile.test.mjs:54,67-68` (`if \(unpackaged && !nativeOutput\.exists\(\)\) \{`, `tasks\.register\('verifySpeechInputs', Exec\) \{\s+workingDir`), `sense-packaging-ndk.test.mjs:14-20`, `quint-indicator-provider.test.mjs:28-33`, native manifest :1581 | T |
| `notification-fixture`, `private-peer-fixture`, `video-fixture` | `android-host.test.mjs:119,122` (module arrays), `gradle-verification.test.mjs:139,153-155` + `gradle-verification.ts:32-38,62`, `source-snapshot.ts:21`, `build-private-peer.py:8`, `resident_fixture.py:26`, `resident-native-ci-admission.test.mjs:47,51`, `affected.ts:14`, `native-video-library-change.spec.ts:7` | P |
| `upstream-native-sources.json` | `prepare-patched-native.ts:9`, `quint-lib.ts:119`, about 22 native refinement `.mjs` (`nativeManifest`), native and services manifests, `consumer-host.json:119` | P |
| `voice-host/qualified-voice-host.json`, `paradee-voice/asr-inputs.json` | About 14 scripts, 2 workflows, `licenses/`, generated third-party notices, 11 tests; `voice-host.ts:18,215-227` | P/H |
| `embedding-host/build-toolchain.json`, `qualified-host.json` | `upstream-pin-guard:104`, `strict-build-inputs`, `embedding-host-admission:156`, `android-build-path:239`, `embedding-artifact-inputs.test.py`, `sbom`, `ci/embedding-artifacts.py`, `ci/hosted-native-inputs.py` | P/T |
| `release-signer.json`, `signing/*` | `enroll-release-keys.ts:41`, `release-custody-proof.py:114-116`, `sign-os-ota.py:55,217,223`, `stage-os-update-enrollment.ts:30`, `README.md:292` (`ota-tools.json` `reviewedTargets: []`) | H/P |

---

## 3. New patterns proposed by reviewers (deduplicated)

These are candidates for `PATTERNS.md`. Each lists the nearest existing ID, the treatment and examples. Entries that
several chunks raised independently are merged; the "Raised by" column lists them.

### 3.1 Tests and formal artefacts

| ID | Pattern | Nearest | Treatment | Examples | Raised by |
|---|---|---|---|---|---|
| NEW-TEST-AS-HELPER | **Test classes used as helper libraries.** One `@Test` class is instantiated or called statically to reach another's helpers. JUnit `@Before` does not run, and helpers have side effects. | D3 for tests | Extract plain driver classes (U-L13). A test class is never a dependency. | `new BrowserFlowInstrumentedTest()` in 11–12 classes (`child()` also clicks "Not now", which makes `assertEquals("null",browser.child("true"))` opaque); `new SelectedDocumentInstrumentedTest().selectDocument/fixtureBytes`; `ChatContinuityInstrumentedTest.alphaIsHome`; `AccessibilityViewsInstrumentedTest.fontScale/shell`; `WorkflowNoticeProcessDeathInstrumentedTest.killMainWithoutTasks`; `RendererRecovery*`, `Rotation*`; BrowserPageQuestion as JourneyJ05's driver | android-04, -05, -06, -08, -10, -16 |
| NEW-PER-METHOD | **Reachability checked per class, not per method; gates nobody passes.** A class counts as reachable if any method runs, so methods gated on an argument that no runner, campaign or script supplies are permanently skipped yet look registered. | T9 | Extend `android-instrumentation-runner.test.mjs` to check every `getArguments().getString(...)` gate against the runners. Delete or wire each dead method. | Gates `notesSecureMigration`, `photoLibraryGrantTest`, `photosForeign*`, `posterJourney`, `reminderAgentPhase`, `noticeQuestion`, `publicCloudProbe`, `ownedCloudRead`, `localRemote`, `resetFixture*`, `mapsLatitude`, `mapsRegional`, `liveAgent`; methods `CameraFlow.cameraDeniedForever…`, `CalendarAgentCrud.insertHandoff…`; `ConnectionInstrumentedTest#localDraftCompareExchange…` only under `--all`. A shared gate covers different classes (`calendarRange`). | android-05, -07, -08, -09 |
| NEW-DISABLED-COMPONENT | **Tests that launch a disabled manifest component.** Registered, campaign-listed classes launch an `enabled="false"` component with no enabler, so they can only fail on the shipped APK. | A4/T9 | Under D7, list as `NOT_RUN` with the reason. | `AssistantInstrumentedTest`, `AssistantResidentReuseInstrumentedTest`, the PhotosTrash two-Activity race launching `AlphaAssistActivity` | android-04, -09 |
| NEW-STALE-RARE | **Stale expectations in rarely-run instrumentation.** Classes reachable only through `--all` or campaigns drift from the product. | T9 | Each kept class needs one recorded green run on the current build. | `NotesDocumentInstrumentedTest.productRefusal` expects `unsupported` from an ungated `exportText`; `PublicCloudTransportProbeInstrumentedTest:13` expects `BALANCE`, which `AlphaConnectionPlugin.RequestOperation` no longer has | android-07, -12 |
| NEW-RUNNER-COUNTS | **Runner-pinned method counts.** A runner encodes each class's expected test count, so deleting a duplicate needs a runner edit. | T10 | Prefer selecting by method name, not by count. | `scripts/test-calendar-regression.ts` `calendarFlow,5`, `calendarAvailability,4` | android-05 |
| NEW-UNREAD-EVIDENCE | **Evidence nobody reads.** Instrumentation writes result bundles, JSON, WAVs or screenshots that no runner pulls or parses. | B5 | Delete unless a runner parses the key (grep `INSTRUMENTATION_RESULT: <key>`). | 4 of 5 `addResults` keys in android-11; `speech-no-network-evidence/result.json`; `/sdcard/Download/alpha-accessibility-fixture-*.png`; `speech-pipeline-trace-*`; `note-read-aloud.json`; LocalSpeech WAVs; the CalendarExternalEditor receipt | android-10, -11, -05 |
| NEW-UPSTREAM-ENGINE-TEST | **Tests of upstream engines or pure functions in the product repo**, often by reflection into private fields. Alpha supplies only a config; the subject is upstream, and an upstream rename breaks them only at emulator runtime. | T5 | One `BrowserHostProbe` owns all remaining reflection; ask upstream for a package-visible accessor; move pure-upstream tests upstream (U-T2). | Nine Browser* classes reflect on `BrowserTabHostPlugin` (`presentedId`, `tabs`, `namespace`, `retiredProfiles`, `downloads.listing`, …); PhotoReplace, PhotoFilter, PhotosCatalogOrder, PhotosLibrary; SystemFacts, SystemShade, CrashLog, StorageCatalog, SessionSpeech; `CloudSignInPlugin$Attempt`; `NotificationMirrorListenerService.events` | android-04, -08, -10, -06 |
| NEW-SLICE-ANCHOR-MEMBER | **Members kept alive only as slice anchors or test seams.** A method stays because a T2 test uses its signature as a slice end marker. Installer return values, disposers and options exist only for a formal harness. | D7 | Re-grep for orphaned members after each T2 purge. Port the harness, then delete. | `cancelRecoveryReview` in connection-ui; `camera-adapter.ts:1735` disposer used only by `photos-window.mjs:131` (110 `disposed` fences); `installHomeShell` `favorites`/`storage` options and `return shell` | app-22-p2, app-11, app-12 |
| NEW-IMPORT-SPEC-PIN | **Import-specifier and identifier pins.** Tests and Quint harnesses rewrite *another* file's import line by literal text, stub modules by exact specifier, or pin local variable names in manifest `symbols`. Renaming, re-pathing or aliasing silently un-stubs them or breaks `verify`. | T2/T10 | Grep manifests and stub maps before a rename or alias. Port to imports. | `'./video-transcode'`, `import {iconStyle} from '../icon-style';`, `'workflow-focus$'`, `./runtime`/`./cloud-session` stubs in `cloud-maps-session.test.mjs`; manifest locals `pending`, `seen`, `previous`, `latest`, `owed`, `activeOffer`, `hiddenDuringSpeech`, `loadingMore` | app-07, app-08 |
| NEW-SUBSTRING-MUTATION | **Formal or mutation tests that rewrite exact source substrings.** They block the D9 formatter commit. | T10 | Port to a behavioural seam, or delete, before formatting. | `test/quint-video-edit-review.test.mjs` `.replace('loaded=false;video.pause();updateControls();')` | app-19 |
| NEW-DEV-PROOFS | **Formal verification of dev-only code.** Proof and model upkeep is spent on modules that production stubs out. | P6/T10 | Retire the proofs and models with the simulator, or exclude dev-only modules from the formal ledger. | `workflow-triggers.ts` (Lemma), `workflow-trigger-runtime.ts` (Quint `trigger-cursor-replay`); `pn*` phone-call simulation pins | app-07, app-14-p1 |
| NEW-PROOF-TWIN | **The proof covers a twin, not the running code.** | B3/T10 | The production path calls the proved function, or the proof and test go. | `mergeDeviceFacts` is proved; `settings-adapter.ts refresh()` runs an inline variant with different text-size semantics | app-17 |
| NEW-DEAD-MANIFEST-PIN | **Manifests pin symbols in dead files.** The proof covers code that never runs. | A7/T10 | Check that every manifest `sources` path is reachable from an entry point. | `specs/quint/application/manifest.json:4299` pins `installMapsChatAdapter` in the unimported `maps-chat-adapter.ts` | app-13 |
| NEW-TEST-STOCK | **A test asserts "stock" while a sibling file changes the value.** A T1 variant that gives false assurance. | T1 | Delete it, or assert on built output. | `test/aosp-cloud-power-defaults.test.mjs` checks one RRO file while another file in the same directory sets the camera gesture | android-02 |
| NEW-PIN-DRIFT | **Pin lists that drift from code.** Regex pin tables in tests rot silently and pass vacuously. | T1 | Supports deleting T1 tests. | `test/plugin-worker-guard.test.mjs:23` names an `AlphaFilesPlugin.worker` field that no longer exists | android-13 |
| NEW-STALE-NAME | **Misleading test and fixture names after behaviour changed.** They confuse the A1 legacy audit. | D11 | Rename. | `expiredOwnedDeletionCannotRestoreBeforeMigration` (no migration involved); `NotesSecureFixture.evaluate` used as the generic evaluator; `legacy-worker-client`, `synthetic-legacy` | android-06, -07 |
| NEW-UNUSED-PARAM-FWD | **Unused-parameter forwarding helpers.** | D4 | Drop the parameter (about 70 call sites). | `eval(BoundedActivityScenario<MainActivity> scenario, String js)` ignores `scenario` (DailyApps, Flow, SelectedDocument, Shell) | android-06, -10 |
| NEW-DUAL-BUILD-FORK | **Dual-build fork re-implemented per test.** Each class re-implements test-mocks vs flag-off sign-in. | C4 | One `SignedInScope` AutoCloseable. | `VideoInstrumentedTest:60-77`, `VoicePermissionDeniedInstrumentedTest:53-61,120-129` | android-11 |
| NEW-FIXTURE-ENCODING | **Fixtures not in their native format.** | — | Store binaries as binaries. | `.pdf.base64` beside `.pdf` with decode code in `IsolatedPdfInstrumentedTest` | android-03 |
| NEW-GENERATED-COPY | **Generated output checked in with a sync test.** | D6/D13 | Generate at build time. | `androidTest/assets/trusted-worker.mjs` with a marker-slicing equality test plus a frozen digest | android-03 |
| NEW-UNRUN-MODULE | **Whole Gradle modules for one-off QA that no runner wires.** | A7+T9 | Delete, or add a runner. | `video-fixture`; the `MediaFixtureActivity` campaign half | android-18 |

### 3.2 Production code: dead and dormant

| ID | Pattern | Nearest | Treatment | Examples | Raised by |
|---|---|---|---|---|---|
| NEW-UNWIRED-PACKET | **Unwired OS source packet.** A patch, pin JSON, README and host test that no staging or build script consumes, while overlays that depend on it are staged. | A7 | Wire it into the stage plan with a manifest, or delete it. A README must never claim the packet "binds" the image. | `home-back-keyboard.patch`, `hidden-navigation-handle/` | android-01 |
| NEW-EMPTY-MACHINERY | **Machinery with an empty input list.** | A4 | Delete the machinery, or record why it stays. | `upstream-native-sources.json` `"patches": []`, with patch application and "patched" naming kept | android-18 |
| NEW-DORMANT-OPTION | **Dormant constructor options.** A feature stays alive through an option that the only production caller never sets. | A4 | Check the product constructor's arguments, then delete. | `NoteRecorderSession` `live`, transcriber, `automaticTranscription`, `remoteTranscription` | app-15 |
| NEW-ALIAS-DEAD-ROUTE | **Value aliasing that makes a route permanently dead.** | A4 | Check boolean correlations of state assigned on the same line. | A selector maps `'cloud'` to `'agent'`, and later branches test `'agent' && !cloud`, so paired voice is compiled, tested and modelled but cannot run | app-19 |
| NEW-PHANTOM-NATIVE | **Phantom native feature.** An optional bridge method that no native plugin implements is called with `?.()` inside try/catch. The feature itself is fictional (unlike B2, where the method exists). | B2 | Grep `android/` for every optional plugin method and delete those with no `@PluginMethod`. | `holdSpeechEngine`/`releaseSpeechEngineHold` in `local-reply-speech.ts` | app-24 |
| NEW-DEAD-CONSUMER | **Dead consumer kept after its producer was deleted.** Includes `storage` listeners for keys that moved to IndexedDB: the key name is still current, so the listener looks live. | A1/A7 | Lint that every window event name has at least one dispatcher. Grep `addEventListener('storage'` for keys with no `localStorage.setItem` writer. | `alpha-folder-context` listener after `files-tree-adapter.ts` was deleted; `files-index` tree kind; dc-lite `primaryLabel` special cases; `clock.ts:35` (`alpha.browser.reminders.v1`); `development-account-document.ts:33` | app-12, app-05 |
| NEW-UNBOUND-VALUES | **Render or adapter output keys that no template, rail or adapter binds.** | A7 | A one-off script diffs returned keys against `{{view.key}}` bindings across all views. | about 20 keys in model.js part 2; `maps.grid`, `maps.pins`; `phone-adapter.ts nativeRows/nativeStatusDot/nativeContacts`; `sms-adapter` `native*` values used only by tests | app-13, app-14-p2, app-15, app-17 |
| NEW-TPL-FALSE | **"Hide by false flag" in the raw template.** Adapters set a prototype flag to constant `false` so an `<sc-if>` never renders, but the `?raw` markup still ships. | A5/A6 | Move the region behind a `template-source.ts` marker, then delete the override. | `isNews:false`, `hasPeople:false`, `notNative:false`, `homeShowDate:false` | app-18-p1 |
| NEW-CONST-RESULT | **Constant-result function.** Every non-throwing path returns the same value, but callers still assign it. | A7 | Return `void` and keep the caller's reset explicit. | `negotiateEnabledViews` always returns `''` | app-23 |
| NEW-DEAD-PARAM | **Dead or ignored parameters**, sometimes with the caller computing a value only to pass it. | A7 | Delete the parameter and the caller's computation. | `fundingRefusedReply(serviceName){void serviceName;…}`; `googleDisconnectConfirmation(label,_serviceName)` | app-21, app-23 |
| NEW-MEANINGLESS-VERSION | **In-memory `version` literal never read**, and different from what is persisted. | A7 | Drop the field. | `startup-permissions.tsx:37` `version: 3` (written as 4/1) | app-26 |
| NEW-API-LEVEL | **Dead API-level branches.** | B4 | Repo-wide grep for `SDK_INT <` below minSdk 29. | `Build.VERSION.SDK_INT < Q` in `AlphaNavigationService:77,202-203` | android-13 |
| NEW-DEPRECATED-NOOP | **Deprecated no-op ceremony.** | B4 | Delete. | `AccessibilityNodeInfo.obtain/recycle` (no-op since API 33) in PdfViewer | android-08 |
| NEW-DEAD-CSS | **Dead CSS, undefined tokens and dead geometry.** Selectors with no element; `var(--x, fallback)` for properties no palette defines (a dark-theme bug); vector paths outside the viewport hidden by a clip-path. | A7 | Periodic selector-usage check against apps and `.eliza/client-features`. Grep every `var(--x,` against the assigned set. Trim geometry at source. | about 45 lines in phone/prototype CSS; `--connection-muted`/`--connection-border`; 9.3 KB per icon in `app_icon.xml`/`notification_icon.xml` | app-16, app-21, android-16 |
| NEW-REDECLARED-DEFAULT | **Redeclared defaults and transitive dependencies.** Host resources or Gradle coordinates restate what the library already declares. | A7 | Delete, unless the owner wants an explicit pin; then say so in a comment. | `eliza_passwords` unlock/biometric defaults; six app-level dependencies already `implementation` in patched modules | android-16 |
| NEW-UNREAD-JSON-FIELDS | **Unread ceremony fields in reviewed JSON records.** | B5 | Fold into B5. | `compiled`, `deviceQualified`, `identity.*`, `*Authority`, `geometry`, status booleans in `core-launcher/manifest.json` | android-02, -01 |
| NEW-TWIN-RECORDS | **Twin data records kept equal by validators.** | C6+B3 | One record; derive the rest. | asr-inputs vs voice-host `asrSlot`; fingerprints.json vs os-custody-expected.json vs release-signer.json; `unsignedApkSHA256` twice | android-18 |
| NEW-STALE-NOTE | **Stale design notes and orphaned comments.** Markdown contradicted by code, comments whose subject moved, "until the pin carries X.patch" notes and `unknown` casts that outlived an upstream advance. | A8 | Delete. Search `Until the pin carries` repo-wide. | `POWER-INVOCATION.md`; connection-ui lines 210, 269-272, 1694-1696, 1713, 1925-1928; `agent-adapter.ts:1002,1053` | android-01, app-22-p1, app-09 |

### 3.3 Production code: structure and correctness

| ID | Pattern | Nearest | Treatment | Examples | Raised by |
|---|---|---|---|---|---|
| NEW-IDENTICAL-TERNARY | **Ternary with identical branches.** A leftover after copy edits. | B4 | Grep `\?\s*('[^']*')\s*:\s*\1`, collapse to the literal, and delete the predicate. | `cond ? 'Saved' : 'Saved'` (calendar-adapter.ts:182,272,325), `isNative ? '' : ''` (browser-adapter.ts:401), `joinNext ? X : X` (model.js:700), `notifications.ts:219` | app-06, app-10, app-14-p1 |
| NEW-DUP-STATEMENT | **The same call written twice in one statement list.** Hard to spot in statement soup. | D8 | Formatter plus a lint rule. | `camera-adapter.ts:335` `owner.set({nativeCopyRecovery:true});` twice | app-11 |
| NEW-NULLISH-FALLTHROUGH | **`??` relying on `&&` yielding `undefined`.** | — | Use a ternary. | `(drag && paintedHeight(drag)) ?? …` (`chat-overlay-motion-adapter.ts:609`) | app-11 |
| NEW-CONTRADICTORY-GUARD | **Contradictory nested guard.** A branch re-tests the negation of its enclosing branch, so the block is silently dead. | B4 | Grep the large JSX files. | `connection-ui.tsx:3870` | app-22-p2 |
| NEW-GETTER-GUARD | **Getter evaluated as a guard.** | B4 | Use an explicit assert. | `void this.authority;` (`cloud-protocol.ts:285`) | app-21 |
| NEW-EXCEPTION-GOTO | **Exceptions used as goto, or as boolean probes.** | B1 | Return values. | Bare `throw new Error()` to reach a shared catch (`browser-adapter.ts:182-199`); `try{current();admitted=true}catch{}` (`calendar-approval-adapter.ts:54`) | app-10 |
| NEW-RENDER-SIDE-EFFECT | **Render starts side effects or recurses.** | D9/D2 (research P17 says this is a catalogue gap) | Use an `incoming` hook; assign closures once at mount. | model.js phone deep link, calendar `st.add`, browser `st.url`, maps address; `renderVals` re-creating `this.browserCommand…` every render (browser-adapter.ts:491-541); `calendar-interval-presentation.ts:38,45` calls the full inner `render` per visible day | app-14-p1, app-10 |
| NEW-IMPORT-TIME-LISTENER | **Import-time global listeners.** Module evaluation adds window or document listeners that are never removed. | D3 | Install explicitly. | `browser-camera.ts:343` | app-10 |
| NEW-TIMER-CSS-COUPLING | **Timer literals hand-matched to CSS durations, and magic retry bounds.** | C6 | Derive both from one named constant. | `setTimeout` 460/480/`CLOSE_MS` vs `.42s`; `settle()` loops 8 ticks (`canonical-notes-ui.ts:140`) | app-11 |
| NEW-JSON-EQUALITY | **JSON-stringify identity used as a staleness check, structural equality or CAS.** | B3 | Compare an explicit revision field through one helper. Acceptable where the comparison is of stored bytes; name it once. | `note-web-source-adapter.ts:12,19`, `notes-share-adapter.ts:12-13`, `notes-organize-executor.ts:75`, `notifications-adapter.ts:134,141,208`, `note-origin-adapter.ts:40`, hosted-digest-ui `same`, hosted-notice-question snapshot, inbox-local-store CAS, media-copy-intent | app-15, app-24 |
| NEW-SELF-ROUNDTRIP | **Self round-trip on encode.** Codecs decode what they just encoded before returning. | B3 | Keep it only where "never persist what cannot be restored" is the stated rule. | `calendar-edit-draft.ts:13`, `canonical-calendar-draft.ts:8`, `calendar-form-draft.ts:29` | app-20 |
| NEW-READBACK | **Read-back after a synchronous localStorage write.** | B3 | Delete. | `location-simulation.ts:16`, `simulator-writer.ts:27,33` | app-06 |
| NEW-LABEL-BEHAVIOUR | **Behaviour keyed on visible text** (aria-label, copy, upstream log or label text). Renaming copy silently changes security, focus, Back handling or state. | D10 sub-ID | The shell exposes state as data attributes; dialog factories set markers; upstream exposes structured fields. | `text-share.ts:6` (`[aria-label="Unlock with fingerprint"]`), `view-focus.ts:28`, `share-panel.ts:42`, `scan-document.ts:106`, `scan-review.ts:45`, chat pill/bar taps, `choice.label==='Agent Calendar'`, `DelegationStatus`, `message === SIGN_IN_SENDING`, `lateReadyNotice`, `automations-protocol.ts:61` parses `lastDecisionLog`, `action-message-presentation.ts:57,69` | app-09, -16, -20, -21, -25, -26 |
| NEW-COPY-NAME | **Hard-coded product name where the renamable agent name is bound elsewhere.** | D11 | Bind `{{name}}`. | "Ask Alpha" (template 2545, 3080) vs `Ask {{name}}` | app-18-p2 |
| NEW-PRODUCT-COPY-DEV | **Product copy that names the dev tool.** | D11 | Use one wording. | `sensor-policy.ts:13` "device controls" vs `location.ts` "quick settings" | app-06 |
| NEW-LOCALE-BYPASS | **Bare `toLocale*String` or a private `Intl.DateTimeFormat`** ignoring the Android 12/24-hour setting while `locale-time.ts` exists. `test/locale-time-usage.test.mjs` tracks a pending allow-list that must shrink in the same commit as each conversion. | C3 | Use `locale-time.ts`. | `automations-adapter.ts:149,215`, `calendar-adapter.ts:343-344`, `calendar-approval-fields.ts:8`, `calendar-days.ts:75`, `calendar-month-focus.ts:13`, `hosted-live-source-ui.tsx:126,137`, `reminder-adapter.ts:183,358,412` | app-10, -16, -24 |
| NEW-INLINE-HEX | **Inline-style hex fallbacks escape the palette test.** | D12 | Move to CSS classes, then extend the `theme-palette` FILES list. | `var(--acc,#0000ff)`, `#f5a524`, `#d70015`, `paper:'#FFFFFF'`; `prototype.css` is not in the list; map route `'#1616d8'` | app-16, app-08 |
| NEW-CSS-SPECIFICITY | **`!important` used to beat a sibling stylesheet.** | D12 | Merge the rules. | 12× in `cloud-membership-ui.css` | app-21 |
| NEW-TWO-PARADIGMS | **Same UI rendered twice in two paradigms.** | D12 | Shared CSS classes; keep the second renderer only where required (React-failure fallback). | Plain DOM recovery screen plus React boundary in error-boundary | app-23 |
| NEW-TWO-WRITERS | **Two writers for one device output.** The last writer wins. | D3 | One owner. | `system-bar-appearance.ts` (`AlphaDevice.setSystemBarAppearance`) vs `agent-adapter.ts:1534` (`SystemBars.setStyle`) | app-17, app-27 |
| NEW-NAV-TABLES | **Parent/back tables that disagree.** | C6 | One navigation table. | `settingsParents` vs `nestedParents` (`problems` page) | app-17 |
| NEW-TWIN-EVENTS | **Twin events always fired and handled together.** | D3/C6 | One event. | `alpha:gmail-accounts-changed` + `alpha:google-accounts-changed` | app-23 |
| NEW-IMPORT-ORDER | **Plugin registration that depends on import order**, defended by comments that contradict the real order. | D3 | Explicit late attach. | `register.ts:17`, `register-hosted-results.ts:4-6` | app-06 |
| NEW-RT-IMPORT | **Layering violations.** A `runtime/` module imports a `prototype/` adapter to register itself; a producer imports its types from the consumer, creating a cycle. | D3/D11 | `main.tsx` wires it; the producer owns its types. | `voicemail-transcription.ts:8`; `voice-timing.ts:1` ← `diagnostics-export.ts` | app-26 |
| NEW-STRIP-READD | **A local wrapper strips fields from an upstream reader, and its only caller adds them back.** | D4 | Delete the wrapper. | `startupLocationAccess` drops `requestable`; `startup-permissions.tsx:77` re-adds it | app-26 |
| NEW-HOLDER | **Constructor-holder indirection.** | — | Use lazy methods or a protected setter. | `const holder = {}` + `holder.store!` in `workflow-intents.ts:18` | app-26 |
| NEW-SHADOWING | **Shadowing.** A closure variable is set by a setter and immediately shadowed by a same-named local; a module variable named `document` shadows the DOM; an inner class shadows an Android type. | D11 | One name per value. | `contacts-adapter.ts:26,28,126`; `note-audio-deletions.ts:17`, `notes-trash.ts:17`; `CalendarSyncBridge.Context` | app-12, app-25, android-14 |
| NEW-EXPORT-STAR-OVERRIDE | **`export *` from upstream plus local redefinitions** under the same names, so the API silently mixes semantics. | D4 | Explicit re-export lists. | `subscription-entitlement.ts:28`, `photo-library.ts:7` | app-25 |
| NEW-ALIAS-REEXPORT | **Pure alias re-exports of upstream constants under a second name**, plus a test asserting they are equal. | D4 | Import the upstream names. | `development-digest-occurrence.ts:24-31` `DIGEST_RUN_WINDOW_MS=RUN_WINDOW_MS` | app-05 |
| NEW-UPSTREAM-CONSTANTS | **Re-implementing upstream contract constants**, or reaching one upstream contract through two paths. | A2/C6/C7 | Import the upstream constant; one path. | `PHONE_WORKFLOW_DEVICE_OPERATIONS`, `PHONE_WORKFLOW_MAX_STEPS` hand-copied into workflow-adapter, workflow-authoring and development-workflows; telephony actions via `packages/contracts` and `plugin-assistant`; `recordingRevision` via note-origin and summary-source; scan link cap `10` | app-19, app-25, app-16 |
| NEW-DUP-SHADOW-FILE | **Dead earlier copy shadowed by a live twin with the same exports.** | A2/A7 | Grep duplicate exported names across files. | `maps-chat-adapter.ts` vs `maps-adapter.ts` + `action-message-presentation.ts` | app-13 |
| NEW-SINGLE-CONST-MODULE | **Tiny single-consumer constant module.** | D4 | Fold into the owner. | `maps/basemap.ts` | app-08 |
| NEW-UPSTREAM-CANDIDATE | **Helper with no product input** that belongs upstream. | — | Move upstream (§6). | `keepCloudMapsCoverage` | app-08 |
| NEW-MISATTRIBUTED-HELPER | **Generic utility on an unrelated feature class**, imported from there by many files. | C3 | Move it to `util/`. | `HostedResultNotices.hash`, used by about 18 files for Calendar revisions, credential digests and enrollment | android-14 |
| NEW-PERSISTED-CLASSNAME | **Persisted class names.** WorkManager stores the worker's binary class name, so it is installed identity, like storage keys and manifest components. | G5 | Keep names, or cut over by cancelling old unique work names. | `GmailDeliveryWorker`, `HostedDeliveryWorker`, `DeletionWorker`, `AlphaNoteAudioPlugin$NotesTrashBackstopWorker` | android-13, -14 |
| NEW-SECURITY-DRIFT | **Copy-pasted security verification blocks that have drifted.** A correctness risk, not just duplication. | C3 | One verifier per protocol response with one strictness rule (U-L12). | Owner-session checks: placeholder-agent check in 2 of 4 copies; `expiresAt` by equality in 3 and by `<= now` in 1 | android-15 |
| NEW-COPIED-REJECT | **Copy-pasted reject copy across sibling methods.** | C5 | Merge the skeletons. | `subscribeViewEvents` rejects with `"Invalid voice subscription."` | android-13 |
| NEW-ANDROID-FREE-CONST | **Android SDK constants re-typed as literals** only so host javac tests compile. | D7 | Remove with the tests. | `Settings.ACTION_*`, `Intent.ACTION_*`, `InputType` masks | android-15 |
| NEW-TEST-ONLY-FORWARD | **Test-only plugin instance forwards.** Package-private methods on a Capacitor plugin that only androidTest calls after casting `getBridge().getPlugin(...)`. | D7 | Tests construct the underlying store. | `AlphaConnectionPlugin.writeCredentialSlot/removeCredentialSlot` | android-12 |
| NEW-INLINE-FACTORY | **Identical factory hand-inlined beside the factory.** | C3 | Grep each factory's constructor call. | `AlphaActionJournalPlugin:24-25` vs `WorkflowNoticeTapsFactory.delivery` | android-12 |
| NEW-UNSAFE-FIELD | **Undocumented cross-thread field.** | — | `volatile`/atomic, or confine to one thread. | `AlphaCanonicalNotifications.attempt` (plain `long`, two executors) | android-12 |
| NEW-DIAG-ENUM-DRIFT | **Diagnostic enums that drift from their consumers.** Debug-only classification has no compile-time link. | — | Delete or link. | `RequestOperation.BALANCE` | android-12 |
| NEW-UNTYPED-STATE | **Untyped string state machines.** | C1 | Literal union types. | `phase` in inbox-cloud-adapter; `Reading.message` in local-speech-playback | app-13 |
| NEW-CROSS-OWNER-KEY | **Cross-card value key leakage.** One card's flag is computed by another owner while the intended key is written and never read. | C1/D3 | A typed `HomeValues`. | `home-cards.ts:102` `homePeopleVisibility` drives the mail card; `homeAttentionPeopleVisibility` is never read | app-12 |
| NEW-CANONICAL-NEUTRALISE | **Canonical mode neutralising legacy adapters** by overriding their api members. | A6 | Resolved by U-R4. | `canonical-notes-ui.ts:320,342` `notesTrash:undefined`, `moveNoteToTrash:()=>false` | app-15 |
| NEW-FIXTURE-IN-LOGIC | **Fixture identities baked into model logic.** Product code names fixture people, places or companies. | A5 | Fixture literals live only in fixtures and simulators. | `jordan|northpoint` (1271), `"sfo"` (2753), `"nopa"` (1817), `dad/father` (2117), `NP-` (1679), `meet.lumen.example/` in a live save path (1544) | app-14-p1 |
| NEW-FABRICATED-COPY | **Fabricated success copy in simulators.** | A5/A6 | Flag it so moved dev code does not leak into production copy audits. | `wfRunLog` "Nothing unusual", "Spoke it aloud (32 s)", files `transcribe` inventing a transcript, notes `toCal` "added to Calendar" without a write | app-14-p2 |
| NEW-TPL-CRED | **Simulated credential or consent entry in fixture code or raw templates.** High priority under AGENTS.md "Do not collect credentials". | A3/A5 | Delete the input fields; a dev fixture that needs an account seeds one directly. | Settings add-account email+password with a fake OAuth consent page; Wallet card number/expiry/CVV with an auto-filled code; Wi-Fi password sheet | app-14-p2, app-18-p2 |
| NEW-TPL-ATTR | **Template attribute the engine ignores.** | — | Fix it; add a dc-lite dev-mode warning or a build check for unknown `sc-if`/`sc-for` attributes. | `<sc-if test=…>` (template 4310): dc-lite reads only `value` | app-18-p2 |
| NEW-LITERAL-SPLIT | **Identity literals split to dodge text scans.** | C6 | Use the literal, unless a named scanner requires the split; then say so in a comment. | `String.join(".", "ai", "elizaresearch", "alphaphone")` (AlphaQsDefaultsPolicy.java:17), `test_policy.py:141`, `host-speech-admission.test.mjs:44`, `resident-native-ci-admission.test.mjs:137` | android-01 |
| NEW-IDENTITY-SPRAWL | **Product identity re-read per script.** One root config parsed 31 ways, plus the package id hard-coded in 65 files. | C3/C6 | U-L7. | `app.config.json` | app-01 |
| NEW-SOURCE-IN-STRINGS | **Source code embedded as string literals in a generator**, so it cannot be linted or compiled and is duplicated in the committed patch. | C7 | Real source files that the generator reads. | Java/Kotlin/XML inside `system-entry/prepare.py` (likely `core-launcher/prepare.py` and `hidden-navigation-handle/prepare.py` too) | android-02 |
| NEW-BLANK-CONTEXT | **Post-processing generated output instead of using `.gitattributes`.** | — | `*.patch -whitespace`. | core-launcher `' \n'` → `'\n'` | android-01 |
| NEW-IMAGE-MANIFEST | **Image config contradicts the app manifest**, and nothing checks that they agree. | — | Add a check in `scripts/apk.ts`/`stage-aosp.ts`. Under D7, keep both sides. | Default assistant, long-press Power, lockscreen preset and power-voice patch all point at components the app ships disabled | android-02 |
| NEW-DUAL-PIN | **Dual version pin for one third-party asset set.** | C7 | Align the pins, or generate notices for both. | `lucide-react` 1.0.0 (npm) vs vendored Lucide SVGs 1.18.0, whose licence is missing from THIRD_PARTY_NOTICES | app-01 |
| NEW-FAIL-OPEN | **Fail-open build tolerance.** A safety swap silently falls back to the unsafe input. | B4 | Fail the build. | `vite.config.ts:69-70`: if `fixtures.empty.js` is missing, real fixtures ship | app-27 |
| NEW-CONFIG-SIDE-EFFECT | **Validation at config import time.** | — | An `apply:'build'` hook. | `vite.config.ts:16` `checkCloudDeployment(...)` | app-27 |
| NEW-DEV-PREDICATE | **Dev "simulated background" predicate re-inlined**, including in production paths. | C3/D5 | One `appInForeground()` (U-R6). | `document.hidden || document.documentElement.dataset.devBackground === 'true'`: 23× in 21 files, including `app-speech.ts:20` | app-20 |
| NEW-TRIPLICATED-PROTOCOL | **In-file triplicated protocol blocks** inside one god module, one per connection kind. | C3/C5 | Extract the step once before splitting. | Device enrollment, connection teardown, operation release and plan-end derivation in connection-ui | app-22-p1 |
| NEW-AUDIT-NOTE (method) | **Resources read by name or applied by a library base class** are invisible to plain greps. | — | Check `getIdentifier("…")` and upstream base classes before deleting a resource. | `custom_url_scheme`; `AppTheme.NoActionBar` via Capacitor `BridgeActivity` | android-16 |
| NEW-KEEP-SECURITY (keep) | **Defensive-looking code that is a required property.** | — | Extract it into a named helper; **do not delete**. | Entered-key leak scrub at `connection-ui.tsx:2716` (a 12-character sliding window over `error.message`) | app-22-p2 |

---

## 4. Owner questions (deduplicated and grouped)

Each question has one ID and lists the chunks that raised it. **Status** has three values:
- **D*n*** means a DECISIONS.md entry already answers it. The implementer follows the decision and needs nothing from
  the owner.
- **D*n* (confirm)** means the decision covers the question in principle, but a fact only the owner knows is still
  needed.
- **Open** means nothing answers it yet.

### 4.1 Legacy data (D1)

| ID | Question | Status | Raised by |
|---|---|---|---|
| Q-LEG-1 | Did any shipped `ai.alphacompute.alphaphone` build (or a pilot pre-namespace build) write any legacy data? Listed: `alphaphone:prototype:notes:v1`, `alphaphone:daily:v1`, Cloud credentials without `credentialId`, shared mail snapshots, whole-record voice-note links, a pre-namespace `cloud:production` slot, `alpha-local-reminders-v1`, a "local apps without AI" selection, the plaintext SMS journal `alpha-sms-sends.journal`, an `alphaphone:voice-route:v1` value. If not, all their readers, upgrade tests and Quint traces go. | D1 (confirm the install-base fact once for all) | android-09 Q1, -11 Q1, -12 Q2, -14 Q3, -15 Q1, app-21 Q2, app-22-p2, app-25 Q3, app-26 Q7 |
| Q-LEG-2 | Is the pre-rename (`ai.elizaresearch.alphaphone`) OS image still on any phone that will take an OS update? If not, the v3 legacy-tile migration in `AlphaQsDefaultsPolicy` and its Quint tests can go. | D1 (confirm) | android-01 Q4 |
| Q-LEG-3 | Is any AOSP tree staged from pre-2026-11-10 Provision sources still updated in place without a prior receipt? If not, delete `admitted-previous-sources.json` and `previous_activity`. (Also Q-AOSP-3.) | D1 (confirm) | android-02 Q3 |
| Q-LEG-4 | Does upstream still produce version-1 Calendar deletion targets with plain numeric ids, or reminder rows without `dueAt` (`legacyAlarm`)? If so, `CalendarDeletionIdentity`'s "legacy" form is current and is only renamed. | Open (upstream fact) | android-14 Q4, -15 Q5 |
| Q-LEG-5 | Did any build signed with the previous app key `0438dccb…` install under `ai.alphacompute.alphaphone`? If not, the `apkSigningRotation` block and the rotation code paths can go. (= Q-AND-27) | Open | android-18 Q2 |
| Q-LEG-6 | Does any pilot device hold a Notes Trash document larger than 30 MiB (`AlphaCredentialStore.retainedLimit`)? Does any hold a `hosted-background:v1:active` record with a non-resident mode? Can an installer session staged by an earlier build hold a binding without `/intent`? | D1 (confirm) | android-12 Q3/Q4, -14 Q2 |
| Q-LEG-7 | Is `AlphaActionJournal`'s legacy terminal Clock replay without a `clockReview` receipt still reachable? (= Q-AND-4) | D1 (confirm) | android-12 Q5 |
| Q-LEG-8 | Dev documents store JSON inside JSON (`{rawAccount}`, `{actions,workflows}`). May they be re-keyed to plain values with a key bump when the legacy readers go? (= Q-DEV-5) | Open (dev-only data) | app-05 Q5 |
| Q-LEG-9 | Is a one-time key bump or a clear of the `alpha.browser.*` stores acceptable when the envelope readers go? | D1 says formats stay byte-identical. Open only if the owner wants a reset. | app-06 Q1 |
| Q-LEG-10 | The Photo DB v2→v3 migration (`browser-camera.ts:40-45`) affects only development-preview IndexedDB. Confirm deletion. | D1 | app-10 Q4 |
| Q-LEG-11 | The Lemma contract `digestPhaseDiscardable` (`phase === undefined ==> !\result`) and the Quint HostedDigest text "including a legacy record without a phase": may they change? (= Q-FORMAL-2) | D1 + D11 (confirm the proof change) | app-24 Q4 |

### 4.2 Notes

| ID | Question | Status | Raised by |
|---|---|---|---|
| Q-NOTES-1 | May `legacy-notes-access.ts` and the whole "Previous/Older notes" source path be deleted (about 560 lines in prototype, about 360 in agent-adapter)? | D1 | app-13 Q1, -14-p2 Q3, -15 Q1, -18-p2 Q4, -20 Q3 |
| Q-NOTES-2 | Once legacy notes go, what should the refusal copy say where it mentions "Previous notes" (agent-adapter.ts:1047,1063,1154: native notes query, legacy notes operation, workflow `create_note`)? Should those operation types be refused upstream instead? | Open | app-09 Q1 |
| Q-NOTES-3 | `api.localWorkflowNotes` (dev workflow simulator) and `cardAct reviewDestination==='notes'` need the legacy store. Re-implement them on canonical Notes, or drop them? Is "Review note" still produced by the agent? | Open | app-09 Q2/Q3 |
| Q-NOTES-4 | Can canonical (agent) voice notes still produce device `AudioDeletion` rows? If not, the device voice-note deletion/Trash/lease subsystem goes too (voice-adapter, note-audio-deletions, permanent-voice-deletion, notes-trash voice hooks, the Android native sweep). | Open | app-19 Q1 |
| Q-NOTES-5 | Should agent `notes_record`, `notes_folder_create`, `notes_move` and `notes_restore` work with Agent Notes? Today they answer "Notes unavailable". If not, should `notes.organize.v1` (never negotiated) be deleted, or kept dormant on the upstream contract? | Open | app-15 Q3, app-25 Q6 |
| Q-NOTES-6 | Is the Notes folder UI (create/rename/delete/move from model.js) a product feature, or are only the agent folder operations? (`voice-adapter.ts:1252-1253` forces `folder:null`.) | Open | app-15 Q5 |
| Q-NOTES-7 | Note recorder: is live transcription, or automatic/explicit per-segment transcription, planned? If not, delete the live stream and segment pump (about 190 lines), `noteSegmentTranscriber` and the native `setNoteSegmentText`. | Open | app-15 Q2 |
| Q-NOTES-8 | Text-note import exists only in test-mocks builds. Delete it end to end? Is "Share → Save locally" export a product feature (then it needs a flag-off test)? May the export failure copy change from "Import failed" to "Export failed"? | D3 (import). Open: export copy and test | android-07 Q3, app-15 Q6/Q7 |
| Q-NOTES-9 | After Previous notes, `save_note` cannot be added in the workflow editor. Keep editing support for existing `save_note` steps, or remove the operation until agent note-create carries a client identity? | Open | app-19 Q2 |

### 4.3 Calendar

| ID | Question | Status | Raised by |
|---|---|---|---|
| Q-CAL-1 | Is the agent-side `LinkedCalendarControl`/`AgentCalendar.changeSync` the accepted AP-09 "local-first sync"? If so, also delete the Android `CalendarSyncBridge/Snapshot/Mutation`, the `AlphaCalendarPlugin` sync methods, the `calendar-linked-sync:v1:` slot and `CalendarSyncProvider` androidTest. | D4 covers the renderer. **Android half: confirm** | android-05 Q2, app-20 Q2, app-23 Q2, app-25 Q1 |
| Q-CAL-2 | Is the device-calendar (`native:` source) edit surface (prototype/calendar-adapter.ts + calendar-edit-draft codec + `maps-event-return` v1 origins) still a product surface beside the canonical agent calendar? Or is it part of the legacy authority? May Maps' version-1 Calendar return path (`AlphaCalendar.list` + `mapsEventStillThere`) go? | Open | app-13 Q2, app-20 Q5, app-24 Q5 |
| Q-CAL-3 | Is `calendar-sync-fields.ts` needed for any Android native-sync path? (Follows Q-CAL-1.) | Follows Q-CAL-1 | app-05 Q3 |
| Q-CAL-4 | After U-R3, does `npm run dev:cloud` still need the renderer to admit `/api/v1/eliza/google/calendar/sync-v1/*` (`managed-service-routes.ts:19-20`)? | Open | app-24 Q1 |
| Q-CAL-5 | Should the browser `AlphaCalendar` plugin (`calendar.ts` and about 15 `calendar-*` files) and the "Browser calendar (development)" behaviour move behind the dev boundary? | D6 (move) | app-05 Q1, app-10 Q2 |
| Q-CAL-6 | Keep the `[Calendar saved startup]` debug diagnostics (agent-calendar-adapter.ts:88) and the `bootstrapDiagnostic` stage trail in `AgentCalendar.restoreSaved`? Who reads them? | Open | app-09 Q5, app-20 Q7 |
| Q-CAL-7 | Calendar form `save` (model.js 1539-1549) fabricates a `meet.lumen.example/<slug>` link. Does any production calendar source still run the model `save`? | Open (correctness) | app-14-p1 Q3 |
| Q-CAL-8 | `ScopedCalendarDeletion.localRecurrence…` loops 10 times. Is the intermittent failure it guarded still open? | Open | android-10 Q6 |

### 4.4 Hosted, paired and personal Cloud agents (D5)

| ID | Question | Status | Raised by |
|---|---|---|---|
| Q-HOST-1 | Are paired (`remote:`) and Cloud-hosted (`cloud-runtime:`) agents and paired speech a product feature, a dev surface behind test mocks, or deleted? Is hosted-result delivery resident-only, so that `HostedTransport` and the cloud/remote/local `HostedDelivery` modes go? | D5 | android-05 Q1, -06 Q1, -07 Q1, -08 Q1, -13 Q5, -14 Q2, -15 Q2, app-25 Q2 |
| Q-HOST-2 | Should `AlphaHostedResultsPlugin` be split so that Workflow approval notices get their own plugin (a renderer name change)? | Open | android-13 Q5 |
| Q-HOST-3 | Can the five e2e specs that drive `pair`/`cloudList`/personal setup be rewritten on the resident development bridge, so the harness can be deleted rather than moved? | D5 (harness stays until then): **open scheduling** | app-22-p1 Q1, app-23 Q1 |
| Q-HOST-4 | Is the staging "subscription gate QA" mode (`alpha.connection.resident-qa.v1`) still used? | Open | app-22-p1 Q2 |
| Q-HOST-5 | Is the "Cloud reads" delegation panel (cloud-delegation-ui, mounted from HostedDigestPanel on Android) in PRD scope? It is production-reachable, but the PRD does not name hosted digests or read delegation. | Open | app-21 Q3 |
| Q-HOST-6 | If paired speech goes, what speech path should the browser read-aloud tests and the stale-stop/late-play playback test use (local Paradee)? Which connection kind should the workflow notice-owner tests restore instead of `remote:<origin>`? | Open (follows D5) | android-04 Q2, -10 Q1, -11 Q5 |
| Q-HOST-7 | Is `npm run dev:cloud` (browser Cloud resident mode) still used? Which of `VITE_ALPHA_DEV_CARTESIA`, `VITE_ALPHA_DEV_CLOUD_VOICE` and the browser Cloud resident are still used? Each removed mode deletes a branch. | Open | app-20 Q6, app-24 Q3 |
| Q-HOST-8 | Should the browser Cloud sign-in hand-off ("Browser sign-in (diagnostic)") stay as a D6 dev capability, or go with the hosted path (D5)? Will native ever implement `cancelGoogleSignIn`? | Open | app-21 Q4, app-22-p2 |
| Q-HOST-9 | Should the developer Cloud/Cartesia speech routes keep their own plugin methods (`transcribeDevelopmentCloudRecording`, `synthesizeDevelopmentCloud`), or should the dev host implement the product methods? | Open | app-21 Q5 |
| Q-HOST-10 | Is the test-mocks Android Cerebras key form in the generic chooser (connection-ui 4044-4045) still needed, or does `OwnProviderChoice` cover the same e2e paths? | Open | app-22-p2 |

### 4.5 Dev simulator and test-mocks surfaces (D6)

| ID | Question | Status | Raised by |
|---|---|---|---|
| Q-DEV-1 | Does the fixture-mode simulator (`?fixture=1`, `?mode=dev`: Phone/Messages/Inbox/Maps renders, canned replies, Browser booking agent, Settings/Files fixtures, the workflow simulator with its Lemma/Quint proofs) stay as a developer surface? If yes, it moves to `dev/`. If no, about 2,600 lines and the `dev-*.spec` suites go. | D6 says keep the capability. **Open: which parts.** Recommendation in the chunks: keep only what retained e2e drives. | app-06 Q3, -07 Q1, -14-p1 Q1, -14-p2 Q2, -18-p1, -18-p2 Q3 |
| Q-DEV-2 | Keep the development Cloud fixture (`development-cloud-ui.tsx`, `development-cloud.ts`, documents, the cloud profile in `development-identity.ts`)? It simulates the PRD-excluded personal-Cloud path. | D5 + D6: delete if no retained e2e drives it | app-05 Q4, app-21 Q1, app-23 Q1 |
| Q-DEV-3 | Production recovery shows only "Data kept". Should the test-mocks backup/reset/calendar-restore dialogs and the web recovery surfaces (Workflows intent journal, bookmark recovery, digest inbox recovery, `workflow-request-recovery.ts`, copy recovery) be deleted, or moved to `dev/`? | D3 (backup: delete) / D6 (rest: move) | app-06 Q2, app-10 Q1, app-11 Q4, app-24 Q2, app-26 Q6 |
| Q-DEV-4 | The key `alpha.browser.reminder-deletions.v1` holds reminder actions. Rename it during an A1 reset, or keep it byte-for-byte? | D1 says keep | app-06 Q5 |
| Q-DEV-5 | (= Q-LEG-8) | | |
| Q-DEV-6 | Are the synthetic placeholder photographs (`PH_TONES` and friends, 151 `--alpha-photo-*` tokens) reachable in production? If not, move them out of the product registration into fixtures. | Open | app-08 Q2 |
| Q-DEV-7 | Does test-mocks **live** mode (without `?fixture=1`) need fixture seeds hidden by `data-adapter.ts`'s `empty` table? Or can seeding move into a dev installer so that production `model.js` imports nothing from `fixtures.js` and `fixtures.empty.js` disappears? | Open | app-12 Q1 |
| Q-DEV-8 | `fixtures.js` names real businesses (Tartine, Equinox SoMa, Alaska Airlines, SFMOMA …) while its header says everything is fictional. Replace them with fictional names, or correct the header? | Open | app-12 Q4 |
| Q-DEV-9 | Simulated shade (notices, tiles): retire it or move it to `dev/`? Is no in-app tile surface planned (the shade is Android SystemUI only)? | D6 (move) / open on the in-app tiles | app-09 Q4, app-15 Q4 |
| Q-DEV-10 | Is the test-mocks voice "route choice" UI (`manualChoice`, `routeChoice`, `recordOnly`, `changeRoute`) needed by a retained dev journey? | Open | app-19 Q4 |
| Q-DEV-11 | Settings `character` page and `charName` rename (dev surfaces only): keep or delete? | Open | app-14-p2 Q4 |
| Q-DEV-12 | Is the mock connection mode (`data-connection-mode==='mock'`, inbox-provider-controls:26) reachable in product builds? | Open | app-13 Q5 |
| Q-DEV-13 | Is `data-map-diagnostics` (maps-adapter.ts:242) a supported production diagnostic surface, or test-only? Does the fixture-mode phone keep the model `maps` view? | Open | app-13 Q3/Q4 |
| Q-DEV-14 | Wallet (AP-13): delete the model, template, fixtures, simulator, palette tokens, `alphaPaletteColor`, the `inventory` view and dev tests now? Keep the "pay"/"open wallet" refusal. | D2 | app-06 Q4, -07 Q3, -08 Q3, -12 Q2, -14-p2 Q1, -15 Q8, -18-p2 Q1 |
| Q-DEV-15 | Password import/export, and the `PasswordTransferPlugin` dev registration in MainActivity. | D3 | app-08 Q1, android-15 Q4 |
| Q-DEV-16 | App-data backup (`native-recovery-backup.ts`): delete, or keep as a dev tool? | D3 | app-25 Q5 |
| Q-DEV-17 | Is the Node-only `test/fixtures/photo-library-adapter.mjs` (which forces `typeof document` guards in product code) kept, or moved to a browser spec? | D10 (move) | app-16 Q7 |

### 4.6 Voice and dormant features (D7, D8)

| ID | Question | Status | Raised by |
|---|---|---|---|
| Q-P78-1 | P-78 assistant/Power/QS-tile entry (`AlphaAssistActivity`, `AlphaPowerVoiceActivity`, `AlphaQuickSettingsTile`, `PowerLaunchPin`, `launchSurface`/`takeInvocation`, `voice-entry-policy.ts`, the image defaults config_defaultAssistant/long-press Power/lockscreen preset/power-voice packet, the `sense` composition block). The image enables what the app ships disabled. Reconfirm D7 "keep", and decide whether Assistant* tests become NOT_RUN. | **D7 (keep).** Reconfirm in view of the image/app contradiction | android-01 Q3, -02 Q1, -03 Q7, -04 Q1, -09 Q4, -12 Q1, -13 Q2, -14 Q1, -15 Q3, -16 Q2, -18 Q3, app-20 Q4, app-26 Q1 |
| Q-VOICE-1 | P-39 send policy: is auto-send final? Then remove `VOICE_SEND_POLICY`, the `'review'` path and `setVoiceSendPolicyForTests`. | D8 (delete) | app-26 Q2 |
| Q-VOICE-2 | #663 / H-18 Clef end-of-turn stage: planned this cycle? | D7 (keep) | app-26 Q3 |
| Q-VOICE-3 | Is voicemail transcription on-device only? Then remove the cloud mode from `voicemail-state.ts`, `Voicemail.qnt` (`setStt`, `cloudUploads`) and `telephony.mjs`. | Open | app-26 Q4 |
| Q-VOICE-4 | Workflow presentation probe: renderer and bridge ship in one APK. Can the device protocol be the constant 3? | Open | app-26 Q5 |
| Q-VOICE-5 | `NativeVoiceLatencyInstrumentedTest`, `LocalSpeechBridge` drain ordering and `VoiceWorkerSettlement` use only upstream voice classes. Move them upstream? (See Q-AND-20.) | D14 follow-up | android-07 Q5/Q6, -11 Q2 |
| Q-VOICE-6 | Keep the tests that prove an old `alphaphone:voice-route:v1` value is ignored? | D1 (delete) | app-26 Q7 |
| Q-VOICE-7 | Are WAV/JSON evidence files written by `LocalSpeechInstrumentedTest`, `LocalVoiceRecordingLimit` and `note-read-aloud.json` listened to or collected by any campaign? If not, drop the writes. | Open | android-07 Q7, -11 Q6 |
| Q-VOICE-8 | `SpeechNoNetworkInstrumentedTest` (the no-egress privacy proof) is in no CI lane. Add it to the fused-speech lane, or keep it manual? | Open | android-10 Q5 |
| Q-VOICE-9 | Development Cartesia in private local preview without test mocks: `vite.config.ts:110` makes it impossible, while `development-cartesia-flag.ts:3` and its test assume it works. (= Q-BUILD-5) | Open | app-27 Q2 |

### 4.7 UI behaviour and copy

| ID | Question | Status | Raised by |
|---|---|---|---|
| Q-UI-1 | Is the `main.tsx` adapter order (workflow/automations installed after simulated apps under `?workflows=agent`) intentional, so the two install sites must stay separate? | Open | app-07 Q6 |
| Q-UI-2 | The Settings "Privacy & data" and "Models" pages are unreachable in product builds. Delete them with their native-adapter scrub rows? | Open (recommend delete) | app-17 Q1 |
| Q-UI-3 | Problems page Back: should hardware Back and on-page Back both return to About? Today they go to About and Developer. | Open | app-17 Q3 |
| Q-UI-4 | Add `data-alpha-chat-action` attributes so copy edits cannot break chat pill/bar gestures? | Open (recommend yes) | app-11 Q5 |
| Q-UI-5 | The summary-note review dialog does not make the phone inert. Is adopting `openReview` (which inerts it) acceptable? | Open | app-17 Q5 |
| Q-UI-6 | Fix `<sc-if test="{{review.canOpen}}">` → `value=` so the "Calendar" button appears after a successful request? It has never rendered. | Open (bug fix) | app-18-p2 Q2 |
| Q-UI-7 | `mergeDeviceFacts` (proved) vs the inline merge in `refresh()`: the inline version deletes text-size keys that the previous facts lacked. Which semantics is intended? | Open | app-17 Q2 |
| Q-UI-8 | Which system-bar mechanism is canonical: Capacitor `SystemBars.setStyle` (agent-adapter.ts:1535, capacitor.config.ts:8) or `AlphaDevice.setSystemBarAppearance`? | Open | app-17 Q4, app-27 Q5 |
| Q-UI-9 | Rename the reminder "deletion" journal to an "operation" journal? It carries update/complete/snooze, and the rename touches Quint symbol names. | Open | app-16 Q4 |
| Q-UI-10 | Converting bare time formatting to `locale-time.ts` changes visible times (they follow the phone's 12/24-hour setting). Confirm. | Open (the test says this is the plan) | app-10 Q3 |
| Q-UI-11 | Should "Ask Alpha" follow the user-chosen agent name (`{{name}}`)? | Open | app-18-p2 Q5 |
| Q-UI-12 | Copy fixes: "Captured Nothing is saved to Photos." → "Captured. Nothing is saved to Photos."; mic-off wording ("device controls" vs "quick settings"); the `"Invalid voice subscription."` reject on the view subscription. | Open (trivial) | app-16 Q1, app-06 Q6, android-13 Q10 |
| Q-UI-13 | `phone.css` 538 vs 831: two conflicting rule sets for camera modes at large text in portrait. Which values are intended? | Open | app-16 Q2 |
| Q-UI-14 | `prototype.css:3` hard-codes `.os` tokens. Does the runtime always set the theme variables on `.os` before first paint, so these can go? | Open | app-16 Q3 |
| Q-UI-15 | Contacts icons: switch the hand-written phone/mail SVG paths to `IC.phone`/`IC.mail` (a visible change)? | Open | app-12 Q5 |
| Q-UI-16 | Home badges: may only Phone, Messages and Inbox badge on Home, so the Calendar/Workflows/Wallet badge hooks can be deleted? | Open | app-12 Q6 |
| Q-UI-17 | Keep the Photos in-app share sheet for the browser build, or rely on native share everywhere? Should the global "Back to apps" fallback replace the per-view header Back buttons? | Open | app-18-p1 |
| Q-UI-18 | The workflow palette shows `Send` and `Do` kinds that no `PhoneStep` kind supports. Remove them, or keep them as placeholders? | Open | app-19 Q3 |
| Q-UI-19 | Account sheet: "Plan" and "Add funds" open the same billing page. Keep both entry points? | Open | app-21 Q6 |
| Q-UI-20 | `DailyApps.perform('browser')` falls back to `https://example.com` when no URL is given. Keep that, or refuse a missing URL? | Open | android-14 Q6 |
| Q-UI-21 | Is `AlphaGmailPlugin.notificationSettings` wanted as a Settings entry? | Open | android-13 Q4 |
| Q-UI-22 | Photo-library Alpha-named copy (`scopePresentation`, `reviewText`, `describeLibraryOperation`) has no UI caller. Planned UI, or delete? | Open | app-25 Q7 |
| Q-UI-23 | Is the `subscription-entitlement.ts` credits branch (`view.kind==='credits'`) still reachable? | Open | app-25 Q8 |
| Q-UI-24 | Should `runtime/phone-context.ts` keep accepting `selectedObject.kind:'folder'` once the folder-context producer is gone? | Open | app-12 Q3 |
| Q-UI-25 | Is `launcherListens` still needed (always true on shipped Android and in the browser)? | Open | app-08 Q7 |
| Q-UI-26 | Is the 8 MiB JSON check in `inbox-unsaved.ts:44` still needed, given `inboxUnsavedLimit` and the native slot cap? | Open | app-13 Q6 |
| Q-UI-27 | Are the `try { api.set } catch` "could not be restored/deleted" toasts (model.js 403-404, 665-673) specified storage-failure behaviour? | Open | app-14-p1 Q4 |
| Q-UI-28 | `reminder-adapter.ts:116` (`Capacitor.getPlatform()==='web' && !isPluginAvailable('DailyApps')`) and `.catch(()=>null)` on `DailyApps.addListener`: which builds lack DailyApps? | Open | app-16 Q5 |
| Q-UI-29 | `DailyApps.restoredResult`/`restoreSelected`, `BrowserVoice.saveRecording`, `migrationStatus` and `DailyApps.reminderDecision` have no renderer consumer. Delete them, or should the renderer consume them? Should `DailyApps` keep its seven pass-through file-selection methods (`daily.ts:166-172`)? | Open | app-05 Q6, app-07 Q4/Q5 |
| Q-UI-30 | Files: which `out.*` keys of the model's files render does upstream `files-browser-adapter` rely on? (= Q-FILES-1; needs the plugin owner.) | Open (upstream) | app-14-p2 Q5 |
| Q-FILES-1 | (= Q-UI-30) | | |
| Q-MEDIA-2 | (= Q-AND-13) | | |
| Q-UI-31 | `ServiceReadCache.clear()` gives up silently after three CAS conflicts. Acceptable on sign-out? | Open | app-25 Q9 |
| Q-UI-32 | Can `negotiateEnabledViews` treat an agent without `viewProfileVersion` as an error? Can `phoneContextMessage` history recognition of older stored messages go? | Open / D1 | app-23 Q3, app-25 Q4 |
| Q-CONN-3 | Conversation selection persists a bare string on Android and `{id,revision}` in the browser. Unify on one shape, or keep both current formats? | Open (D1 implies keep both) | app-23 Q4 |
| Q-CONN-4 | Should `calendarAgendaObservation` (browser-only) and `connectDevelopment` move to `browser/`, injected through one host object? Should the browser dev-only paths inside production modules (realtime Cartesia, browser Cloud resident Calendar writes, dev-host Google access POST) move to `src/dev/`? | D6 (yes) | app-22-p1 Q3, app-23 Q5 |

### 4.8 Android native and instrumentation

| ID | Question | Status | Raised by |
|---|---|---|---|
| Q-AND-3 | Make `/intent` mandatory in `UPDATE_BINDING`? (Q-LEG-6) | D1 (confirm) | android-12 Q4 |
| Q-AND-4 | (= Q-LEG-7) | | |
| Q-AND-5 | Is `release.DataIntegrityProvider` (pilot update export) still needed under the renamed package? | Open | android-12 Q10 |
| Q-AND-6 | Image admission: should Contacts and DeviceApps keep `aospImage` (provisioned) while telephony roles use `verified` (admitted), or should one decision apply everywhere? Should Telecom/SMS roles be requestable on the verified image (`roleEnabled` says no; launcher `AlphaTelephonyRoles` enables the components)? | Open | android-12 Q7, -13 Q3 |
| Q-AND-7 | Test hooks (`*ForTest`, `instrumentationRecoveryEndpoint`, `instrumentationBaseUrl`, `instrumentationCredentialSlot`, `IsolatedPdfService.stallFixture`, `AlphaNavigationService.snapshot()`): move them to the testMocks source set (which gates those suites to test-mocks builds), or is gating on `ELIZA_DEV_ALLOW_TEST_MOCKS` in main enough? | Open | android-13 Q7, -14 Q7 |
| Q-AND-8 | Should a missing `agent/workflow-worker/files.sha256` be a launch error? (The comment says "Older payloads do not contain a workflow worker".) | D1 (confirm) | android-13 Q8 |
| Q-AND-9 | Owner-foreground checks differ per flow: Calendar availability omits the lock check, `AlphaDeletionsPlugin` has two variants, `shareForeground` is strictest, and Files review uses only `hasWindowFocus`. Intentional, or one strictest `OwnerSurface.check` everywhere? | Open (security) | android-12 Q9, -13 Q9 |
| Q-AND-10 | Are `cancelBackground`/`disableBackground`/`setBackgroundPolling` deliberately off the `io` worker (common ForkJoin pool)? | Open | android-13 Q6 |
| Q-AND-11 | Does `SerialStorageTasks` in `AlphaConnectionPlugin` need strict ordering for CAS correctness? | Open | android-12 Q11 |
| Q-AND-12 | Is `AlphaPhotosPlugin.preserveClosedVideoCopy` (+ `VideoCopyClosedFailureReviewInstrumentedTest`) needed for any pilot device? | Open | android-10 Q2, -14 Q5 |
| Q-AND-13 | Camera `legacyFile` (`file://` receipts, "Android 9 and older"): minSdk is 29. Confirm that no supported image returns `file://`. (= Q-MEDIA-2) | D1 (confirm) | app-11 Q2 |
| Q-AND-14 | Fix the LateLaunch/closedMessage boilerplate upstream in the vendor base plugins (pin advance), or in a local Alpha base class? | Open | android-14 Q8 |
| Q-AND-15 | (= Q-DEV-15) | D3 | |
| Q-AND-16 | After deleting CombinedAgent*, are `scripts/start-combined-agent.ts` and its Quint launcher model (`CombinedAgentLauncher.qnt`, `combined-agent-launcher*.mjs`, `quint-lib.ts:16`) still needed? | Open | android-06 Q5 |
| Q-AND-17 | `JourneyJ05InstrumentedTest` skips on every runner emulator. Delete it in favour of the two BrowserPageQuestion methods, or keep it as a named device-only journey? | Open | android-04 Q3, -07 Q2 |
| Q-AND-18 | Merge the two approval process-death tests and drop the `pending-recovery-ui.py` `workflow-approval-process-death` phase? | Open (recommend yes) | android-11 Q3 |
| Q-AND-19 | `NoteRecordingSave` runs in a disposable secondary user. May it merge into `NoteAudio` (which does not)? | Open | android-07 Q9 |
| Q-AND-20 | Move upstream-only emulator tests (Reminder engine tests via `ReminderTestAccess` (about 16 classes), `ReminderDeletionJournal`, Photo* engine tests, `SelectedCalendarReader`, `CalendarCreationStore` recovery, `BrowserExternalHandoff`, the `BrowserPageReading`/`BrowserReviewedReading` reflection, `CloudSignInAuthorization`, `CrossAppNotifications`, `ContactsCatalog`, ResidentStreamTransport, SpeechSentenceCancellation, StorageCategories, parts of Settings*/SystemShade) to `vendor/eliza`, accepting a short coverage gap? Or keep Alpha-side emulator copies as release evidence? Should Browser host internals get an upstream test accessor? | D14 (follow-up) / **open on the coverage gap** | android-04 Q4, -05 Q3, -06 Q3, -08 Q4, -09 Q5, -10 Q3, -12 Q8, -16 Q5 |
| Q-AND-21 | Wire or delete the unrun methods (`CameraFlow.cameraDeniedForever…`, `CalendarAgentCrud.insertHandoff…`, the regional Maps methods, `PhotoEdit.grantedLibrarySaveOpensTheCopyAndConfirms`, the `ReminderNoticeQuestion` agent method / "#676" campaign, `ConnectionInstrumentedTest#localDraftCompareExchange…`)? | Open | android-05 Q4, -06 Q6, -07 Q4, -08 Q6, -09 Q3 |
| Q-AND-22 | Contacts: PRD AP-08 keeps Contacts for the AOSP image while P-60 defers it. Delete `ContactsFlowInstrumentedTest` now? | Open | android-06 Q2 |
| Q-AND-23 | Should all resident owner verifications reject the placeholder agent and require exact `expiresAt` equality? | Open (security) | android-15 Q6 |
| Q-AND-24 | May the javac host tests and Quint Java harnesses that pin tiny classes (`NativeReadEpoch`, `NavigationOpenRequest`, `VoiceEventAdmission`, `ResidentCredentialShutdownRetry`) be removed or rewritten together with the merges? | D10/D11 | android-15 Q7 |
| Q-AND-25 | Is device-level coverage of provider-key storage needed after `LocalAgentProviderInstrumentedTest` is deleted? (A browser spec covers the Settings UI.) | Open | android-07 Q8 |
| Q-AND-26 | Is the foreign-Photos permission campaign (`MediaFixtureActivity` + `PhotosForeignLibraryInstrumentedTest`) still wanted? No script drives it. | Open | android-08 Q3, -18 Q1 |
| Q-AND-27 | (= Q-LEG-5) signing rotation | Open | android-18 Q2 |
| Q-AND-28 | Keep `android/signing/public/fingerprints.json` as the ceremony record (and drop `os-custody-expected.json`), or delete it as an unread copy? | Open | android-18 Q4 |
| Q-AND-29 | Is local native patching retired for good (`"patches": []`)? | Open | android-18 Q5 |
| Q-AND-30 | May the Sense `componentPackage` change to `ai.eliza.sense`, so the seven empty identity subclasses can go? (D7: the listener itself stays.) | Open | android-18 Q3 |
| Q-AND-31 | Can private-QA builds be required to go through `build-android.ts`/`build-archive.ts`, so that Gradle only checks the digest? | Open | android-03 Q3 |
| Q-AND-32 | Is the pilot OS-update enrollment (`pilot-system-update-enrollment.json`, `stage-os-update-enrollment.ts`) still needed? | Open | android-03 Q2 |
| Q-AND-33 | Reset Alpha data (#409): delete `ResetExternalFixture` now and write a runner-backed test when reset ships? | Open | android-09 Q2 |
| Q-AND-34 | Is the public/owned Eliza Cloud transport probe still wanted anywhere? | Open | android-09 Q6 |
| Q-AND-35 | Does `scripts/test-cross-app-notifications.ts` (+ both CrossApp classes + `android/notification-fixture`) stay as a manual campaign? Should the notification fixture keep its own synthetic signing key? Retire the `notification-fixture`, `sense` and `sense-speech` module entries in consumer-host.json? | Open | android-06 Q4, -16 Q4, -18 Q6 |
| Q-AND-36 | `ResidentWorkflowCrash.safeIpcRefusal` copies about 80 upstream labels. Export the label set from the generated host, or drop the `ipcRefusal` diagnostic? Should upstream expose the resident launch environment for `TrustedPackagedWorker`? Can `WorkerCrashDiagnostic` shrink to `ApplicationExitInfo`? | Open (partly D14) | android-10 Q4/Q7, -11 Q4 |
| Q-AND-37 | `PasswordBrowserFillInstrumentedTest` loads `https://example.com`/`.org` (live network). Serve from loopback, or document the network requirement? | Open | android-08 Q5 |
| Q-AND-38 | Keep explicit `eliza_passwords_unlock_seconds=60` / `allow_biometric=true` pins equal to the library defaults? Drop the wholesale `androidx.**` ProGuard keep? | Open | android-16 Q3, -03 Q6 |

### 4.9 AOSP packets

| ID | Question | Status | Raised by |
|---|---|---|---|
| Q-AOSP-1 | Should `home-back-keyboard.patch` and `hidden-navigation-handle.patch` be applied by `stage-alpha-os-branding.py`? If they are applied outside the repo, by what process? The staged overlays reference resources that only these patches define. | Open (correctness) | android-01 Q1 |
| Q-AOSP-2 | Is `vendor/alphaphone/secure-camera` always part of the product? If yes, delete the two `alpha-secure-camera.xml` copies and `secure-camera-inputs.json`. | Open | android-02 Q2 |
| Q-AOSP-3 | (= Q-LEG-3) | D1 (confirm) | |
| Q-AOSP-4 | Is the exported `AlphaAppearance` activity (for in-place development updates) still wanted in images? | Open | android-02 Q4 |
| Q-AOSP-5 | Should the Provision setup icon stay byte-identical to an app resource? Or may `drawable/app_icon.xml` move into `provision/` and be trimmed, with a new pinned SHA? | Open | android-16 Q1 |
| Q-AOSP-6 | Wire the hand-run AOSP Python suites (`test/aosp-fresh-presets.test.py`, `system-entry/test_native_plan.py`, `core-launcher/test_policy.py`, `hidden-navigation-handle/test_hidden_handle.py`) into `test/python-suites.test.mjs` with input-dir skips, or delete them in favour of Quint? `test_policy.py` is the only off-device check of the FGS hide/restore Kotlin change. | Open | android-01 Q2/Q5, -02 Q5, -03 Q1 |
| Q-AOSP-7 | Should source-lock rows that are only review references (7 in system-entry, 6 in provision, 7 in power-voice) stay? | Open | android-02 Q6 |
| Q-AOSP-8 | Can `generate-alpha-os-branding.ts` use the `vendor/eliza/packages/os` boot-animation tooling instead of a separate elizaOS/os checkout pinned by `tools.lock.json`? | Open | android-03 Q5 |
| Q-AOSP-9 | Should `soong-memory.patch` move upstream next to `soong-app-native`? | D14 follow-up | android-03 Q4 |

### 4.10 Build, tests and formal

| ID | Question | Status | Raised by |
|---|---|---|---|
| Q-BUILD-1 | Should Vite accept only `ELIZA_DEV_ALLOW_TEST_MOCKS`, dropping `VITE_ELIZA_DEV_ALLOW_TEST_MOCKS` as an input name (it stays as the define output)? | Open | app-27 Q1 |
| Q-BUILD-2 | Where does the cloud-deployment check live: config load, a build-only hook, or only `verify`? | Open | app-27 Q3 |
| Q-BUILD-3 | Are generated alias files under `.eliza/client-features` (aliases.json + tsconfig.paths.json) acceptable as the single alias source, or is a hand-maintained wildcard map preferred? | Open | app-27 Q4 |
| Q-BUILD-4 | Relocate generated files (`cloud-deployment.generated.ts`) into a `generated/` folder, given the path churn? | Open | app-21 Q7 |
| Q-BUILD-5 | (= Q-VOICE-9) | Open | app-27 Q2 |
| Q-BUILD-6 | Should plugin-native-passwords be projected into `.eliza/client-features`, so the app stops importing `vendor/eliza` directly? | Open | app-08 Q8 |
| Q-BUILD-7 | Minimum supported Android System WebView: if ≥ 116, delete the `anyAbortSignal` polyfill (12 importers) and its test. | Open | app-20 Q1 |
| Q-BUILD-8 | THIRD_PARTY_NOTICES lists lucide-react 1.0.0 only, while the shipped SVGs are 1.18.0. Include the vendored icons, or align the pins? Keep `sourceFiles` (136 hashes) in `lucide/source.json`? Move `icons/senders/sources.json` (shipped in the APK) out of the served bundle? Keep `asset-manifest.json` as a licence record and move it with the fixtures? | Open | app-01 Q1-Q3, app-09 Q6 |
| Q-BUILD-9 | Is `orientation` ever expected to become `landscape` (tablet profile)? If not, delete the tablet emulator branch. | Open (recommend delete) | app-01 Q5 |
| Q-TEST-1 | Main.tsx text-pinned tests (14 files + 10 Quint harnesses): delete them per T1/T2 before splitting? | D10 | app-07 Q7 |
| Q-TEST-2 | `test/support/feature-parity.mjs`: keep the per-file inventory, or reduce it to directories? | Open (high leverage: every unit in §1 edits it) | app-06 Q7 |
| Q-TEST-3 | `installPrototypeCameraAdapter`'s disposer is called only by the Quint Photos-window harness. May the harness be ported, so the disposer and 110 `disposed` fences can go? Must installers stay disposable? | D11 (port) / open on the installer contract | app-11 Q1 |
| Q-FORMAL-1 | Moving LemmaScript-verified files (`chat-overlay-motion-adapter` release functions → `runtime/chat-release.ts`, `calendar-days.ts`, `settings-adapter` update policy) changes the Dafny artefact path. Regenerate under the new path in the same change? | D11 (confirm) | app-10 Q5, app-11 Q3 |
| Q-FORMAL-2 | (= Q-LEG-11) | | |
| Q-FORMAL-3 | Keep the Quint `pn*` refinement checks (dev-profile phone-call simulation) once the code moves to the simulator, or retire them? | Open (NEW-DEV-PROOFS) | app-14-p1 Q2 |
| Q-FORMAL-4 | Which CallbackLanding harness is canonical: `portable.mjs` (75 traces) or `quint-conformance.test.mjs` (7 cases)? The proposal keeps portable.mjs plus the Playwright check. | Open | app-01 Q4 |
| Q-FORMAL-5 | `createSessionSaver` in `browser-poll.ts` is LemmaScript-proved and Quint-modelled, but the product never calls it. Wire it, or delete it with its proof, test and model? | Open | app-05 Q2 |

### 4.11 Upstream (all D14 follow-ups; listed in §6)

| ID | Question | Raised by |
|---|---|---|
| Q-UP-1 | Should `keepCloudMapsCoverage` move into plugin-maps? Should plugin-maps export the Cloud Google provider id `'eliza-cloud-google'`? Is map route accent `'#1616d8'` a palette token, or deliberate? | app-08 Q4-Q6 |
| Q-UP-2 | Which note operation names can `normalizeEffectReceipts` still emit (`notes.note.*` vs `notes.*-note`)? Can upstream expose a structured snooze field? | app-20 Q8 |
| Q-UP-3 | Will upstream accept a header selector in `installSharedDockClearance` and export `getZonedDateParts` publicly? | app-23 Q6 |
| Q-UP-4 | Should plugin-files export the scan link cap? | app-16 Q6 |
| Q-UP-5 | Native unsupported-profile detection compares the Java error message (browser-adapter.ts:176). If it comes from the vendor tab host, the error-code change is upstream. | app-10 Q6 |

---

## 5. Proposed foldering after cleanup

This target combines the research §5 proposals with the per-file verdicts. Reviewers disagreed in places, and the
choice made here is stated for each one.
- **Typed plugin modules:** `native/`, not `runtime/plugins/`.
- **Dev code:** one `dev/` at `src/` level, not `browser/dev/`, so that one `@dev` alias and one bundle stub cover it.
- **Folder name:** `prototype/` is renamed `shell/` + `views/`. The name "prototype" is misleading, because the folder
  holds the production renderer.

Do the renames **last**, after G1 retires the text pins. Each folder move edits feature-parity, the Quint manifests,
Lemma paths and the in-page Playwright imports (§2).

### 5.1 `apps/app/src`

```
apps/app/src/
├── main.tsx                     # ≈120–150 lines: mode resolution, mountPhone(), Phone composition
├── build-flags.ts               # ALL build/dev flags (absorbs development-cartesia-flag, development-cloud-voice,
│                                #   developmentBridgeAllowed, browserLocalAgentEnabled, devSurfacesEnabled)
├── bootstrap/
│   ├── adapters.ts              # declarative ordered adapter list → hook registry (replaces ~53 install* chain)
│   ├── layout.ts                # useSurfaceLayout, insets (from main.tsx)
│   └── app-update.ts            # update gating (from main.tsx)
├── generated/                   # optional (Q-BUILD-4): cloud-deployment.ts
├── lib/                         # pure, dependency-free helpers (U-L1)
│   ├── hash.ts  is-record.ts  ids.ts  abort.ts  base64.ts  parse.ts  random.ts
│   ├── json.ts  serial-queue.ts  session-key.ts  keyed-list-focus.ts
├── native/                      # one typed module per Capacitor plugin (U-L2); absorbs native.ts + daily.ts typing
│   ├── system.ts  device.ts  device-apps.ts  daily-apps.ts  voice-cloud.ts  note-audio.ts  calendar.ts
│   ├── notifications.ts  hosted-results.ts  connection.ts  agent.ts  location.ts  photo-library.ts  photos.ts
│   └── files.ts  mail-attachments.ts  note-documents.ts  contacts.ts  browser.ts  telephony.ts
├── product/                     # product policy and identity
│   ├── alpha-product-registration.ts  owner-route-table.ts  native-cloud-runtime.ts
│   └── view-admission.ts        # was prototype/mvp-features.ts
├── runtime/                     # domain + protocol logic, no DOM installers
│   ├── connection/              # split of connection-ui.tsx (U-R14)
│   │   ├── store.ts  resident.ts  cloud-account.ts  provider-keys.ts  conversation.ts
│   │   ├── device-actions.ts  voice-binding.ts  selection.ts (SELECTION / readConnectionSelection)
│   │   └── ui/ SignInPage.tsx  AccountSheet.tsx  ProviderKeys.tsx  ResidentRecoveryPanel.tsx  connection-ui.css
│   ├── cloud/                   # cloud-protocol (auth/billing/google/maps clients), cloud-sign-in(-ui), cloud-voice,
│   │                            #   cloud-membership-ui, cloud-delegation-ui, cloud-environment-selection,
│   │                            #   subscription-entitlement, cloud-voice-limit
│   ├── agent/                   # local-agent.ts, local-agent-stream, agent-conversation.ts (from remote-protocol),
│   │                            #   alpha-client.ts, agent-types.ts, owner-route-policy.ts, app-record-port.ts,
│   │                            #   effect-invalidations.ts, view-navigation.ts
│   ├── chat/                    # projection.ts, notices.ts, markup.ts (from action-message-presentation)
│   │                            #   chat-release.ts (Lemma; from chat-overlay-motion-adapter)
│   ├── calendar/                # agent-calendar.ts, calendar-draft-codec.ts, calendar-options.ts,
│   │                            #   calendar-approval*.ts, calendar-form-inputs.ts, calendar-approval-fields.ts,
│   │                            #   calendar-days.ts (Lemma; optional, Q-FORMAL-1), civil-date.ts, clock.ts
│   ├── google/                  # google-accounts.ts, google-calendar-link.ts, google-return.ts, gmail-*.ts,
│   │                            #   google-agent-access.ts
│   ├── digests/                 # hosted-digests.ts, hosted-background.ts, hosted-result-notices.ts,
│   │                            #   ui/ (split of hosted-digest-ui.tsx), hosted-live-source-ui.tsx
│   ├── inbox/                   # inbox-local-store, inbox-operation, inbox-edit-coalescer, inbox-attachment,
│   │                            #   reviewed-mail-context
│   ├── notes/                   # bindings.ts, storage.ts, notes-trash-policy, notes-folders-model,
│   │                            #   note-recorder.ts, note-recorder-driver.ts, notes-organize-executor.ts,
│   │                            #   canonical-notes-controller.ts, note-origin.ts
│   ├── reminders/               # reminder-creations, reminder-action-journal, workflow-reminder-read
│   ├── telephony/               # telephony-executor, telephony-contracts.ts, telephony-presenters, aosp-telephony,
│   │                            #   phone-context, phone-info, voicemail-*, wav.ts
│   ├── voice/                   # voice-selection, voice-states, voice-timing, native-live.ts, native-reading-voice,
│   │                            #   native-speech-playback.ts (was src/local-speech-playback.ts), app-speech,
│   │                            #   always-on-listener, voice-entry-policy (D7)
│   ├── workflows/               # workflow-protocol, workflow-device-contract (Lemma), workflow-intents,
│   │                            #   workflow-local-time, workflow-presentation, automations-protocol
│   ├── durable-slot.ts  files-index.ts  locale-time.ts  app-update.ts  appearance.ts  return-to-app.ts
│   ├── egress-privacy.ts  system-picker.ts  canvas-geometry.ts  surface-insets.ts  device-view-profile.ts
│   └── …remaining small domain modules (aosp-image, accessibility-timeout, managed-service-routes, …)
├── ui/                          # DOM/React installers and shared UI kit (moved out of runtime/)
│   ├── dialogs/                 # dialog-kit.ts (openOwnedDialog), review-dialog.ts (openReview), inline-modal,
│   │                            #   trap-focus, dialogs.css, content-question.ts, reading-review.ts
│   ├── share-panel.ts  status-ui.tsx  status-ui.css  text-scale.ts  toast-layer.ts  view-focus.ts
│   ├── error-boundary.tsx  icon-style.ts  icon-catalog.json  system-bar-appearance.ts
├── shell/                       # was prototype/ core
│   ├── model.js  icons.js  shell-helpers.js  dc-lite.js  template.html (+ per-view partials)  template-source.ts
│   ├── shell-types.ts  hook-registry.ts  subview-accessibility.ts  reply-announcer.ts
│   └── phone.css  prototype.css
├── views/                       # one owner folder per view (U-R17)
│   ├── home/        home-values.ts  home-cards.ts  home-overview-cards.ts  home-shell.ts
│   ├── notes/       index.ts (owner: share/document-export/folders/organize-host)  canonical-notes-ui.ts
│   ├── calendar/    index.ts  calendar-adapter.ts  calendar-drafts.ts  calendar-month-focus.ts
│   │                calendar-confirmation.ts  calendar-approval-*.ts  reminder-adapter.ts  agent-calendar-adapter.ts
│   ├── workflows/   index.ts (workflow + automations + clock)  workflow-filters.ts  workflow-authoring.ts
│   │                workflow-notice-question.ts
│   ├── camera/      camera-adapter.ts  scan/ (scan-dialog.ts, scan-*.ts, scan-dialog.css)
│   ├── photos/      photos-adapter.ts  photo-library-adapter.ts  photo-viewport.ts  video-edit-review.ts(+.css)
│   ├── inbox/       index.ts  home-summary.ts  list.ts  reader.ts  notices.ts  inbox-drafts.ts  inbox-unsaved.ts
│   │                inbox-provider-controls.ts
│   ├── settings/    settings-adapter.ts  pages/*.ts
│   ├── maps/        maps-adapter.ts  maps-chat-adapter.ts (live code)  + maps/ product modules (map-plane …)
│   ├── browser/     browser-adapter.ts  browser-session.ts  browser-external-handoff.ts
│   ├── phone/       phone-adapter.ts  telephony-attention.ts
│   ├── messages/    sms-adapter.ts
│   ├── contacts/    contacts-adapter.ts
│   ├── selection/   selected-document-adapter.ts  files-view-adapter.ts  file-email-review.ts
│   └── agent/       agent-adapter.ts (split per U-R13)  voice-adapter.ts (split)  read-aloud.ts
│                    message-actions-adapter.ts  chat-overlay-motion-adapter.ts  notification-taps.ts
├── platform/                    # was browser/: the web Capacitor plugin implementations (development preview)
│   ├── web/         calendar/ (calendar.ts, -store, -records, -dialogs …)  voice.ts + voice/*  notifications.ts
│   │                daily.ts  device.ts  location.ts  clock.ts  hosted-results.ts  deletions.ts  files.ts
│   │                secret-store.ts  connection.ts  register.ts  foreground.ts  …
│   └── storage/     documents.ts  domain-document.ts  observed-document.ts  journal-retention.ts  durable docs
├── dev/                         # everything behind the one @dev alias / dynamic import (U-R1, U-B2)
│   ├── fixtures/    fixtures.js  fixtures.empty.js(if kept)  img/
│   ├── development-rail.html  development-system-surfaces.html  development-views.html
│   ├── simulated-*.ts (apps, inbox, messages, voicemail, workflows, phone, maps, browser, shade-notices)
│   ├── workflow-sources.ts  development-*.ts  digest-*.ts  device-controls.tsx(+.css)  focus-state.ts
│   ├── incoming-simulation.ts  location-simulation.ts  password-provider.ts  dev-vault.ts  regional-provider.ts
│   ├── realtime-voice.ts  cloud-resident.ts  development-storage.ts  development-agent-bridge.ts
│   ├── remote-protocol.ts (D5 harness, until retired)  mock-admission.ts  mock-mode.tsx  notification-composer.ts
│   └── startup-browser-permissions.ts  workflow-request-recovery.ts
└── passwords/  password-manager.ts   # product (transfer group removed, D3)
```

`browser/` is renamed `platform/web/`. If that rename costs too much (about 120 Playwright specs import
`/src/browser/*` by path), keep `browser/` and only move out its `dev/` and `ui/dialogs/` members. The research
recommends that cheaper option for `documents.ts` in particular, which about 35 specs import.

### 5.2 Android Java package `ai.alphacompute.alphaphone`

Today the package holds 131 classes flat, plus `release/`. Target (research android §5, refined by the per-file
verdicts):

```
ai.alphacompute.alphaphone
├── MainActivity, AlphaApplication, HomeInstanceHandoff, RendererEscapeView, SystemInsetsBridge, HomeSettings,
│   RendererRecoveryBudget                         # app shell (MainActivity split, U-A5)
├── agent/        ResidentLifecycle, CredentialAuthority, ProviderSettingsPlugin, ResidentLaunchEnvironment,
│                 ResidentRequestGate, CanonicalNotificationSession, AlphaLocalAgentPlugin (thin),
│                 ResidentOwner, ResidentResult*, NativeVoiceBinding, LocalAgentProviderAdmission,
│                 WorkflowWorkerAssets, AlphaAssistActivity / AlphaPowerVoiceActivity (D7, dormant)
├── credentials/  AlphaCredentialStore (asSlots), RendererCredentialSlots, CloudDeployment (generated),
│                 CloudReads, AlphaCloudSignInPlugin, AlphaConnectionPlugin, GoogleWorkspaceReturn*, ConnectionRoutes
├── notices/      AlphaNotificationsPlugin, AlphaCanonicalNotifications, AlphaHostedResultsPlugin, HostedDelivery,
│                 HostedInbox, HostedResultNotices, HostedNoticePoster, WorkflowNoticeTaps/Delivery/Poster,
│                 SourceRenewalNotices, NativeDigest*, NativeNotificationSession, AlphaNotificationListener
├── calendar/     AlphaCalendarPlugin, CalendarScopedDeletionReview, (CalendarSyncBridge/CalendarSyncJournal if
│                 Q-CAL-1 keeps them), AlphaDeletionsPlugin, NativeDeletionCoordinator, ClockAgentReview, AlphaReminders
├── media/        AlphaPhotosPlugin, AlphaPhotoLibraryPlugin, AlphaMediaConfig, AlphaNoteAudioPlugin,
│                 NotesTrashBackstop (worker binary name preserved, G5), AlphaNoteRecorder, AlphaNoteDocumentsPlugin,
│                 IsolatedPdfService, AlphaMailAttachmentsPlugin, AlphaMailFileProvider
├── voice/        AlphaVoiceCloudPlugin, AlphaCloudSpeechStreamPlugin, CloudVoiceLimit / voice policy,
│                 KeyboardDictation*, AlphaKeyboardDictationService
├── update/       AppUpdater (UpdatePause, UpdateActivation, UpdateResume), AlphaUpdateStatusReceiver,
│                 UpdateConfirmationReceipt                 (U-A1; receiver is a manifest component)
├── telephony/    AlphaTelephony, AlphaTelephonyRoles, AlphaContactsPlugin, AlphaSmsSendReceiver,
│                 AlphaImageCapability (merged)
├── browser/      AlphaBrowserStores (+ aliases removed), password provider support
├── device/       AlphaDevicePlugin (thin), AlphaDeviceAppsPlugin, DailyAppsPlugin, AlphaSystemPlugin,
│                 AlphaFilesPlugin, AlphaGmailPlugin + GmailBackground (+worker, name kept), AlphaMapsTransportPlugin,
│                 AlphaNavigationService, AlphaQuickSettingsTile (D7)
├── release/      DataIntegrityProvider (Q-AND-5)
└── util/         Digests, Ids, BoundedIo, Http, Json, Workers, MainThread, Diagnostics, OwnerSurface,
                  CalendarPermissions, PluginWorkers/LateLaunch base (U-L8, U-L9)
```

Constraints for the package move (U-A10):
- **Manifest components are installed identity.** Activities, services, receivers, providers and the QS tile are
  referenced by fully qualified name in both AndroidManifests, `scripts/apk.ts` permission policy,
  `proguard-rules.pro`, the AOSP packets (`core-launcher` inserts `custom(ai.alphacompute.alphaphone/.AlphaQuickSettingsTile)`
  and the default-assistant config) and `pixel10a-composition.json`. Moving a component class to a subpackage changes
  its component name on devices and in the OS image.
  - **Keep every manifest component in the root package**, or add `<activity-alias>`es and regenerate the AOSP packets
    in the same change.
- **WorkManager workers stay in place** (G5), or ship a cut-over.
- **Capacitor plugin names** (`@CapacitorPlugin(name=…)`) do not change with the package, but `MainActivity`
  registration lists do.
- **Every source list must follow the move:** Quint `specs/quint/refinement/native/*.mjs` source lists,
  `*Traces.java`/`*Harness.java` imports, javac host tests (`test/fixtures/*Test.java` package declarations and
  classpaths), the `test/fixtures/app-update-jvm/ai/alphacompute/alphaphone/*` stubs, and
  `test/support/feature-parity.mjs`.

androidTest gets a parallel `support/` subpackage for the drivers in U-L13. The test classes stay at the package root,
so that `CLASS_REGISTRY` keys and runner class strings do not change. The upstream-internals tests in
`androidTest/java/ai/eliza/plugins/reminders/` go upstream (U-T2).

---

## 6. Upstream follow-ups (D14: not done in this cleanup)

Each needs a reviewed `vendor/eliza` PR, then a pin advance and an `upstream.lock.json` update. The Alpha-side unit
waits for the pin advance.

| # | Upstream change | Alpha unit unblocked | Source |
|---|---|---|---|
| 1 | Accept an empty or null `legacyName` in `ReminderConfiguration` (`.eliza/patched-native/.../ReminderConfiguration.java:20`) | Reminder legacy store removal (U-A9) | android-09 #4 |
| 2 | Drop the plaintext SMS journal migration source in `SmsTelephonyConfiguration` | D1 SMS journal | android-14 Q3 |
| 3 | Fix LateLaunch/closedMessage in the base plugins (plugin closed-bridge unification) | U-L9 | android-14 #10, -15 #12 |
| 4 | Package-visible test accessor for `BrowserTabHostPlugin`, and move the pure Browser rule tests upstream | U-L13 `BrowserHostProbe`, U-T2 | android-04 NEW-R, Q4 |
| 5 | Move the engine tests: `OwnedPhotoEdits`/`PermittedMediaCatalog` (PhotoReplace, PhotoFilter, PhotosCatalogOrder, PhotosLibrary), speech-bridge `VoiceWorkerSettlement`, reminders `ReminderDeletionJournal` + civil recurrence, `NativeVoiceLatency`, LocalSpeechBridge drain ordering, CloudSignIn `$Attempt`, NotificationMirrorListenerService, ContactsCatalog, System*/CrashLog/StorageCatalog/SessionSpeech | U-T2 | android-05 … -12 |
| 6 | Export the resident launch environment and the IPC refusal label set from the generated host | `TrustedPackagedWorker`, `ResidentWorkflowCrash.safeIpcRefusal` | android-10 Q4/Q7 |
| 7 | `soong-memory.patch` → `vendor/eliza/packages/os/android/patches/` | U-O3 | android-03 #7 |
| 8 | Export `InstalledAppsGridDrawer`, `HOLD_MS`, `SLOP`, `appsDrawerEntries` from the `upstream renderer package/mobile-shell` index | `home-shell.ts:6` uses the alias | app-12 #15 |
| 9 | plugin-maps: host `keepCloudMapsCoverage` and export the Cloud Google provider id | `maps/agent-navigation.ts`, `cloud-provider.ts:5` | app-08 Q4/Q5 |
| 10 | plugin-workflow: export a readable-summary predicate or constant from `hosted-digests.ts`; one shared managed-route table (`managed-service-routes.ts` vs `managed-google-route-policy.ts` vs Java `CalendarSyncConsent`) | `hosted-notice-question.ts:13` | app-24 #14 |
| 11 | Structured snooze field (instead of parsing `lastDecisionLog`); confirm the `normalizeEffectReceipts` note operation names | `automations-protocol.ts:61` | app-20 Q8 |
| 12 | `installSharedDockClearance` header selector; public `getZonedDateParts` | dock-clearance header measurer | app-23 Q6 |
| 13 | plugin-files: export the scan link cap, and document the `out.*` contract of `files-browser-adapter` | `scan-*.ts`, model.js Files scaffold | app-16 Q6, app-14-p2 Q5 |
| 14 | Tab host: a native error code for unsupported profiles | `browser-adapter.ts:24,176` | app-10 #15 |
| 15 | `NativeCloudSignInPort` optional members (`cancelGoogleSignIn`, `resumeMfa`, `addListener`), if the optionality is upstream's | `CloudSignInPort` required members | app-22-p2 #3 |
| 16 | Project plugin-native-passwords into `.eliza/client-features` (or prepare-client-features does it Alpha-side) | `passwords/*.ts`, `native.ts:3` | app-08 #7 |

---

## 7. Suggested execution order

This is input for the coordinated-change plan. Each wave is a set of independent PRs; later waves depend on earlier
ones.

1. **Wave 0: pins.** Delete or port T1/T2/T10 tests and harnesses per file group (D10, D11). Start with the heaviest
   blockers:
   - `connection-ui.tsx` (98 readers)
   - `model.js` (32 tests)
   - `main.tsx`
   - `settings-adapter.ts` markers
   - `agent-adapter.ts`
   - `template.html` slices
   - the AlphaLocalAgentPlugin and MainActivity regex tests
   - the `connectionController` slicers

   Decide Q-TEST-2 (feature-parity granularity) first; it changes the cost of every later wave.
2. **Wave 1: decided deletions.** U-R3 (D4), U-R4 + U-A8/U-A9 (D1), U-R5 (D5, product side), Wallet (D2),
   backup/import/export (D3), U-R19 switches (D8), and U-T1 never-run classes.
3. **Wave 2: shared modules.** U-L1, U-L2, U-L3, U-L4, U-L5, U-L6, U-L7, U-L8, U-L9, U-L10, U-L11, U-L12, U-L13,
   U-B1, U-B3 and U-R6. Introduce each once, then migrate callers per area.
4. **Wave 3: dev boundary.** U-B2, then U-R1 (one group per commit, with the bundle audit on and off). Then U-R10's
   fixture moves and U-R11's dev-region splice.
5. **Wave 4: splits and merges.**
   - Renderer: U-R7 … U-R18, U-R20 … U-R22.
   - Android: U-A1 … U-A7, U-T3.
   - AOSP and build modules: U-O1 … U-O3, U-B4.
6. **Wave 5: foldering.** §5.1 renames (`shell/`, `views/`, `ui/`, `native/`, optional `platform/`) and U-A10.
7. **Wave 6: formatter.** Prettier runs once (D9).
8. **Follow-ups:** §6 upstream PRs, then the Alpha units they unblock.

Verification for every wave follows AGENTS.md:
- `npm run verify`.
- `npm run android:build:local` for both distribution variants.
- `scripts/audit-production-bundle.ts` with test mocks off.
- Android test-class changes additionally need an emulator instrumentation run.
- Packet regenerations (U-O2 system-entry behaviour fixes) need a full AOSP build and device acceptance.

An APK build does not prove an emulator or device result.
