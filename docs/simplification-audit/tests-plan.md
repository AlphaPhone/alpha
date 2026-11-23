# Tests consolidation plan: host tests and Playwright specs

Scope: everything under `test/` (host tests, `test/fixtures`, `test/support`, `test/own-provider`, `test/browser`) and the
`scripts/test-*.ts` child suites whose bodies are tests. Inputs: the 51 `chunks/test-*.md` summaries and their per-file
reports, the test-related `chunks/scripts-*.md` rows, `research/tests-host.md`, `research/tests-browser.md`,
`PATTERNS.md` (T1–T10), `DECISIONS.md`, `RECOMMENDATIONS.md` and `cross-file-actions.md` §2. This is a plan; no file has
been changed by it.

Worktree snapshot this plan was built against (checked with `ls`/`find`/`git status` on 2026-11-11):

| Kind | Files now | After this plan |
|---|---:|---:|
| Host tests `test/*.test.*` (incl. 292 `test/quint-*.test.mjs` and 10 `.test.py`), plus 2 Python helper modules | 971 + 2 | 0 at the top level |
| Host integration `test/integration/*.test.ts` (+ `test/integration/jvm/*.java` drivers) | 0 | 26 (+ 14 drivers) |
| Tooling `test/tooling/*.test.ts` | 0 | 16 |
| Resident lane `test/resident/*.test.ts`, live `test/live/*.test.ts` | 0 | 2 + 1 |
| Quint runner `test/quint/*.test.mjs` | 0 | 2 |
| Playwright specs `test/browser/*.spec.ts` | 433 | 0 at the top level |
| Journey specs `test/browser/journeys/*.spec.ts` | 0 | 36 |
| Live specs `test/browser/live/*.local.spec.ts` | 4 (top level) | 3 |
| Playwright helpers (`test/browser/*.ts`, `test/browser/helpers/*.ts`) | 46 | 0 (replaced by `test/browser/harness/**`, 23 files) |
| `test/fixtures/**`, `test/support/**`, `test/own-provider/**` | 202 | about 25 in `test/support/` and `test/integration/{support,jvm}/` |
| `scripts/test-*.ts`, `scripts/maps/test-*`, `scripts/ci/test-*.py` | 97 | 77 absorbed or deleted here; the device-campaign runners and `scripts/ci/test-*.py` stay with the scripts plan |

102 files named in the chunk lists are already gone from the working tree (stage A deletions, for example
`test/browser/dev-workflow-*.spec.ts`, the migration specs, `test/support/feature-parity.mjs`,
`scripts/feature-manifest.ts`). They are not repeated below.

## Decisions taken for this plan

| # | Decision | Basis |
|---|---|---|
| TP1 | Host targets live in five folders: `test/integration/` (node:test, real module imports, real IO, no slicing, no `vm`), `test/tooling/` (tests of `scripts/`), `test/resident/` (needs the prepared resident runtime), `test/live/` (opt-in, real providers), `test/quint/` (the one refinement runner and Quint tooling). Nothing stays at `test/*.test.*`. | research/tests-host §10; owner brief "no unit tests, only integration and e2e" |
| TP2 | The host-JVM lane stays a node:test runner, `test/integration/android-jvm.test.ts`, compiling real Alpha classes against **one** stub tree. Chunk targets that say "Gradle JVM test" map to this runner. No `android/app/src/test` source set is created here (it does not exist: `android/app/src` has `androidTest launcher main standalone testMocks`), and no Robolectric or Gradle dependency is added. | test-47 correction (no Gradle unit-test source set); D9 (no new Java tooling dependency) |
| TP3 | Where a JVM wrapper test and its Java driver got different verdicts, the driver verdict wins (the reviewer read the Java). Wrappers whose driver is DELETE are DELETE: `serial-storage-tasks`, `source-renewal-notices`, `speech-output-warmup`, `shared-deletion-window`, `streaming-speech`, `clock-native-contract`, `clock-repeat-days`, `cloud-speech-timing`, `secure-store-memory` (`test/fixtures/secure-store-memory/**` dies with it). Exception: the four `Workflow*NoticeTest.java` drivers are merged into one `WorkflowNoticesTest.java` with the 7 cases test-31 lists, so required CI keeps an Alpha-side notice check. | test-30, test-31, test-47, test-49 |
| TP4 | Visible behaviour goes to a journey; behaviour only observable at a module or native boundary goes to an integration file. A behaviour gets exactly one home. When a chunk named both, the journey wins unless the case needs a native-only path (Pixel branch, JVM). | T4 |
| TP5 | One Playwright file per journey; build selection is by tag, not by file name. `@production` tests run only in the `production` project, untagged tests only in `dev`, `@storage` tests also in `firefox`/`webkit` (manual dispatch, as today). `*.production.spec.ts` twins disappear. | research/tests-browser P5; scripts-13 (`@storage` tag replaces `scripts/storage-specs.ts`) |
| TP6 | Journey specs drive visible UI only. No `page.evaluate(() => import('/src/…'))`, no prototype patching, no backdoor `connectionController.open()`. State is seeded through the typed bridge (`harness/bridge.ts`) or the agent/Cloud fakes. | T6; research/tests-browser §9 |
| TP7 | When two chunk summaries disagree on one file, the summary that reviewed that file wins (for example `scripts/test-resident-reuse.ts` is MERGE into `local-agent.test.ts` per scripts-16, not DELETE per test-47). | REVIEW-BRIEF-TESTS |
| TP8 | New host files are `.test.ts` (Node 26 strips types; the runner globs `.ts`). The Quint runner stays `.mjs` because the drivers it imports are `.mjs`. | consistency |
| TP9 | `specs/quint/**` edits (driver registration, ports, moving fixtures into `specs/quint/refinement/**/fixtures/`) belong to the formal plan. This plan lists them as preconditions and never edits `specs/`. | D11, ownership |
| TP10 | `scripts/verify-apks.ts`, `scripts/audit-production-bundle.ts` and the new `scripts/ci/check-workflows.ts` receive the release rules that deleted source-text tests asserted (§3.3). Unit H9 owns the two audit scripts for that edit; unit H10 hands the workflow rules to the CI plan. | D10, T1 |

## How to read this plan

- §1 lists files deleted outright. §2 lists every target file that remains and every existing file it absorbs (those are
  deleted too, by the target's unit, once the cases are carried). §2.7 places every surviving fixture. Together they
  cover every file in `test/` that exists today, plus the `scripts/` test bodies.
- "Cases to carry" quotes the chunk reviewer's note, shortened. The per-file report under
  `docs/simplification-audit/files/<path>.md` has the full case list; implementers read it before porting.
- Unit ids (T0–T15, H2–H11, Q1, TZ) are defined in §5.

## 1. DELETE ledger

Every file below is deleted outright: its behaviour is covered elsewhere, belongs to a retired feature, tests upstream code, or is a
source-text/transplant/unit test (D10). Files that are absorbed into a target (MERGE, REWRITE, MOVE, PORT, KEEP-and-move) are
**also** deleted once their target lands; they are listed per target in §2, not here. A row marked "carry → Tn" moves one or more
cases first and is deleted by unit Tn/Hn; every other row is deleted by T2 (tests, specs, Python) or TZ (fixtures and helpers that
still have importers). A precondition after "—" names what must land first. The note is the chunk reviewer's reason, shortened.

### 1.1 Host tests (337)

**Source transplant (T2)** (139)

- `test/abort-signal-compat.test.mjs`: optional WebView-113 case in `journeys/maps.spec.ts` — carry → T11
- `test/agent-always-local.test.mjs`: `journeys/connection-cloud.spec.ts`; add `speechSynthesis` to the bundle denylist — carry → T5
- `test/agent-camera-capture.test.mjs`: covered by `browser/agent-camera-capture.spec.ts`, which becomes part of `journeys/camera-photos.spec.ts`
- `test/agent-status-route.test.mjs`: one case in `journeys/settings.spec.ts` (production project) — carry → T15
- `test/app-update.test.mjs`: Gradle JVM AppUpdateInstallerTest (keep test 2 until then) — carry → H8
- `test/batch-ack-shell-retirement.test.mjs`: 1 case → `journeys/voice.spec.ts` — carry → T4
- `test/browser-bookmark-startup.test.mjs`: 1 case → `journeys/browser.spec.ts` — carry → T10
- `test/browser-command-refusals.test.mjs`: cases to `journeys/browser.spec.ts`; duplicate of navigation-creation:34-44
- `test/browser-host-modal.test.mjs`: also remove `// host-modal:begin/end` markers (D7)
- `test/browser-navigation-creation.test.mjs`: `journeys/browser.spec.ts`, 5 cases — carry → T10
- `test/browser-note-pending-audio.test.mjs`: `journeys/notes.spec.ts`, 4 cases — carry → T8
- `test/browser-notification-clear.test.mjs`: `journeys/notifications.spec.ts`, 4 cases — carry → T11
- `test/browser-reading-capability.test.mjs`: instrumented reading tests; 1 case to `journeys/browser.spec.ts` — carry → T10
- `test/browser-receipt-order.test.mjs`: `journeys/browser.spec.ts` + 1 case in `journeys/chat.spec.ts` — carry → T10
- `test/browser-saved-transcript-audio.test.mjs`: `journeys/notes.spec.ts`, 2 cases — carry → T8
- `test/browser-session-persistence.test.mjs`: `journeys/browser.spec.ts`, 4 cases; `createSessionSaver` tests go with D20 — carry → T10 — same change: drop the path from `specs/quint/application/manifest.json` (formal plan)
- `test/browser-streamed-speech.test.mjs`: `journeys/voice.spec.ts`, real MSE + `page.route` — carry → T4
- `test/browser-voice-cancellation.test.mjs`: `journeys/voice.spec.ts`, 3 cases — carry → T4
- `test/calendar-confirmation.test.mjs`: 2 steps in `journeys/calendar.spec.ts` — carry → T7
- `test/calendar-delete-latch.test.mjs`: `journeys/calendar.spec.ts` unconfirmed device delete — carry → T7
- `test/calendar-review-parse-cache.test.mjs`: none needed (memoisation)
- `test/calendar-sync-cloud-refusal.test.mjs`: status table into Gradle calendar-sync test after extracting `cloudFailure` — carry → H8
- `test/calendar-view-rules.test.mjs`: midnight/reminder/alarm steps in Calendar & Reminders journeys; skipped-date case to recurrence table
- `test/camera-scan-keep.test.mjs`: 2 steps in `journeys/camera-photos.spec.ts` — carry → T9
- `test/canonical-note-calendar-admission.test.mjs`: 2 steps in `journeys/notes.spec.ts` — carry → T8
- `test/canonical-notes-webview-abort.test.mjs`: `AbortSignal.any` rule to bundle audit; 2 notes journey steps
- `test/canonical-notification-navigation.test.mjs`: `journeys/notifications.spec.ts` (4 cases) — carry → T11
- `test/canonical-recording-audio-save.test.mjs`: `journeys/notes.spec.ts` voice: lost reply makes no duplicate
- `test/chat-navigation-detent.test.mjs`: 3 steps in `journeys/chat.spec.ts` — carry → T3
- `test/chat-release.test.mjs`: `journeys/chat.spec.ts` (from `full-chat-grabber.spec.ts`) — carry → T3 — same change: drop the path from `specs/quint/application/manifest.json` (formal plan)
- `test/chat-stop-controls.test.mjs`: chat journey
- `test/chat-ui-failed-turn.test.mjs`: 3 chat/connection-cloud journey steps
- `test/cloud-conversation-chunks.test.mjs`: `journeys/voice.spec.ts` — carry → T4
- `test/cloud-environment-selection.test.mjs`: production bundle audit + dev journey
- `test/cloud-plan-cancel.test.mjs`: one step in `journeys/settings.spec.ts` — carry → T15
- `test/cloud-prewarm.test.mjs`: warm count in `journeys/chat.spec.ts`; allowlist rows to dev-bridge tooling test — carry → T3
- `test/cloud-protocol-error-copy.test.mjs`: later case in connection-cloud integration
- `test/cloud-sign-in-late-readiness.test.mjs`: later integration after connection-ui split
- `test/cloud-sign-in-readiness-retry.test.mjs`: `journeys/connection-cloud.spec.ts` step — carry → T5
- `test/comms-settings.test.mjs`: `test/integration/phone-sms-contacts.test.ts` after extraction — carry → H6
- `test/composer-send-ownership.test.mjs`: `journeys/chat.spec.ts` — carry → T3
- `test/connection-action-reconcile.test.mjs`: later integration after split
- `test/connection-background-restore.test.mjs`: `journeys/startup-permissions.spec.ts` / connection-cloud journey — carry → T15
- `test/connection-browser-return.test.mjs`: 4 cases → `test/integration/connection-cloud.test.ts` (real import, function is exported) — carry → H2
- `test/connection-chooser-focus.test.mjs`: 1 step → `journeys/connection-cloud.spec.ts` — carry → T5
- `test/connection-presentation-state.test.mjs`: ~15 cases → `connection-cloud.test.ts`, `journeys/connection-cloud`, `chat`, `settings` — carry → T5
- `test/connection-recovery-state.test.mjs`: 2 cases → `connection-cloud.test.ts` (failure-kind table, identity-read retry) — carry → H2
- `test/connection-step-contracts.test.mjs`: local-agent cases → `test/integration/resident-runtime.test.ts`; secrets fallback → `connection-cloud.test.ts` — carry → H2
- `test/connection-work-lifecycle.test.mjs`: 1 follow-up case after split
- `test/context-selection.test.mjs`: folder half with C19; 1 photo-rewrite step → `journeys/camera-photos.spec.ts` — carry → T9
- `test/conversation-restore-safety.test.mjs`: 3 CAS cases → `connection-cloud.test.ts` after split; 1 chat reload step — carry → H2
- `test/dev-local-launcher.test.mjs`: bundle audit is the release gate
- `test/digest-pending-storage.test.mjs`: -
- `test/direct-browser-transcription.test.mjs`: `journeys/voice.spec.ts` — carry → T4
- `test/files-storage-refusal.test.mjs`: optional Gradle storage test after extracting the helper — carry → H8
- `test/final-ui-lifecycle.test.mjs`: `journeys/chat.spec.ts`, `journeys/voice.spec.ts`, `journeys/settings.spec.ts` cases — carry → T3 — same change: drop the path from `specs/quint/application/manifest.json` (formal plan)
- `test/gmail-lifecycle-custody.test.mjs`: owner question
- `test/google-cancel-boundary.test.mjs`: 2 races to connection-cloud
- `test/google-cancel-committed-key.test.mjs`: F01 case to `journeys/connection-cloud.spec.ts` — carry → T5
- `test/google-native-mfa.test.mjs`: 2 cases in `journeys/connection-cloud.spec.ts` — carry → T5
- `test/history-initial-state.test.mjs`: 3 cases in `journeys/chat.spec.ts` — carry → T3
- `test/home-cards.test.mjs`: 3 assertions in `journeys/home-shell.spec.ts` — carry → T12
- `test/home-google-connection-source.test.mjs`: 1 case in `journeys/home-shell.spec.ts` — carry → T12
- `test/home-inset-layout.test.mjs`: optional 1 case (native-insets)
- `test/home-role-recovery-contract.test.mjs`: optional Gradle `RendererRecoveryBudgetTest` — carry → H8
- `test/home-views-model.test.mjs`: 3 cases (camera-photos, contacts) — same change: drop the path from `specs/quint/application/manifest.json` (formal plan)
- `test/map-theme-colors.test.mjs`: -
- `test/maps-reroute-freshness.test.mjs`: `journeys/maps.spec.ts`; delete `scripts/test-maps-reroute-freshness.ts` — carry → T11
- `test/native-credential-read.test.mjs`: -
- `test/native-enrollment-commit-order.test.mjs`: re-test after split
- `test/native-google-port-capability.test.mjs`: -
- `test/native-network-lifecycle.test.mjs`: journey connection-cloud
- `test/native-plugin-teardown.test.mjs`: android-jvm — carry → H8
- `test/native-popover-back.test.mjs`: `journeys/home-shell.spec.ts` — carry → T12
- `test/native-reading-voice-profile.test.mjs`: -
- `test/native-resident-request-deadline.test.mjs`: android-jvm — carry → H8
- `test/native-stream-admission.test.mjs`: android-jvm — carry → H8
- `test/native-voice-event-worker.test.mjs`: android-jvm — carry → H8
- `test/navigation-voice.test.mjs`: -
- `test/note-recorder-permission-recovery.test.mjs`: -
- `test/notes-empty-close.test.mjs`: `journeys/notes.spec.ts`, notes integration — carry → T8
- `test/notes-recorder-controls.test.mjs`: 3 assertions → `journeys/notes.spec.ts` — carry → T8
- `test/notice-owner-startup.test.mjs`: 2 assertions → `journeys/startup-permissions.spec.ts` — carry → T15
- `test/optional-view-channel-chat.test.mjs`: 2 cases → `journeys/chat.spec.ts` — carry → T3
- `test/own-provider-cancel-readback.test.mjs`: 2 assertions → `journeys/connection-cloud.spec.ts` — carry → T5
- `test/own-provider-service-restore.test.mjs`: 2 assertions → `journeys/connection-cloud.spec.ts` — carry → T5
- `test/pending-action-failure-boundary.test.mjs`: `journeys/chat.spec.ts` — carry → T3
- `test/photo-library-permission-owner.test.mjs`: -
- `test/photo-selection-cancel.test.mjs`: `photo-permitted-batch.spec.ts:47` covers
- `test/photos-debug-diagnostics.test.mjs`: -
- `test/photos-pending-read.test.mjs`: 2 cases to `journeys/camera-photos.spec.ts` — carry → T9
- `test/post-sign-in-setup.test.mjs`: 4 cases to `journeys/connection-cloud.spec.ts`, `journeys/startup-permissions.spec.ts`, `journeys/settings.spec.ts` — carry → T5
- `test/private-cloud-restore.test.mjs`: optional dev-project case in `journeys/connection-cloud.spec.ts` — carry → T5
- `test/private-preview-cartesia-route.test.mjs`: 2 cases (start timeout fence, phase captions) to `journeys/voice.spec.ts` — carry → T4 — same change as the CI plan edit of `.github/workflows/resident-android.yml`
- `test/provider-key-release-drain.test.mjs`: 1 case to `journeys/connection-cloud.spec.ts` — carry → T5
- `test/read-aloud-direct.test.mjs`: DELETE
- `test/recently-deleted.test.mjs`: DELETE; REWRITE behaviour into `journeys/camera-photos.spec.ts` — carry → T9
- `test/recovery-restart-presentation.test.mjs`: DELETE
- `test/reminder-lifecycle-pure.test.mjs`: DELETE; move the Clock repeat-days case to `test/integration/calendar.test.ts` — carry → H4
- `test/renderer-slot-policy.test.mjs`: DELETE; carry the SMS-ledger cases into Gradle `RendererCredentialSlotsTest.java` — carry → H8
- `test/resident-agent-fixture-provider-status.test.mjs`: T5
- `test/resident-binding-guard-return.test.mjs`: DELETE
- `test/resident-prebind-stop.test.mjs`: carry 1 case to connection-cloud journey
- `test/resident-recovery.test.mjs`: `resident-recovery.production.spec.ts`
- `test/resident-start-failure-policy.test.mjs`: DELETE
- `test/retired-shell-work.test.mjs`: carry typing-lease case to chat journey
- `test/scan-page-camera.test.mjs`: `scan-page-camera.spec.ts`, `scan-native-page-camera.spec.ts`
- `test/settings-refresh-text-scale.test.mjs`: carry 2 cases to `journeys/settings.spec.ts` — carry → T15
- `test/settings-signout-confirm.test.mjs`: carry 1 case to `journeys/connection-cloud.spec.ts` — carry → T5
- `test/settings-text-scale-refresh.test.mjs`: —
- `test/settings-text-scale-settlement.test.mjs`: —
- `test/shade-tile-facts.test.mjs`: carry 2 cases to `journeys/home-shell.spec.ts` (standalone) — carry → T12
- `test/share-panel-adapter.test.mjs`: 1 case `journeys/camera-photos.spec.ts` — carry → T9
- `test/share-panel-watch.test.mjs`: —
- `test/shared-onboarding-account-return.test.mjs`: — (post-sign-in specs cover)
- `test/startup-warning-retention.test.mjs`: optional 1 case `journeys/voice.spec.ts` — carry → T4
- `test/subscription-entitlement.test.mjs`: carry 3 cases to `journeys/connection-cloud.spec.ts` — carry → T5
- `test/template-style-cache.test.mjs`: none
- `test/video-capture-limit.test.mjs`: Carry the size-limit save and the size-limit failure to `journeys/camera-photos.spec.ts` — carry → T9
- `test/voice-call-interrupted-capture.test.mjs`: Carry the call pause and the `[WORKFLOW]` stripping to `journeys/voice.spec.ts` — carry → T4
- `test/voice-calm-cloud-errors.test.mjs`: Carry to `journeys/voice.spec.ts`: 429 Retry-After wait, bounded retries, 401 terminal line, on-device fallback — carry → T4
- `test/voice-copy-presentation.test.mjs`: Carry: unconfirmed cleanup blocks Talk and Transcribe with the notice
- `test/voice-denied-recovery.test.mjs`: Carry: denied mic → "Open app settings" → privacy settings → removed after a granted retry
- `test/voice-in-chat-only.test.mjs`: The rule is enforced on the built APK by `scripts/apk.ts:145-169`; startup `turnOff` is covered by `listener-invocation.production.spec.ts`
- `test/voice-owned-capture-cleanup.test.mjs`: Shares a carry with `voice-copy-presentation`
- `test/voice-prepared-navigation.test.mjs`: Carry: an unknown or mismatched view path makes no claim (`journeys/voice.spec.ts`) — carry → T4
- `test/voice-progress-presentation.test.mjs`: Owner question 3
- `test/voice-progress-state-forwarding.test.mjs`: —
- `test/voice-recovery-state.test.mjs`: —
- `test/voice-repeated-interim.test.mjs`: Carry: a repeated phrase still shows its interim text
- `test/voice-replies.test.mjs`: 3 cases → `journeys/voice.spec.ts` — carry → T4
- `test/voice-request-provenance.test.mjs`: 1 security case → `journeys/voice.spec.ts` — carry → T4
- `test/voice-requested-actions.test.mjs`: ask-first case → `journeys/voice.spec.ts` — carry → T4
- `test/voice-start-failure-copy.test.mjs`: copy cases → `journeys/voice.spec.ts` — carry → T4
- `test/workflow-adapter-recovery.test.mjs`: version-mismatch case → `test/integration/workflows-protocol.test.mjs` — carry → H7
- `test/workflow-draft-reopen.test.mjs`: 3 cases → `journeys/workflows.spec.ts` — carry → T13
- `test/workflow-execution-presentation.test.mjs`: `journeys/workflows.spec.ts` — carry → T13
- `test/workflow-management-capability.test.mjs`: 1 case → `journeys/workflows.spec.ts` — carry → T13
- `test/workflow-reminder-midnight.test.mjs`: optional dev Playwright case

**Tests of pinned upstream code (D14 follow-up)** (71)

- `test/alpha-system-entry.test.mjs`: two release rules move into `scripts/verify-apks.ts`
- `test/always-on-listener.test.mjs`: Gradle compiles the same sources; `AlphaListenerPlugin` is a delete candidate (A60) — carry → H8
- `test/aosp-listener.test.mjs`: -
- `test/aosp-retain-known-good.test.mjs`: -
- `test/apk-signer-range.test.mjs`: -
- `test/app-update-startup.test.mjs`: -
- `test/assistant-draft-dispatch.test.mjs`: 4 cases → `journeys/chat.spec.ts`; controller tests are an upstream follow-up — carry → T3
- `test/browser-construction.test.mjs`: instrumented cookie-policy test + upstream host tests
- `test/browser-site-permissions.test.mjs`: upstream CI + instrumented tests
- `test/calendar-agent-write-host.test.mjs`: upstream `managed-calendar-host.test.ts` exists
- `test/calendar-read-timing.test.mjs`: upstream test follow-up
- `test/camera-capture-mode-patch.test.mjs`: quality check as a camera journey step
- `test/camera-preview-recovery.test.mjs`: ~10 steps in `journeys/camera-photos.spec.ts` — carry → T9
- `test/camera-resume.test.mjs`: upstream `host-ports.test.ts`
- `test/cloud-email-resend.test.mjs`: upstream follow-up
- `test/cloud-sign-in-network.test.mjs`: `test/integration/connection-cloud.test.mjs`; upstream follow-up — carry → H2
- `test/committed-view-observation.test.mjs`: Quint refinement keeps it
- `test/deletion-window.test.mjs`: upstream follow-up
- `test/files-agent-patch.test.mjs`: upstream follow-up
- `test/files-browser-atomic-placement.test.mjs`: upstream follow-up
- `test/files-browser.test.mjs`: `journeys/files.spec.ts` cases; upstream follow-up — carry → T10
- `test/files-picker-lifecycle.test.mjs`: `journeys/files.spec.ts` late-picker case; upstream follow-up — carry → T10
- `test/gmail-background-binding.test.mjs`: DELETE
- `test/home-agent-navigation.test.mjs`: covered by `view-navigation.spec.ts`
- `test/live-capture-resource.test.mjs`: upstream follow-up; LiveCapture Quint replay stays
- `test/live-voice.test.mjs`: carry "live latency numbers only into diagnostics" to voice/diagnostics integration
- `test/local-agent-provider-admission.test.mjs`: upstream follow-up; resident Quint replay compiles the classes
- `test/login-surfaces.test.mjs`: with `test/support/login-surfaces.mjs`
- `test/maps-route-distance.test.mjs`: -
- `test/native-cloud-control-jvm.test.mjs`: upstream follow-up
- `test/native-cloud-permission-handoff.test.mjs`: upstream follow-up
- `test/native-cloud-streaming.test.mjs`: `journeys/voice.spec.ts` — carry → T4
- `test/native-embedding-profile.test.mjs`: -
- `test/native-live-pcm.test.mjs`: android-jvm — carry → H8
- `test/native-live-start-cancellation.test.mjs`: -
- `test/native-read-epoch.test.mjs`: -
- `test/native-resident-capture.test.mjs`: -
- `test/native-runtime-identity-boot.test.mjs`: -
- `test/native-view-fallback-installation.test.mjs`: -
- `test/native-view-host-integration.test.mjs`: -
- `test/notes-state-trash-compat.test.mjs`: — (covered by store restarts)
- `test/notice-owner-coordinator.test.mjs`: upstream follow-up
- `test/own-provider.test.mjs`: upstream follow-up; APK content check in `verify-apks`
- `test/paradee-local-adapter.test.mjs`: -
- `test/photo-library.test.mjs`: `test/integration/photos-library-agent.test.mjs`, `test/integration/device-actions.test.ts`, APK manifest audit — carry → H6
- `test/photos-library-patch.test.mjs`: upstream follow-up: SQLite page-key case to `plugin-native-media/test/native-host/PermittedMediaTest.java`; folder retirement if `FolderSessionTest`…
- `test/photos-thumbnail-refresh.test.mjs`: 2 cases to `journeys/camera-photos.spec.ts` — carry → T9
- `test/photos-view-contract.test.mjs`: —
- `test/photos-view.test.mjs`: upstream follow-up: `photos-view.test.ts` in `packages/ui`
- `test/pixel10a-image.test.mjs`: —
- `test/pixel10a-source.test.mjs`: —
- `test/reading-capability-probe.test.mjs`: DELETE
- `test/resident-attachment.test.mjs`: also delete `scripts/test-resident-reuse.ts`, 2 fixtures
- `test/resident-build-output.test.mjs`: upstream follow-up
- `test/saved-note-speech-policy.test.mjs`: upstream follow-up
- `test/scan-document-draft-ownership.test.mjs`: upstream follow-up
- `test/secure-store-memory.test.mjs`: upstream follow-up
- `test/stopped-reply-match.test.mjs`: 1 case `journeys/chat.spec.ts` — carry → T3
- `test/task-service-stop.test.mjs`: duplicate of Quint TaskService refinement + upstream suite
- `test/trusted-worker-prelude.test.mjs`: instrumentation asset staging
- `test/tts-worker-lifecycle.test.mjs`: with `scripts/test-tts-*.ts`
- `test/voice-assistant.test.mjs`: Duplicates `vendor/eliza/packages/voice/src/voice-assistant-session.test.ts` and `live-voice-session.test.ts`. Diff the case lists first; missing cas…
- `test/voice-capture-lifecycle.test.mjs`: Upstream owns it
- `test/voice-capture-retirement.test.mjs`: Upstream owns it
- `test/voice-completed-action-context.test.mjs`: Covered by `voice-owned-navigation.spec.ts`
- `test/voice-context-loss.test.mjs`: Upstream owns it
- `test/voice-credit-terminal.test.mjs`: Billing is covered by `billing-recovery.production.spec.ts`
- `test/wallet-disabled.test.mjs`: NFC ban → `verify-apks.ts`; connector ban → agent staging
- `test/workflow-approval-poster.test.mjs`: upstream follow-up
- `test/workflow-scope.test.mjs`: upstream `workflow-scope.test.ts`
- `test/workflow-source-publication.test.mjs`: upstream follow-up

**Duplicate of a Quint replay or campaign (T4)** (44)

- `test/accessibility-timeout.test.mjs`: covered by the `accessible-toast-lifetime` Quint replay and `shell-toast.spec.ts`
- `test/app-update-automatic.test.mjs`: carry 3 cases to journeys/settings.spec.ts — carry → T15
- `test/appearance-preference.test.mjs`: `journeys/settings.spec.ts` (query override, production); Quint already in the application refinement aggregate — carry → T15
- `test/browser-deletion-recovery.test.mjs`: Quint orphan harness + calendar delete journeys
- `test/browser-external-handoff-refinement.test.mjs`: aggregate `quint-application-refinement` already runs it; fixture survives
- `test/browser-popup-opener.test.mjs`: `journeys/browser.spec.ts`; Quint tab-lifecycle replays the same code — carry → T10
- `test/browser-presentation-lifecycle.test.mjs`: `journeys/browser.spec.ts`; Quint surface-presentation replays the same region — carry → T10
- `test/calendar-mounted-draft-handoff.test.mjs`: duplicate of Quint `canonical-calendar-draft-handoff`
- `test/calendar-mounted-edit-admission.test.mjs`: duplicate of Quint `canonical-calendar-editor-close`
- `test/calendar-mounted-editor.test.mjs`: duplicate of Quint `canonical-calendar-editor-close`
- `test/camera-rapid-leave.test.mjs`: duplicate of Quint `camera-preview-retirement`
- `test/canonical-calendar-draft-ownership.test.mjs`: Quint `canonical-calendar-draft` replay keeps the fixture
- `test/canonical-notes-draft-copy.test.mjs`: `canonical-notes-draft-copy.spec.ts` + checklist case
- `test/chat-attachment-composer.test.mjs`: Quint aggregate already runs it
- `test/core-runtime-transform.test.mjs`: covered by `core-runtime/turns.mjs` replay
- `test/files-index.test.mjs`: FilesRecentIndex Quint (port to import)
- `test/first-send-draft-migration.test.mjs`: Quint runner; PORT the refinement to import
- `test/hosted-notice-question.test.mjs`: covered by Quint + notice specs
- `test/invocation-owner-cache.test.mjs`: expiry harness to Gradle JVM tests or a resident Quint expiry action — carry → H8
- `test/keyboard-dictation.test.mjs`: covered by KeyboardDictation/KeyboardDictationCloud replays and `scripts/apk.ts` audit; delete `test/fixtures/KeyboardDictationPolicyTest.java` — same change: drop the path from `specs/quint/native/manifest.json` (formal plan)
- `test/local-conversation-cleanup.test.mjs`: RendererSpeechChunk + SpeechCleanupLatch replays
- `test/local-speech-native-drain.test.mjs`: RendererSpeechChunk replay
- `test/message-draft.test.mjs`: -
- `test/mobile-uuid-build.test.mjs`: fixture kept
- `test/modal-scrim-ownership.test.mjs`: fixture kept
- `test/native-browser-view-binding.test.mjs`: `journeys/browser.spec.ts` — carry → T10
- `test/native-deletion-review-admission.test.mjs`: -
- `test/native-digest-sources.test.mjs`: (+ `test/fixtures/NativeDigestSourcesTest.java`)
- `test/notes-recorder-media-admission.test.mjs`: —
- `test/pending-action-background-recovery.test.mjs`: Quint PendingActionRecovery replay covers
- `test/prepare-local-agent-requalify.test.mjs`: with `--requalify-from` (no caller); else redundant with `prepared-source-stamp` replay
- `test/reset-wiring.test.mjs`: device: `ResetPolicyInstrumentedTest`; Quint reset-orchestration
- `test/resident-credential-shutdown-retry.test.mjs`: dup of Quint `resident-coordinator`
- `test/resident-recovery-review.test.mjs`: dup of Quint `resident-coordinator`
- `test/resident-result-transport.test.mjs`: dup of Quint `hosted-inbox` harness
- `test/retained-reminder-tap-admission.test.mjs`: dup of application refinement aggregate
- `test/scheduled-task-controls.test.mjs`: dup of application refinement aggregate
- `test/scoped-calendar-snapshot.test.mjs`: identical run in Quint `scoped-calendar-review-platform.mjs:170-171`
- `test/shade-notice-question.test.mjs`: 1 case `journeys/notifications.spec.ts` — carry → T11
- `test/shade-row-custody.test.mjs`: — (Quint harness keeps fixture until PORT)
- `test/source-renewal-question.test.mjs`: — (Quint + `digest-source-renewal.spec.ts`)
- `test/task-service-sql-concurrency.test.mjs`: duplicate of Quint TaskService refinement scenario
- `test/trigger-cursor-isolation.test.mjs`: none
- `test/workflow-trigger-detection.test.mjs`: Lemma, Quint, dev spec already cover

**Source text, inventory, constants (T1)** (30)

- `test/aosp-cloud-power-defaults.test.mjs`: -
- `test/aosp-image-capability.test.mjs`: test/integration/phone-sms-contacts.test.ts; test/tooling/aosp.test.ts — carry → H6
- `test/browser-host-source-closure.test.mjs`: Android build's duplicate-class check is the evidence
- `test/browser-web-features.test.mjs`: instrumented browser tests; loopback rule to the APK audit
- `test/campaign-speech-routes.test.mjs`: none
- `test/cloud-membership-ui.test.mjs`: account-sheet journey
- `test/conversation-history-refresh.test.mjs`: optional `journeys/chat.spec.ts` step — carry → T3
- `test/device-plugin-diagnostics.test.mjs`: -
- `test/digest-delegation-host.test.mjs`: -
- `test/digest-restart-input.test.mjs`: -
- `test/embedding-host-producer-closure.test.mjs`: -
- `test/embedding-workflow-forwarding.test.mjs`: -
- `test/gesture-zones-single-instance.test.mjs`: owner question on single-instance coverage
- `test/image-contacts-admission.test.mjs`: 1 case in Contacts journey
- `test/launcher-orientation.test.mjs`: device: `RotationInstrumentedTest`; optional APK-audit rule
- `test/live-asr-route-token.test.mjs`: —
- `test/locale-time-usage.test.mjs`: (optional ESLint rule)
- `test/maps-notification-open.test.mjs`: (+ `test/fixtures/NavigationOpenRequestTest.java`)
- `test/native-deletion-admission.test.mjs`: -
- `test/native-voice-listener-rules.test.mjs`: -
- `test/one-runtime-profile.test.mjs`: with `scripts/removed-profile-flags.ts`
- `test/owner-emulator-campaign-check.test.mjs`: - — update `scripts/owner/emulator-campaign-check.ts`
- `test/owner-incident-response.test.mjs`: `test/tooling/owner-tools.test.ts`
- `test/playwright-projects.test.mjs`: 3-line load-time check in `playwright.config.ts`
- `test/product-identity.test.mjs`: manifest rules → `scripts/verify-apks.ts`; 2 cases → `test/tooling/android-build.test.mjs`
- `test/qualified-app-update.test.mjs`: Python suite runs from the collector; workflow policy → optional workflow linter
- `test/resident-native-patch-admission.test.mjs`: DELETE
- `test/scripts-typescript.test.mjs`: `typecheck:scripts`
- `test/sense-packaging-ndk.test.mjs`: rule belongs to `verify-apks` / `verifyVoiceHost`
- `test/theme-palette.test.mjs`: owner question: lint rule instead

**Retired feature (D1-D5, C1-C9)** (12)

- `test/adapter-contracts.test.mjs`: area files under `test/integration/` (calendar, inbox, workflows, notes, cloud); delete `test-cloud-personal-flow.ts` (D5)
- `test/agent-calendar-mutation.test.mjs`: the script is about legacy preservation (A1) and is already broken by the A1 change; the Quint replay stays
- `test/agent-speech-environment.test.mjs`: delete `refuseRetiredSpeechNames` as well
- `test/app-record-pending-actions.test.mjs`: carry 3 cases to journeys/notes.spec.ts — carry → T8
- `test/browser-calendar-open-source.test.mjs`: none (owner: `displaySources` fallback)
- `test/calendar-connect-policy.test.mjs`: ABA fence → `test/integration/connection-cloud.test.ts` via real `google-agent-access.ts` — carry → H2
- `test/cloud-personal-protocol.test.mjs`: - (D5 personal Cloud)
- `test/connection-contracts.test.mjs`: remote-protocol suite deleted with C4; history suite dissolved into `test/integration/connection-cloud.test.ts` — carry → H2
- `test/dev-speech-settings.test.mjs`: script loses retired-key tables
- `test/paired-speech-contract.test.mjs`: -
- `test/resident-retirement-cleanup.test.mjs`: DELETE
- `test/white-label-copy.test.mjs`: "no Eliza in user copy" → `audit-production-bundle.ts`

**Other (see per-file report)** (11)

- `test/archive-scan.test.mjs`: owner question
- `test/ci-pin-bound-scripts.test.mjs`: script enforces its own pin at run time
- `test/dev-cartesia.test.mjs`: (optional `test/tooling/dev-launchers.test.ts`)
- `test/dev-ui-remote-host.test.mjs`: -
- `test/device-action-clarification-eval.test.mjs`: -
- `test/native-patch-admission.test.mjs`: `test/tooling/android-build.test.mjs`
- `test/node-test-runner.test.mjs`: -
- `test/photos-native-order.test.mjs`: —
- `test/pinned-voice-build.test.mjs`: with `scripts/build-pinned-voice.ts` (owner question)
- `test/qualify-head.test.mjs`: with `scripts/qualify-head.ts` (only tests import it)
- `test/resident-android-json-compile.test.mjs`: Android build compiles it

**Wrapper or indirection (T9)** (10)

- `test/aosp-apk-preparation.test.mjs`: -
- `test/batch-progress-stream.test.mjs`: `test/integration/voice-progress.test.ts` — carry → H3
- `test/batch-voice-progress-ack.test.mjs`: `test/integration/voice-progress.test.ts` — carry → H3
- `test/cloud-signing-input.test.mjs`: one line in Python collector
- `test/home-overview-cards.test.mjs`: covered by `home-daily-overview.spec.ts`
- `test/hosted-digest-panel.test.mjs`: optional 1 case `journeys/workflows.spec.ts` — carry → T13
- `test/own-notice-question.test.mjs`: with `scripts/test-own-notice-question.ts`
- `test/owner-route-native-import.test.mjs`: covered by owner-route-parity
- `test/packaged-runtime.test.mjs`: `python-suites.test.mjs` / TS port
- `test/resident-crash-diagnostics.test.mjs`: also `scripts/ci/test-resident-uid-crash-audit.py`

**Duplicate of a Playwright spec (T4)** (9)

- `test/browser-errors.test.mjs`: `browser-profile-unsupported.production.spec.ts`
- `test/browser-local-transcription.test.mjs`: duplicate of `browser-speech.spec.ts`; 1 case to `journeys/voice.spec.ts`
- `test/browser-startup-permissions.test.mjs`: `journeys/startup-permissions.spec.ts`, 3 cases — carry → T15
- `test/calendar-end-after-start.test.mjs`: DST-gap step into `journeys/calendar.spec.ts` — carry → T7
- `test/cloud-maps-session.test.mjs`: `journeys/maps.spec.ts` account switch — carry → T11
- `test/home-shell.test.mjs`: 3 cases in `journeys/home-shell.spec.ts` — carry → T12
- `test/photo-viewport.test.mjs`: `journeys/camera-photos.spec.ts` — carry → T9
- `test/scan-event.test.mjs`: `scan-event.spec.ts`
- `test/voice-composer-recovery.test.mjs`: Twin of the Playwright spec with the same name

**Test of the test machinery (T5)** (6)

- `test/flag-off-navigation-protocol.test.mjs`: DELETE
- `test/notes-capacity-fixture.test.mjs`: -
- `test/strip-types-compat.test.mjs`: with `test/support/strip-types.mjs`
- `test/test-helpers.test.mjs`: none
- `test/voice-fixture-failure-metadata.test.mjs`: T5
- `test/workflow-device-bindings-fixture.test.mjs`: none

**Unit test (T3)** (5)

- `test/android-cloud-voice-timing.test.mjs`: delete the script too unless the owner still runs it
- `test/client-observation-handshake.test.mjs`: optional Calendar chat step
- `test/owner-merge-review.test.mjs`: -
- `test/password-dev-editor.test.mjs`: -
- `test/workflow-presentation-probe.test.mjs`: with B2 cleanup of the probe

### 1.2 Playwright specs (90)

**Dev simulator or browser stand-in only (P7, D19)** (30)

- `test/browser/browser-audio.spec.ts`: —
- `test/browser/browser-foreground.spec.ts`: —
- `test/browser/calendar-agent-all-day-review.spec.ts`: —
- `test/browser/calendar-modal-draft.spec.ts`: (one dev case only if web editor stays)
- `test/browser/calendar-transaction-cancel.spec.ts`: —
- `test/browser/dev-calendar-alert-boundaries.spec.ts`: —
- `test/browser/dev-calendar-alerts.spec.ts`: —
- `test/browser/dev-calendar-all-day-save.spec.ts`: —
- `test/browser/dev-calendar-conversion.spec.ts`: —
- `test/browser/dev-calendar-cross-tab.spec.ts`: —
- `test/browser/dev-calendar-editor.spec.ts`: —
- `test/browser/dev-calendar-guests.spec.ts`: —
- `test/browser/dev-calendar-meeting-lifecycle.spec.ts`: —
- `test/browser/dev-calendar-meeting.spec.ts`: —
- `test/browser/dev-calendar-response.spec.ts`: —
- `test/browser/dev-digest-delegation.spec.ts`: (Q-HOST-5; if kept, one journey in workflows)
- `test/browser/dev-network.spec.ts`: —
- `test/browser/dev-notification-queue.spec.ts`: (covered by `dev-notifications.spec.ts`)
- `test/browser/dev-parity.spec.ts`: carry device-controls round trip → `journeys/dev-surface.spec.ts`; calendar edit-during-review conflict → `journeys/calendar.spec.ts` only if no cale… — carry → T14
- `test/browser/dev-workflow-automatic-speech.spec.ts`: —
- `test/browser/dev-workflow-calendar.spec.ts`: —
- `test/browser/dev-workflow-files.spec.ts`: —
- `test/browser/dev-workflow-focus.spec.ts`: —
- `test/browser/dev-workflow-history.spec.ts`: —
- `test/browser/dev-workflow-messages.spec.ts`: —
- `test/browser/dev-workflow-speech.spec.ts`: —
- `test/browser/location-settings-recovery.spec.ts`: -
- `test/browser/reminder-notification-dismissal.spec.ts`: –
- `test/browser/source-reference-integrity.spec.ts`: —
- `test/browser/upstream-client-features.spec.ts`: — (upstream follow-up)

**Retired feature or legacy data (D1-D5)** (22)

- `test/browser/adapters.spec.ts`: 4 scripts → journeys; 4 deleted with C4 / D1 / D3
- `test/browser/assistant-draft-storage.spec.ts`: —
- `test/browser/calendar-backup-restore.spec.ts`: —
- `test/browser/calendar-recovery.spec.ts`: —
- `test/browser/chat-system-notices.spec.ts`: `journeys/chat.spec.ts` — carry → T3
- `test/browser/cloud-personal-intent-storage.spec.ts`: with C4 personal Cloud
- `test/browser/cloud-personal-onboarding.spec.ts`: with C4
- `test/browser/connection-preference-storage.spec.ts`: with C4; drop from `scripts/storage-specs.ts`
- `test/browser/dev-cloud-identity.spec.ts`: (C4 / D5)
- `test/browser/dev-cloud-scenarios.spec.ts`: (C4 / D5)
- `test/browser/dev-cloud-setup.spec.ts`: (C4 / D5)
- `test/browser/dev-connected-voice.spec.ts`: (C4)
- `test/browser/dev-digest-live.spec.ts`: (Q-HOST-5)
- `test/browser/dev-wallet.spec.ts`: (D2)
- `test/browser/dev-workflow-dates.spec.ts`: —
- `test/browser/dev-workflow-receipts.spec.ts`: —
- `test/browser/domain-initialization.spec.ts`: also remove it from `scripts/storage-specs.ts`
- `test/browser/legacy-list-identity.spec.ts`: -
- `test/browser/media-copy-intent-storage.spec.ts`: remove from `storage-specs.ts`
- `test/browser/note-audio-native-fence.spec.ts`: DELETE
- `test/browser/password-provider-storage.spec.ts`: 1 case → `journeys/settings.spec.ts` — carry → T15
- `test/browser/reminder-creation-storage.spec.ts`: –

**Unit test in a browser (T6)** (22)

- `test/browser/attachment-lifecycle.spec.ts`: —
- `test/browser/browser-agent-tts.spec.ts`: — — same change as the CI plan edit of `.github/workflows/browser.yml`
- `test/browser/browser-cloud-bootstrap.spec.ts`: (optional step in `journeys/connection-cloud.spec.ts`) — carry → T5
- `test/browser/browser-credential-cas.spec.ts`: —
- `test/browser/browser-voice-registration.spec.ts`: dev smoke keeps "Device controls opens"
- `test/browser/calendar-agent-transaction-cancel.spec.ts`: —
- `test/browser/calendar-options.spec.ts`: replacement case in calendar production journey
- `test/browser/conversation-selection-storage.spec.ts`: carry 2 cases to `journeys/chat.spec.ts`; drop from `storage-specs.ts` — carry → T3
- `test/browser/dev-connection-pagehide.spec.ts`: —
- `test/browser/dev-digest-storage.spec.ts`: —
- `test/browser/dev-file-picker.spec.ts`: —
- `test/browser/notes-browser-segments.spec.ts`: DELETE
- `test/browser/notification-route-lifecycle.spec.ts`: `journeys/notifications.spec.ts` — carry → T11
- `test/browser/photo-filter-fallback.spec.ts`: —
- `test/browser/reminder-action-storage.spec.ts`: `journeys/reminders.spec.ts` — carry → T7
- `test/browser/reminder-lifecycle.spec.ts`: `journeys/reminders.spec.ts` — carry → T7
- `test/browser/shaw-ui-fixtures.spec.ts`: `journeys/home-shell` (confirmed-empty Home) — carry → T12
- `test/browser/simulator-concurrency.spec.ts`: —
- `test/browser/video-timestamp-boundaries.spec.ts`: —
- `test/browser/view-navigation.spec.ts`: `journeys/chat.spec.ts` — carry → T3
- `test/browser/workflow-notice-lifecycle.spec.ts`: –
- `test/browser/workflow-notification-recovery.spec.ts`: –

**Other (see per-file report)** (11)

- `test/browser/browser-cloud-dev.spec.ts`: (owner: Node integration test of dev bridges)
- `test/browser/browser-host-disclosure.spec.ts`: — — same change as the CI plan edit of `.github/workflows/browser.yml`
- `test/browser/chat-dictation-api.spec.ts`: none (product: dictation mode is unreachable)
- `test/browser/dev-reload.spec.ts`: none (optional Node test if plugin kept)
- `test/browser/fixtures-empty-runtime.spec.ts`: `production-surface.spec.ts:202` and the bundle audit cover it on the real bundle
- `test/browser/home-assistant-surface.spec.ts`: 3 assertions → home-shell assistant case
- `test/browser/large-text-layout.spec.ts`: `journeys/accessibility.spec.ts` — carry → T14
- `test/browser/live-voice.spec.ts`: -
- `test/browser/login-field-reporter.spec.ts`: -
- `test/browser/reset-only.production.spec.ts`: `journeys/production-gating.spec.ts` (prod) — carry → T14
- `test/browser/workflow-retirement.spec.ts`: –

**Test of the test machinery (T5)** (3)

- `test/browser/accessibility-audit.spec.ts`: (optional canary, see Q1)
- `test/browser/map-label-contrast.spec.ts`: token pair → `harness/a11y.ts` table
- `test/browser/reduced-motion-harness.spec.ts`: `journeys/accessibility.spec.ts` — carry → T14

**Duplicate coverage (T4)** (2)

- `test/browser/dev-calendar-preferences.spec.ts`: add `textScale:150` to the kept month-dialog step
- `test/browser/dock-clearance.spec.ts`: covered by the Quint dock-clearance-ownership replay and layout journeys

### 1.3 Python tests (5)

- `test/android-app-abi-selection.test.py`: also remove its line from `test/python-suites.test.mjs`
- `test/aosp-apk-preparation.py`: -
- `test/emulator-microphone-preflight.test.py`: -
- `test/resident-crash-diagnostic.test.py`: remove `python-suites.test.mjs:27`, `resident-android.yml:245` — same change as the CI plan edit of `.github/workflows/resident-android.yml`
- `test/update-channel-gradle.test.py`: never run

### 1.4 Quint wrappers and aggregates (all 292 `test/quint-*.test.mjs`; Q1)

(a) 143 DELETE: the wrapper re-runs a driver a family index already runs, re-runs an aggregate, or replays a legacy/historical
model (D11). Deleted when `test/quint/refinement.test.mjs` exists. Paths under `test/`:

`quint-application-refinement.test.mjs`, `quint-client-feature-publication.test.mjs`, `quint-client-observation-support.test.mjs`, `quint-cloud-connection-notices.test.mjs`, `quint-cloud-plan-recheck.test.mjs`, `quint-cloud-qa-launcher.test.mjs`, `quint-combined-agent-launcher-refinement.test.mjs`, `quint-committed-view-observation.test.mjs`, `quint-contacts-session.test.mjs`, `quint-copy-receipt.test.mjs`, `quint-core-approval-service.test.mjs`, `quint-core-interaction-session.test.mjs`, `quint-core-interactive-task-traces.test.mjs`, `quint-core-plugin-lifecycle-refinement.test.mjs`, `quint-core-retirement.test.mjs`, `quint-core-runtime-lifecycle-refinement.test.mjs`, `quint-core-service-lifecycle-design-refinement.test.mjs`, `quint-core-service-lifecycle.test.mjs`, `quint-core-shutdown.test.mjs`, `quint-core-task-scheduling.test.mjs`, `quint-core-task-service-refinement.test.mjs`, `quint-core-turns.test.mjs`, `quint-credential-leases.test.mjs`, `quint-current-approval-service.test.mjs`, `quint-development-digest-pending.test.mjs`, `quint-device-action-review.test.mjs`, `quint-dock-clearance-ownership.test.mjs`, `quint-drawer-interaction.test.mjs`, `quint-email-suggestion-review.test.mjs`, `quint-embedding-sql-refinement.test.mjs`, `quint-embedding-store-identity.test.mjs`, `quint-fact-write-dedupe-refinement.test.mjs`, `quint-fact-write-scope.test.mjs`, `quint-files-browser-controller.test.mjs`, `quint-files-filter.test.mjs`, `quint-gmail-agent-mailbox-recovery.test.mjs`, `quint-google-access-publication.test.mjs`, `quint-google-browser-return-claim.test.mjs`, `quint-google-calendar-access-choice.test.mjs`, `quint-google-calendar-disconnect.test.mjs`, `quint-google-calendar-link-flow.test.mjs`, `quint-google-calendar-link-publication.test.mjs`, `quint-google-consent-admission.test.mjs`, `quint-historical-calendar-navigation.test.mjs`, `quint-historical-camera-session.test.mjs`, `quint-home-failure-notice.test.mjs`, `quint-home-gesture.test.mjs`, `quint-home-instance-handoff.test.mjs`, `quint-hosted-background-admission.test.mjs`, `quint-hosted-digest-mutation.test.mjs`, `quint-hosted-digest-refresh.test.mjs`, `quint-hosted-notice-question.test.mjs`, `quint-inbox-cleanup.test.mjs`, `quint-inbox-coordinator.test.mjs`, `quint-inbox-edit-coalescer.test.mjs`, `quint-inbox-list-paging.test.mjs`, `quint-inbox-provider-drafts.test.mjs`, `quint-indicator-provider.test.mjs`, `quint-keyboard-dictation-cloud.test.mjs`, `quint-launcher-favorites.test.mjs`, `quint-launcher-observer.test.mjs`, `quint-launcher-ownership.test.mjs`, `quint-legacy-campaign-report.test.mjs`, `quint-legacy-chat-input-refinement.test.mjs`, `quint-legacy-files-browser-refinement.test.mjs`, `quint-legacy-google-connect-refinement.test.mjs`, `quint-legacy-home-layout-refinement.test.mjs`, `quint-legacy-maps-refinement.test.mjs`, `quint-legacy-notes-view-refinement.test.mjs`, `quint-legacy-photos-library-refinement.test.mjs`, `quint-legacy-settings-nav-refinement.test.mjs`, `quint-legacy-sign-in-refinement.test.mjs`, `quint-lifeops-scheduled-task-route.test.mjs`, `quint-list-focus-refinement.test.mjs`, `quint-listener-input.test.mjs`, `quint-listener-service.test.mjs`, `quint-listener-store.test.mjs`, `quint-live-capture.test.mjs`, `quint-maps-connection.test.mjs`, `quint-maps-event-return.test.mjs`, `quint-maps-guidance-voice.test.mjs`, `quint-maps-reroute-ownership.test.mjs`, `quint-maps-screen-source.test.mjs`, `quint-mms-compose.test.mjs`, `quint-mobile-bundle-admission.test.mjs`, `quint-modal-toast-forwarding.test.mjs`, `quint-mounted-update-admission.test.mjs`, `quint-native-action-recovery.test.mjs`, `quint-native-app-info-handoff.test.mjs`, `quint-native-assistant-entry.test.mjs`, `quint-native-calendar-scoped-review.test.mjs`, `quint-native-calendar-sync-enable.test.mjs`, `quint-native-clock-review.test.mjs`, `quint-native-conformance.test.mjs`, `quint-native-crash-journal.test.mjs`, `quint-native-deletion-review-admission.test.mjs`, `quint-native-digest-consent.test.mjs`, `quint-native-gmail-background.test.mjs`, `quint-native-google-access-file.test.mjs`, `quint-native-google-host-artifact.test.mjs`, `quint-native-hosted-inbox.test.mjs`, `quint-native-hosted-result-notices.test.mjs`, `quint-native-maps-location.test.mjs`, `quint-native-mms-dispatch.test.mjs`, `quint-native-navigation-ownership.test.mjs`, `quint-native-recording.test.mjs`, `quint-native-reminder-delivery.test.mjs`, `quint-native-request-withdrawal.test.mjs`, `quint-native-settings-handoff.test.mjs`, `quint-native-sms-dispatch.test.mjs`, `quint-native-source-renewal.test.mjs`, `quint-native-stream-bridge.test.mjs`, `quint-native-text-scale-lifecycle.test.mjs`, `quint-native-update-activation.test.mjs`, `quint-native-update-composition.test.mjs`, `quint-native-update-staging.test.mjs`, `quint-native-view-subscription.test.mjs`, `quint-native-voice-draft.test.mjs`, `quint-navigation-progress.test.mjs`, `quint-note-permission.test.mjs`, `quint-observation-turn-dispatch.test.mjs`, `quint-on-device-recognizer.test.mjs`, `quint-os-application-refinement.test.mjs`, `quint-permission-choices.test.mjs`, `quint-permission-coordinator-refinement.test.mjs`, `quint-personal-assistant-scheduled-task-custody.test.mjs`, `quint-phone-session.test.mjs`, `quint-photos-owned-album.test.mjs`, `quint-photos-trash.test.mjs`, `quint-photos-window.test.mjs`, `quint-pilot-update-refinement.test.mjs`, `quint-piped-capture.test.mjs`, `quint-plan-admission-grace.test.mjs`, `quint-plugin-connector-custody.test.mjs`, `quint-prepared-source-stamp.test.mjs`, `quint-prepared-workflow-worker.test.mjs`, `quint-provider-execution-refinement.test.mjs`, `quint-refinement-campaigns.test.mjs`, `quint-room-handler-queue.test.mjs`, `quint-services-refinement.test.mjs`, `quint-single-flight-refinement.test.mjs`, `quint-task-scheduler-refinement.test.mjs`, `quint-tla-inventory.test.mjs`

(b) 141 MERGE/PORT/MOVE: deleted by Q1 only after the formal plan registered the driver in its family index, moved the
inline replay into `specs/quint/refinement/application/`, or ported the slicing harness to imports (test-45 and test-46 per-file
verdicts; 49 of them come from the test-44 group row of 49 other wrappers, MERGE as runner entries). Paths under `test/`:

`quint-accessible-toast-lifetime.test.mjs`, `quint-account-sheet-refinement.test.mjs`, `quint-address-input.test.mjs`, `quint-agent-calendar-event-return.test.mjs`, `quint-agent-calendar-mutation.test.mjs`, `quint-agent-calendar-refresh.test.mjs`, `quint-agent-calendar-sync-control.test.mjs`, `quint-android-browser-module-stage.test.mjs`, `quint-android-build-input-readiness.test.mjs`, `quint-android-gzip-asset-stage.test.mjs`, `quint-app-info-handoff-composition.test.mjs`, `quint-app-update-candidate.test.mjs`, `quint-approval-decision.test.mjs`, `quint-asr-pipe.test.mjs`, `quint-automatic-app-update-schedule.test.mjs`, `quint-automation-request-settlement.test.mjs`, `quint-back-dispatch.test.mjs`, `quint-batch-capture-completion.test.mjs`, `quint-bookmarks-hydration.test.mjs`, `quint-browser-album-storage.test.mjs`, `quint-browser-cloud-request-custody.test.mjs`, `quint-browser-deletion-poll.test.mjs`, `quint-browser-files-trash-refinement.test.mjs`, `quint-browser-hosted-result-notice.test.mjs`, `quint-browser-journal-retention-refinement.test.mjs`, `quint-browser-note-recording-journal.test.mjs`, `quint-browser-owner-reminder-action.test.mjs`, `quint-browser-owner-reminder-read.test.mjs`, `quint-browser-reminder-orphan-refinement.test.mjs`, `quint-browser-reviews.test.mjs`, `quint-browser-session-persistence.test.mjs`, `quint-browser-surface-navigation.test.mjs`, `quint-browser-surface-presentation.test.mjs`, `quint-browser-tab-lifecycle.test.mjs`, `quint-calendar-agent-selection.test.mjs`, `quint-calendar-approval-review.test.mjs`, `quint-camera-focus-writes.test.mjs`, `quint-camera-preview-retirement.test.mjs`, `quint-canonical-calendar-draft-handoff.test.mjs`, `quint-canonical-calendar-draft.test.mjs`, `quint-canonical-calendar-editor-close.test.mjs`, `quint-canonical-notes-controller.test.mjs`, `quint-canonical-notes-draft.test.mjs`, `quint-canonical-notes-feedback.test.mjs`, `quint-canonical-notes-mutation.test.mjs`, `quint-canonical-notes-refinement.test.mjs`, `quint-canonical-notes-view.test.mjs`, `quint-canonical-notification-tap-admission.test.mjs`, `quint-canonical-notification-tap-refinement.test.mjs`, `quint-capture-frames.test.mjs`, `quint-chat-dock.test.mjs`, `quint-composer-send.test.mjs`, `quint-composition-refinement.test.mjs`, `quint-conformance.test.mjs`, `quint-connection-controller.test.mjs`, `quint-day-anchor.test.mjs`, `quint-delegation-receiver.test.mjs`, `quint-files-recent-index.test.mjs`, `quint-find-in-page.test.mjs`, `quint-fixture-busy-latch.test.mjs`, `quint-home-surface.test.mjs`, `quint-inert-hold.test.mjs`, `quint-inline-modal-focus.test.mjs`, `quint-keyboard-detectors.test.mjs`, `quint-keyboard-geometry.test.mjs`, `quint-map-plane-ownership.test.mjs`, `quint-maps-share-choice.test.mjs`, `quint-media-copy-intent.test.mjs`, `quint-native-refinement.test.mjs`, `quint-notes-document-transfer.test.mjs`, `quint-own-notice-question.test.mjs`, `quint-password-provider-dialog.test.mjs`, `quint-pending-action-recovery.test.mjs`, `quint-phone-recents.test.mjs`, `quint-quiet-voice-retry.test.mjs`, `quint-recognizer-availability.test.mjs`, `quint-recovery-ui-refinement.test.mjs`, `quint-recovery-vad-conformance.test.mjs`, `quint-reminder-decision.test.mjs`, `quint-reminder-intents.test.mjs`, `quint-reminder-refresh.test.mjs`, `quint-reminder-tap-tokens.test.mjs`, `quint-reminder-todo-attempt.test.mjs`, `quint-renderer-background-rebuild.test.mjs`, `quint-renderer-digest-queue.test.mjs`, `quint-renderer-hosted-inbox.test.mjs`, `quint-renderer-refinement.test.mjs`, `quint-renderer-speech-chunk.test.mjs`, `quint-resident-java-source-stage.test.mjs`, `quint-resident-liveness.test.mjs`, `quint-resident-maps-relay-offer.test.mjs`, `quint-resident-refinement.test.mjs`, `quint-resident-scheduling-admission.test.mjs`, `quint-resident-start-cancel.test.mjs`, `quint-retained-home-brief.test.mjs`, `quint-reviewed-copies-refinement.test.mjs`, `quint-reviewed-workflow-launcher-refinement.test.mjs`, `quint-runtime-update-pause-refinement.test.mjs`, `quint-saved-service-read.test.mjs`, `quint-scan-conformance.test.mjs`, `quint-scan-review-dialogs.test.mjs`, `quint-scheduled-snooze-admission.test.mjs`, `quint-screen-focus-ownership.test.mjs`, `quint-selected-document-viewer.test.mjs`, `quint-service-read-cache.test.mjs`, `quint-settings-capability-reads.test.mjs`, `quint-settings-listener-reads.test.mjs`, `quint-settings-session.test.mjs`, `quint-shade-pull.test.mjs`, `quint-shade-row-custody.test.mjs`, `quint-share-panel-admission.test.mjs`, `quint-shared-recording.test.mjs`, `quint-shell-screen.test.mjs`, `quint-signin-refinement.test.mjs`, `quint-sms-send.test.mjs`, `quint-source-renewal-question.test.mjs`, `quint-speech-cleanup-latch.test.mjs`, `quint-speech-gate.test.mjs`, `quint-speech-output-preparation.test.mjs`, `quint-speech-warmup.test.mjs`, `quint-startup-update-admission.test.mjs`, `quint-system-picker-visibility.test.mjs`, `quint-task-scheduler-runtime-refinement.test.mjs`, `quint-task-service-refinement.test.mjs`, `quint-trigger-cursor.test.mjs`, `quint-vault-coordinator-refinement.test.mjs`, `quint-video-edit-review.test.mjs`, `quint-video-recorder.test.mjs`, `quint-view-admission.test.mjs`, `quint-voice-owned-navigation.test.mjs`, `quint-voice-transcript-follow-refinement.test.mjs`, `quint-web-reading-review.test.mjs`, `quint-workflow-clock-admission.test.mjs`, `quint-workflow-execution-audit-admission.test.mjs`, `quint-workflow-lifecycle-change.test.mjs`, `quint-workflow-local-source.test.mjs`, `quint-workflow-notice-delivery-refinement.test.mjs`, `quint-workflow-request-recovery-admission.test.mjs`, `quint-workflow-tasks-refinement.test.mjs`, `quint-workflow-wakeups-refinement.test.mjs`, `quint-workflow-worker-staging.test.mjs`

(c) 8 absorbed by `test/quint/tooling.test.mjs` or `test/integration/local-agent.test.ts` (§2.3, §2.1).

### 1.5 Playwright helpers (5)

- `test/browser/calendar-fixture.ts` (TZ: after its importers go): `harness/storage.ts` `holdDocumentsTransaction`
- `test/browser/helpers/calendar-storage-hold.ts` (TZ: after its importers go): —
- `test/browser/helpers/native-notes.ts` (TZ: after its importers go): callers → `harness/plugins/notes.ts`
- `test/browser/helpers/note-schedule-contract.ts` (TZ: after its importers go): owner question
- `test/browser/voice-fixture-failure-metadata.ts` (TZ: after its importers go): also delete `test/voice-fixture-failure-metadata.test.mjs`

### 1.6 Host fixtures and support (62)

- `test/fixtures/CalendarListWindowTest.java` (TZ: after its importers go): —
- `test/fixtures/ClockContractTest.java` (TZ: after its importers go): upstream follow-up
- `test/fixtures/CloudSpeechTimingsTest.java` (TZ: after its importers go): upstream follow-up
- `test/fixtures/CloudSpeechWireTest.java` (TZ: after its importers go): upstream follow-up
- `test/fixtures/FilesStorageRefusalTest.java` (TZ: after its importers go): —
- `test/fixtures/FirstWriteSpeechOutputTest.java` (TZ: after its importers go): upstream follow-up
- `test/fixtures/NativeReadEpochTest.java` (TZ: after its importers go): with A61; fix Quint MediaLifecycle pins
- `test/fixtures/NavigationOpenRequestTest.java` (TZ: after its importers go): with nesting into MainActivity
- `test/fixtures/NotesCapacityFixtureTest.java` (TZ: after its importers go): A138
- `test/fixtures/PairedSpeechContractTest.java` (TZ: after its importers go): A69
- `test/fixtures/ResidentAttachDiagnosticTest.java` (TZ: after its importers go): carry 2 cases to a `Diagnostics` helper test if the class is extracted
- `test/fixtures/ResidentAttachmentTest.java` (TZ: after its importers go): duplicate of upstream `ResidentLifecycleTest.java`
- `test/fixtures/ResidentCredentialShutdownRetryTest.java` (TZ: after its importers go): covered by `resident-coordinator.mjs` Quint replay
- `test/fixtures/ResidentRequestDeadlineTest.java`: 8 deadline cases to carry once request budget is its own class — carry → H8 (§2.1 / §3.1)
- `test/fixtures/ResidentScheduleRearmTest.java` (TZ: after its importers go): covered by `specs/quint/native/conformance.mjs`
- `test/fixtures/ReviewedCopiesTest.java`: covered by `ReviewedCopiesTraces.java`; carry 4 unsafe-name rows — carry → H8 (§2.1 / §3.1)
- `test/fixtures/SerialStorageTasksTest.java` (TZ: after its importers go): lane exercised by `credential-coordinator.mjs`
- `test/fixtures/SourceRenewalNoticesTest.java` (TZ: after its importers go): covered by `source-renewal.mjs` / `SourceRenewalTraces.java`
- `test/fixtures/SpeechLeadTrimTest.java` (TZ: after its importers go): identical to upstream test
- `test/fixtures/SpeechOutputWarmupTest.java` (TZ: after its importers go): identical but one comment
- `test/fixtures/StorageWatchSlotTest.java` (TZ: after its importers go): duplicate of upstream `storage-watch.test.mjs`
- `test/fixtures/UpdateDownloadTest.java`: after carrying admission cases into `AppUpdateInstallerTest` (test-02 plan) — carry → H8 (§2.1 / §3.1)
- `test/fixtures/WorkflowApprovalNoticeTest.java`: optional 4-case merge into `test/android/workflow-notices.test.mjs` — carry → H8 (§2.1 / §3.1)
- `test/fixtures/WorkflowNoticeDeliveryTest.java`: optional 2 cases into the same merged driver — carry → H8 (§2.1 / §3.1)
- `test/fixtures/WorkflowNoticeRecoveryTest.java`: none — carry → H8 (§2.1 / §3.1)
- `test/fixtures/WorkflowNoticeTapsTest.java`: optional 1 case into the merged driver — carry → H8 (§2.1 / §3.1)
- `test/fixtures/alphaphone-auth-callback-contract.json` (T2: no importer): or wire into the overlay sign-in test (owner Q)
- `test/fixtures/appearance-preference.mjs` (TZ: after its importers go): Quint `appearance-preference-admission` PORTs; journey `journeys/settings.spec.ts` — carry → T15 — after the formal plan ports `specs/quint/refinement/application/appearance-preference-admission.mjs`
- `test/fixtures/assert-order.mjs` (TZ: after its importers go): after its T1 callers go
- `test/fixtures/automatic-update-android/OtaActivity.java` (TZ: after its importers go): with `scripts/test-automatic-update-platform.ts`, which nothing invokes
- `test/fixtures/canonical-calendar-draft-owner.mjs` (TZ: after its importers go): Quint `canonical-calendar-draft` PORTs — after the formal plan ports `specs/quint/refinement/application/canonical-calendar-draft.mjs`
- `test/fixtures/chat-attachment-composer.mjs` (TZ: after its importers go): Quint `chat-attachments` PORTs; `journeys/chat.spec.ts` — carry → T3 — after the formal plan ports `specs/quint/refinement/application/chat-attachments.mjs`
- `test/fixtures/child-suite.mjs` (TZ: after its importers go): after `scripts/test-*.ts` move into `test/`
- `test/fixtures/cloud-voice-view.d.mts` (T2: no importer): with `cloud-voice-view.mjs`
- `test/fixtures/committed-view-observation.mjs` (TZ: after its importers go): Quint driver PORTs; upstream export needed — after the formal plan ports `specs/quint/refinement/application/committed-view-observation.mjs`
- `test/fixtures/development-scope-provider.mjs` (T2: no importer): no reference anywhere
- `test/fixtures/first-send-draft-migration.mjs` (TZ: after its importers go): Quint driver PORTs (a live mechanism, not legacy data) — after the formal plan ports `specs/quint/refinement/application/first-send-draft-migration.mjs`
- `test/fixtures/google-account-panel.mjs` (TZ: after its importers go): Quint `google-*` drivers PORT; settings/connection journey — after the formal plan ports `specs/quint/refinement/application/google-calendar-access-choice.mjs`, `specs/quint/refinement/application/google-consent-admission.mjs`
- `test/fixtures/google-browser-auth/ai/eliza/auth/cloud/CloudSignInFlowTest.java` (TZ: after its importers go): MERGE the browser URL/redirect/Asset Links checks upstream
- `test/fixtures/google-browser-auth/ai/eliza/auth/cloud/CloudSignInReadinessTest.java.txt` (TZ: after its importers go): MERGE browser-gate loop upstream
- `test/fixtures/google-browser-auth/native-sign-in.test.mjs` (TZ: after its importers go): MERGE its one Alpha-only test (browser start) upstream
- `test/fixtures/google-browser-auth/upstream-base.json` (TZ: after its importers go): none
- `test/fixtures/google-cancel-boundary.mjs` (TZ: after its importers go): with `test/google-cancel-boundary.test.mjs`; cases → `journeys/connection-cloud.spec.ts` — carry → T5
- `test/fixtures/quint/ChatInputCurrentComparison.qnt` (TZ: after its importers go): with `specs/quint/legacy/chat-input` — after `specs/quint/legacy` retirement (formal plan)
- `test/fixtures/quint/FilesBrowserComparison.qnt` (TZ: after its importers go): with `specs/quint/legacy/files-browser` — after `specs/quint/legacy` retirement (formal plan)
- `test/fixtures/quint/HomeLayoutComparison.qnt` (TZ: after its importers go): with `specs/quint/legacy/home-layout` — after `specs/quint/legacy` retirement (formal plan)
- `test/fixtures/quint/MapsComparison.qnt` (TZ: after its importers go): with `specs/quint/legacy/maps` — after `specs/quint/legacy` retirement (formal plan)
- `test/fixtures/quint/NotesViewComparison.qnt` (TZ: after its importers go): with `specs/quint/legacy/notes-view` — after `specs/quint/legacy` retirement (formal plan)
- `test/fixtures/quint/PhotosLibraryComparison.qnt` (TZ: after its importers go): with `specs/quint/legacy/photos-library` — after `specs/quint/legacy` retirement (formal plan)
- `test/fixtures/quint/SettingsNavComparison.qnt` (TZ: after its importers go): with `specs/quint/legacy/settings-nav` — after `specs/quint/legacy` retirement (formal plan)
- `test/fixtures/shared-batch-voice.mjs` (TZ: after its importers go): with the voice transplant family
- `test/fixtures/source-text.mjs` (TZ: after its importers go): DELETE
- `test/fixtures/update-confirmation-android/ContinuationActivity.java` (TZ: after its importers go): with `scripts/test-update-confirmation-platform.ts`
- `test/fixtures/voice-markup.mjs` (TZ: after its importers go): both importers deleted
- `test/fixtures/workflow-device-bindings.mjs` (TZ: after its importers go): import `registerWorkflowDevice` directly
- `test/fixtures/workflow-execution-fixture.mjs` (TZ: after its importers go): `journeys/workflows.spec.ts` — carry → T13
- `test/fixtures/workflow-execution-markup.mjs` (TZ: after its importers go): DELETE
- `test/own-provider/CredentialRequestFenceTest.java` (TZ: after its importers go): upstream `plugin-native-agent/test/connection/OwnerProviderTest.java` already covers
- `test/own-provider/OwnProviderTest.java` (TZ: after its importers go): same upstream test
- `test/own-provider/OwnSpeechTest.java` (TZ: after its importers go): same upstream test
- `test/support/attachment-restoration.mjs` (TZ: after its importers go): with `notes-owner-retirement` and the transplant cases of `assistant-draft-dispatch`
- `test/support/login-surfaces.mjs` (TZ: after its importers go): with `login-surfaces.test.mjs`; policy prose to `docs/` if wanted

### 1.7 `scripts/` test bodies deleted (20; T2)

Unwired host probes, retired-feature suites and transplants of vendor source (scripts chunks 13–17). The device-campaign runners
(`scripts/test-native-*.ts`, `scripts/maps/test-native-*.ts`, `scripts/test-reminder-*.ts`, `scripts/test-calendar-regression.ts`,
`scripts/test-cross-app-notifications.ts`, `scripts/test-installed-upgrade.ts`, `scripts/test-browser-storage-format.ts`,
`scripts/test-device-timing-source.ts`, `scripts/test-local-agent-source.ts`, `scripts/test-photo-filter-png-reference.ts`) and
`scripts/ci/test-*.py` other than the one below stay with the scripts plan.

- `scripts/test-android-notification-device-slot.ts`
- `scripts/test-automatic-update-platform.ts`
- `scripts/test-cloud-personal-flow.ts`
- `scripts/test-google-accounts.ts`
- `scripts/test-native-calendar-consumer.ts`
- `scripts/test-own-notice-question.ts`
- `scripts/test-remote-protocol.ts`
- `scripts/test-reviewed-workflow-host.ts`
- `scripts/test-tts-startup.ts`
- `scripts/test-tts-worker-lifecycle.ts`
- `scripts/test-update-confirmation-platform.ts`
- `scripts/test-workflow-approval-crash.ts`
- `scripts/test-workflow-approvals-host.ts`
- `scripts/test-workflow-cancel-recovery.ts`
- `scripts/test-workflow-lifecycle-host.ts`
- `scripts/test-workflow-metadata-host.ts`
- `scripts/maps/test-prepare-region.py`
- `scripts/maps/test-region.py` — carry → H10 (2 gateway cases into `test/tooling/python/maps-regional-gateway.test.py`)
- `scripts/ci/test-pending-recovery-phases.py`
- `scripts/fixtures/workflow-host.ts`

Ledger total: 662 files deleted outright, plus every absorbed source in §2.

## 2. Target suite

After the plan: 26 integration files (+ 14 JVM drivers), 16 tooling files, 2 resident files, 1 live host file, 2 Quint runner
files, 36 journey specs and 3 live specs. Each target below lists its owning unit, the cases it must contain, and every existing
file it absorbs. "Shared" sources feed several targets and are deleted by TZ after all of them land (§5).

### 2.1 Host integration (`test/integration/`, lane `integration`)

Rules: real imports through `test/support/load-module.mjs` only where a module needs the Vite alias map; no marker slicing, no
`vm`, no `new Function`, no regex over source. Fake transports and loopback HTTP from `test/integration/support/`. Timers via
`node:test` `mock.timers`.

#### `test/integration/connection-cloud.test.ts` — H2

Cases: CloudProtocol over loopback: sign-in, account, plan, subscription, provider configuration cancellation, provider-key manager (5 cases), Google authorization URL policy, reachability, service info, managed routes, native connection headers, redeemed plan end (5), owner-route parity case table.

| Source | Verdict | Cases to carry (reviewer note) |
|---|---|---|
| `scripts/test-cloud-protocol.ts` | MOVE | loopback protocol cases; drop D5 agent parts and prototype-shape text checks |
| `scripts/test-cloud-subscription.ts` | MERGE | subscription over fake transport |
| `test/calendar-connect-policy.test.mjs` | carry from DELETE | ABA fence → `test/integration/connection-cloud.test.ts` via real `google-agent-access.ts` |
| `test/cloud-phone-login.test.mjs` | MERGE (shared by H2, T5; TZ deletes) | `test/integration/connection-cloud.test.mjs` (cases 2-3); `journeys/connection-cloud.spec.ts` (case 1) |
| `test/cloud-reachability.test.mjs` | MERGE | `test/integration/connection-cloud.test.mjs` |
| `test/cloud-service-info.test.mjs` | MERGE | `test/integration/connection-cloud.test.mjs` |
| `test/connection-browser-return.test.mjs` | carry from DELETE | 4 cases → `test/integration/connection-cloud.test.ts` (real import, function is exported) |
| `test/connection-presentation-state.test.mjs` | carry from DELETE (shared by H2, T5; TZ deletes) | ~15 cases → `connection-cloud.test.ts`, `journeys/connection-cloud`, `chat`, `settings` |
| `test/connection-recovery-state.test.mjs` | carry from DELETE | 2 cases → `connection-cloud.test.ts` (failure-kind table, identity-read retry) |
| `test/connection-step-contracts.test.mjs` | carry from DELETE | local-agent cases → `test/integration/resident-runtime.test.ts`; secrets fallback → `connection-cloud.test.ts` |
| `test/conversation-restore-safety.test.mjs` | carry from DELETE | 3 CAS cases → `connection-cloud.test.ts` after split; 1 chat reload step |
| `test/google-authorization.test.mjs` | MERGE | `test/integration/connection-cloud.test.mjs`, all cases |
| `test/managed-service-routes.test.mjs` | MERGE | `test/integration/connection-cloud.test.mjs` |
| `test/native-connection-headers.test.mjs` | REWRITE | `test/integration/connection-cloud.test.mjs` |
| `test/native-network.test.mjs` | MERGE | `test/integration/connection-cloud.test.ts` |
| `test/owner-route-parity.test.mjs` | REWRITE (shared by H2, H8; TZ deletes) | Gradle JVM connection-cloud suite + `test/integration/connection-cloud.test.ts`, shared case-table JSON |
| `test/provider-configuration-cancellation.test.mjs` | MERGE | `test/integration/connection-cloud.test.ts` |
| `test/provider-key-manager-bridge.test.mjs` | REWRITE | `test/integration/connection-cloud.test.ts` (5 cases on real exports) |
| `test/redaction-connection-switch.test.mjs` | KEEP | KEEP, MERGE into `test/integration/connection-cloud.test.ts` |
| `test/redeemed-plan-end.test.mjs` | REWRITE | REWRITE as `test/integration/connection-cloud.test.ts` cases |

#### `test/integration/dev-bridge-cloud.test.ts` — H2

Cases: browser-cloud-dev-bridge split into auth / google / services describe blocks; provider transport (2); browser secret store CAS + automation-write allow-list.

| Source | Verdict | Cases to carry (reviewer note) |
|---|---|---|
| `test/browser-cloud-dev-bridge.test.mjs` | KEEP | `test/integration/connection-cloud/{bridge-auth,bridge-google,bridge-services}.test.mjs` |
| `test/browser-provider-transport.test.mjs` | MERGE | `browser-cloud-dev-bridge.test.mjs` (connection-cloud integration), 2 cases |
| `test/browser/browser-secret-retirement.spec.ts` | REWRITE | Node storage-contract integration case, or DELETE if web secret store is dev-only |

#### `test/integration/dev-bridge-agent.test.ts` — H2

Cases: local-agent dev bridge: voice bridge, speech and TTS bridges (loopback), development conversation stream, development Cloud voice, direct transcription proxy, enabled-view transport.

| Source | Verdict | Cases to carry (reviewer note) |
|---|---|---|
| `scripts/test-agent-speech-bridge.ts` | MOVE | loopback HTTP speech bridge |
| `scripts/test-agent-tts-bridge.ts` | MOVE | loopback HTTP TTS bridge |
| `test/development-cloud-voice.test.mjs` | MERGE | `test/dev-local-agent-bridge.test.mjs` |
| `test/development-conversation-stream.test.mjs` | MERGE | `test/dev-local-agent-bridge.test.mjs` |
| `test/direct-transcription-proxy.test.mjs` | REWRITE | `test/dev-local-agent-bridge.test.mjs` |
| `test/enabled-view-transport.test.mjs` | MERGE | `test/dev-local-agent-bridge.test.mjs` |
| `test/local-agent-contracts.test.mjs` | MERGE | `test/integration/resident-runtime.test.ts` + `test/integration/dev-bridge.test.ts` |
| `test/local-agent-voice-bridge.test.mjs` | KEEP | `test/integration/dev-bridge.test.ts` with 6 sibling dev-bridge files, path-filtered |

#### `test/integration/local-agent.test.ts` — H2

Cases: LocalAgentProtocol with mock.timers: deferred feature registration (6), native events, native stream deadlines and edge kinds, request/start cancel, power launch state, resident reuse, prepared navigation route case table, conversation history, host reminder recovery, named-embedding provenance (2).

| Source | Verdict | Cases to carry (reviewer note) |
|---|---|---|
| `scripts/test-connection-history.ts` | REWRITE (shared by H2, T3; TZ deletes) | 4 cases |
| `scripts/test-local-agent-stream.ts` | MERGE | drop RemoteProtocol cases (C4) |
| `scripts/test-local-agent.ts` | MERGE | dev proxy, protocol, dev storage gating |
| `scripts/test-resident-reuse.ts` | MERGE | bridge-boundary reuse cases |
| `test/browser/host-reminder-recovery.spec.ts` | REWRITE | `test/local-agent-storage.integration.test.ts` |
| `test/calendar-managed-rejection.test.mjs` | KEEP | `test/integration/resident-runtime.test.ts` (prepared-SDK lane) |
| `test/connection-step-contracts.test.mjs` | carry from DELETE | local-agent cases → `test/integration/resident-runtime.test.ts`; secrets fallback → `connection-cloud.test.ts` |
| `test/local-agent-contracts.test.mjs` | MERGE | `test/integration/resident-runtime.test.ts` + `test/integration/dev-bridge.test.ts` |
| `test/local-agent-feature-starting.test.mjs` | REWRITE | resident-runtime integration over real `LocalAgentProtocol` + `mock.timers` (6 cases, no other coverage) |
| `test/local-agent-native-events.test.mjs` | MERGE | resident-runtime integration, real import |
| `test/local-agent-native-stream.test.mjs` | MERGE | resident-runtime integration (not delete: the browser twin does not cover deadlines) |
| `test/native-request-cancel.test.mjs` | MERGE | `test/integration/resident-runtime.test.ts` |
| `test/native-start-cancel.test.mjs` | MERGE | resident-runtime |
| `test/power-launch-state.test.mjs` | MERGE | `test/integration/resident-runtime.test.ts` |
| `test/prepared-navigation-route.test.mjs` | REWRITE (shared by H2, H8; TZ deletes) | JSON case table → `test/integration/local-agent.test.ts` + Gradle JVM gate test |
| `test/quint-named-embedding-provenance.test.mjs` | MERGE | `test/integration/agent-embeddings.test.mjs` |

#### `test/integration/alpha-client.test.ts` — H2

Cases: AlphaClient with fake transport: consumed approvals, sensitive view aborts background generation, generation ownership.

| Source | Verdict | Cases to carry (reviewer note) |
|---|---|---|
| `test/alpha-client-consumed-approvals.test.mjs` | MERGE | `test/integration/alpha-client.test.mjs`; drop the agent-adapter regex |
| `test/alpha-client-sensitive.test.mjs` | MERGE | `test/integration/alpha-client.test.mjs` |

#### `test/integration/diagnostics-export.test.ts` — H2

Cases: diagnostics export.

| Source | Verdict | Cases to carry (reviewer note) |
|---|---|---|
| `test/diagnostics-export.test.mjs` | KEEP (shared by H2, T15; TZ deletes) | `test/integration/diagnostics-export.test.mjs`; fence case to `journeys/settings.spec.ts` |

#### `test/integration/shell-settings.test.ts` — H2

Cases: error boundary Home escape.

| Source | Verdict | Cases to carry (reviewer note) |
|---|---|---|
| `test/error-boundary-home-escape.test.mjs` | KEEP | `test/integration/shell-settings.test.ts`; delete line 93 |

#### `test/integration/startup-permissions.test.ts` — H2

Cases: startup permission completion and access flow.

| Source | Verdict | Cases to carry (reviewer note) |
|---|---|---|
| `test/startup-access-flow.test.mjs` | MERGE | `test/startup-permission-completion.test.mjs` |
| `test/startup-permission-completion.test.mjs` | KEEP | — |

#### `test/integration/voice.test.ts` — H3

Cases: VoiceAssistantSession over fake transports: app speech route (8), local reply speech, planLocalSpeech credential refusal, Cloud speech chunks, voice-limit parser, voice selection hold table, voice turn routes, 15 Pixel ack cases, dev Cartesia block (~10), dev voice navigation, batch progress stream and ack (~8), auto-send entry timing, resident reading binding aborts speech.

| Source | Verdict | Cases to carry (reviewer note) |
|---|---|---|
| `scripts/test-batch-progress-stream.ts` | MOVE | real bundled stream parser |
| `scripts/test-batch-voice-progress-ack.ts` | MERGE | ~8 ack state cases |
| `test/app-speech-route.test.mjs` | REWRITE | test/integration/voice.test.ts (8 cases, needs injectable ports in app-speech.ts) |
| `test/browser/reading-review.spec.ts` | MERGE (shared by H3, T10; TZ deletes) | `journeys/browser.spec.ts` |
| `test/cloud-speech-chunks.test.mjs` | MERGE | `test/integration/voice.test.ts`; upstream follow-up |
| `test/cloud-voice-limit.test.mjs` | REWRITE (shared by H3, H8, T4; TZ deletes) | `test/integration/voice.test.ts` (parser), JVM lane, `journeys/voice.spec.ts` |
| `test/development-cartesia-conversation.test.mjs` | REWRITE | `test/integration/voice.test.ts` (dev-Cartesia block, ~10 cases) |
| `test/development-voice-navigation.test.mjs` | REWRITE (shared by H3, T4; TZ deletes) | `test/integration/voice.test.ts` + `journeys/voice.spec.ts` |
| `test/local-reply-speech.test.mjs` | REWRITE | `test/integration/voice.test.ts`, real import (bridge is already a parameter) |
| `test/local-speech-text.test.mjs` | MERGE | `test/integration/voice.test.ts`, real import of `planLocalSpeech` |
| `test/pixel-spoken-acks.test.mjs` | REWRITE | `test/integration/voice.test.ts`, 15 listed cases |
| `test/voice-entry-timing.test.mjs` | MERGE | `test/voice-timing.test.mjs`, auto-send cases only. Remove the `review` policy cases together with the D8 switch |
| `test/voice-selection.test.mjs` | REWRITE | `test/integration/voice.test.mjs` (real import; route, holds, failure-hold table) |
| `test/voice-turn-routes.test.mjs` | REWRITE | `test/integration/voice.test.mjs` (keep real-module cases) |

#### `test/integration/calendar.test.ts` — H4

Cases: calendar adapters with real imports: recurrence table, deletions, form inputs, day context, availability, approval client, agent review DST/all-day, reminder deletions, deletion notice owner staleness A-B-A, reminder card presentation, note origin (calendar half).

| Source | Verdict | Cases to carry (reviewer note) |
|---|---|---|
| `scripts/test-calendar-availability-flow.ts` | MOVE | drop text block 57-65 |
| `test/calendar-agent-review.test.mjs` | MERGE | `test/integration/calendar.test.ts` (DST + all-day review cases) |
| `test/calendar-approval-client.test.mjs` | MERGE | calendar integration (3 cases) |
| `test/calendar-availability.test.mjs` | MERGE | calendar integration (non-browser cases only) |
| `test/calendar-day-context.test.mjs` | KEEP | calendar integration |
| `test/calendar-deletions.test.mjs` | MERGE | calendar integration (3 cases) |
| `test/calendar-form-inputs.test.mjs` | MERGE | calendar integration (2 cases); legacy draft case dropped |
| `test/calendar-recurrence.test.mjs` | MERGE | calendar integration recurrence table |
| `test/deletion-notice-policy.test.mjs` | MERGE | 3 cases → `test/integration/calendar.test.ts` |
| `test/note-origin.test.mjs` | MERGE (shared by H4, H6; TZ deletes) | `test/integration/notes.test.ts`, `test/integration/calendar.test.ts` |
| `test/reminder-capability-negotiation.test.mjs` | MERGE | MERGE into `test/integration/calendar.test.ts` |
| `test/reminder-card-presentation.test.mjs` | MERGE | MERGE into `test/device-record-presentation.test.mjs` (then the calendar integration) |
| `test/reminder-deletions.test.mjs` | MERGE | MERGE into `test/integration/calendar.test.ts` |
| `test/reminder-lifecycle-pure.test.mjs` | carry from DELETE | DELETE; move the Clock repeat-days case to `test/integration/calendar.test.ts` |

#### `test/integration/calendar-agent.test.ts` — H4

Cases: AgentCalendar on a real import: serialised writes, saved-feed restore, 401/403 invalidation (rewrite of agent-calendar-refresh-state, ~8 cases), DST mutation cases.

| Source | Verdict | Cases to carry (reviewer note) |
|---|---|---|
| `scripts/test-agent-calendar-mutation-flow.ts` | MOVE | serialised writes, DST cases; remove the CalendarPreservation port (A1); sync-review routes 80-113 only if Q-CAL-1 keeps them |

#### `test/integration/calendar-google.test.ts` — H4

Cases: Google Calendar connect (part A), link status, Google accounts, calendar protocol live half.

| Source | Verdict | Cases to carry (reviewer note) |
|---|---|---|
| `scripts/test-google-calendar-protocol.ts` | MERGE | live half; calendar-sync half deleted (C3) |
| `test/google-accounts.test.mjs` | MERGE | move `scripts/test-google-accounts.ts` into `test/integration/calendar-google.test.mjs` |
| `test/google-calendar-connect.test.mjs` | MERGE | A → `calendar-google` integration; B → calendar/settings journeys |
| `test/google-calendar-link-status.test.mjs` | MERGE | `test/integration/calendar-google.test.mjs` |

#### `test/integration/reminders-clock.test.ts` — H4

Cases: browser-daily stores: calendar series, clock, journal retention (8 cases), reminder capability negotiation.

| Source | Verdict | Cases to carry (reviewer note) |
|---|---|---|
| `test/browser-calendar-series.test.mjs` | MERGE | `test/integration/browser-daily.test.mjs` |
| `test/browser-clock.test.mjs` | MERGE | `test/integration/browser-daily.test.mjs` (+1 assertion to the clock journey) |
| `test/browser-journal-retention.test.mjs` | MERGE | `test/integration/calendar-reminders.test.mjs`, 8 cases, smaller loops |
| `test/fixtures/browser-daily-stores.mjs` | KEEP | `test/integration/support/browser-daily.mjs` |
| `test/fixtures/browser-reminder-clock.mjs` | KEEP | fold into the browser-daily harness |

#### `test/integration/inbox.test.ts` — H5

Cases: inbox with real imports: mail HTML/preview/sender image, draft copies flush on hide/retire, operation guards (regressed receipt, byte budget), retention, grant withdrawal, sent cleanup, multiple drafts, secure slot allow-list agreement.

| Source | Verdict | Cases to carry (reviewer note) |
|---|---|---|
| `scripts/test-inbox-attention-flow.ts` | REWRITE (shared by H5, T6; TZ deletes) | journey + 2 pure cases |
| `scripts/test-inbox-grant-withdrawal.ts` | PORT | real import instead of vm transplant |
| `scripts/test-inbox-multiple-drafts.ts` | MERGE | string module mocks replaced by real imports |
| `scripts/test-inbox-saved-drafts.ts` | carry from DELETE | carry 1 case |
| `scripts/test-inbox-sent-cleanup.ts` | PORT | real import instead of vm transplant |
| `test/gmail-agent-read-host.test.mjs` | MERGE | `test/integration/inbox-gmail-google.test.mjs` |
| `test/gmail-grants.test.mjs` | MERGE | ~5 cases into inbox-gmail-google integration |
| `test/gmail-read-ahead.test.mjs` | MERGE | move `scripts/test-gmail-read-ahead.ts` cases into inbox-gmail-google |
| `test/google-agent-access.test.mjs` | MERGE (shared by H5, T15; TZ deletes) | host cases → inbox-gmail-google; renderer cases → `journeys/settings.spec.ts` |
| `test/inbox-draft-copies.test.mjs` | MERGE | `test/integration/inbox-gmail.test.ts`: unsaved-copy flush on hide/retire, edit during clear kept |
| `test/inbox-retention-cases.test.mjs` | MERGE | move script body into inbox integration |
| `test/inbox.test.mjs` | MERGE | child-suite bodies into inbox integration; inline case deleted |
| `test/mail-html.test.mjs` | MERGE | `test/integration/inbox.test.mjs`; delete `scripts/test-mail-html.ts` |
| `test/mail-preview.test.mjs` | MERGE | `test/integration/inbox.test.mjs` |
| `test/mail-sender-image.test.mjs` | MERGE | `test/integration/inbox.test.mjs` |

#### `test/integration/gmail-google.test.ts` — H5

Cases: Gmail agent read host, grants (~5), read-ahead (2), Google agent access host cases, Workspace return watcher, Gmail mailbox protocol.

| Source | Verdict | Cases to carry (reviewer note) |
|---|---|---|
| `scripts/test-gmail-mailbox.ts` | MERGE | protocol half only |
| `scripts/test-gmail-read-ahead.ts` | MERGE | 2 cases |
| `test/gmail-agent-read-host.test.mjs` | MERGE | `test/integration/inbox-gmail-google.test.mjs` |
| `test/gmail-grants.test.mjs` | MERGE | ~5 cases into inbox-gmail-google integration |
| `test/gmail-read-ahead.test.mjs` | MERGE | move `scripts/test-gmail-read-ahead.ts` cases into inbox-gmail-google |
| `test/google-agent-access.test.mjs` | MERGE (shared by H5, T15; TZ deletes) | host cases → inbox-gmail-google; renderer cases → `journeys/settings.spec.ts` |
| `test/google-connection-return.test.mjs` | REWRITE (shared by H5, T15; TZ deletes) | watcher cases as import-based integration; panel to settings journey |

#### `test/integration/managed-google-broker.test.ts` — H5

Cases: managed Google agent broker incl. read header, diagnostics, stage diagnostic, transport code, native Google host access.

| Source | Verdict | Cases to carry (reviewer note) |
|---|---|---|
| `test/managed-calendar-broker-read-header.test.mjs` | MERGE | `test/integration/managed-google-broker.test.mjs` |
| `test/managed-google-agent-broker.test.mjs` | KEEP | `test/integration/managed-google-broker.test.mjs` |
| `test/managed-google-broker-diagnostic.test.mjs` | MERGE | same |
| `test/managed-google-stage-diagnostic.test.mjs` | MERGE | same |
| `test/managed-google-transport-code.test.mjs` | MERGE | same |
| `test/native-google-agent-host-access.test.mjs` | KEEP | `test/integration/managed-google-broker.test.mjs` |
| `test/support/managed-google-agent.mjs` | KEEP | import host options from `scripts/native-google-product-host.ts`; move next to `test/integration/managed-google-broker.test.mjs` |

#### `test/integration/native-google-host.test.ts` — H5

Cases: native Google agent host and fetch input.

| Source | Verdict | Cases to carry (reviewer note) |
|---|---|---|
| `test/native-google-agent-host.test.mjs` | KEEP | `test/integration/native-google-host.test.mjs` |
| `test/native-google-fetch-input.test.mjs` | MERGE | native-google-host |

#### `test/integration/notes.test.ts` — H6

Cases: notes store and validator on a temp dir: logical revision (no schema 1/2 case), replay identity, store lifecycle, notes view (4), organize validator table, note origin (notes half).

| Source | Verdict | Cases to carry (reviewer note) |
|---|---|---|
| `test/note-origin.test.mjs` | MERGE (shared by H4, H6; TZ deletes) | `test/integration/notes.test.ts`, `test/integration/calendar.test.ts` |
| `test/notes-logical-revision.test.mjs` | MERGE | `test/integration/notes-store.test.mjs` (drop schema 1/2 case) |
| `test/notes-organize.test.mjs` | MERGE (shared by H6, T8; TZ deletes) | validator table → `test/integration/notes.test.mjs`; stale-revision / missing-folder agent moves → `journeys/notes.spec.ts` |
| `test/notes-replay-identity.test.mjs` | MERGE | `test/integration/notes-store.test.mjs` |
| `test/notes-store-lifecycle.test.mjs` | MERGE | `test/integration/notes-store.test.mjs` |
| `test/notes-view.test.mjs` | MERGE | `test/integration/notes.test.mjs` (4 cases) |

#### `test/integration/notes-recorder.test.ts` — H6

Cases: note recorder race cases on real imports.

| Source | Verdict | Cases to carry (reviewer note) |
|---|---|---|
| `test/notes-recorder.test.mjs` | REWRITE (shared by H6, H8, T8; TZ deletes) | race cases → `test/integration/notes-recorder.test.mjs`; flows → `journeys/notes.spec.ts`; JVM journal → `test/android-jvm/note-recorder-journal.test.mjs`; manifest chec… |

#### `test/integration/device-actions.test.ts` — H6

Cases: real DeviceActions over loopback (scripts/test-device-actions.ts as base): action policy matrix, receipt refusal matrix, browser request refusal and grounding, committed device changes, capability selection, files reviewed proposal, phone dial and telephony agent flow, telephony executor, camera action half, context sanitizer.

| Source | Verdict | Cases to carry (reviewer note) |
|---|---|---|
| `scripts/test-agent-camera-flow.ts` | REWRITE (shared by H6, T9; TZ deletes) | DeviceActions half to integration; capture to camera journey |
| `scripts/test-agent-context-browser.ts` | REWRITE (shared by H6, T3, T9; TZ deletes) | sanitizer cases to device-actions; context flows to journeys |
| `scripts/test-device-actions.ts` | MOVE | real DeviceActions over loopback HTTP: the merge base |
| `test/action-message-presentation.test.mjs` | REWRITE (shared by H6, T3; TZ deletes) | `journeys/chat.spec.ts` (one answer per browser open, live and restored); receipt refusal matrix goes to `test/integration/device-actions.test.mjs` |
| `test/agent-action-preferences.test.mjs` | MERGE | `test/integration/device-actions.test.mjs` (policy matrix); delete lines 13 and 15 |
| `test/browser-request-refusal.test.mjs` | MERGE | `test/integration/device-actions.test.mjs` with `direct-browser-grounding` |
| `test/committed-device-changes.test.mjs` | MERGE | `test/integration/device-actions.test.mjs` |
| `test/device-capability-selection.test.mjs` | MERGE | `test/integration/device-actions.test.mjs` |
| `test/direct-browser-grounding.test.mjs` | MERGE | `test/integration/device-actions.test.mjs` |
| `test/files-reviewed-proposal.test.mjs` | MERGE | `test/integration/device-actions.test.ts` |
| `test/phone-dial-agent-flow.test.mjs` | MERGE | `test/integration/device-actions.test.ts` |
| `test/telephony-agent-flow.test.mjs` | MERGE | `test/integration/device-actions.test.mjs` |
| `test/telephony-executor.test.mjs` | MERGE | `test/integration/device-actions.test.mjs` (as the real executor behind `DeviceActions`) |

#### `test/integration/phone-sms-contacts.test.ts` — H6

Cases: SMS agent flow, incomplete rows never mark read, AOSP SMS/telephony host cases, phone observer lease.

| Source | Verdict | Cases to carry (reviewer note) |
|---|---|---|
| `test/aosp-sms.test.mjs` | MERGE | test/integration/phone-sms-contacts.test.ts |
| `test/aosp-telephony.test.mjs` | MERGE | test/integration/phone-sms-contacts.test.ts |
| `test/contacts-adapter.test.mjs` | REWRITE (shared by H6, T11; TZ deletes) | `journeys/phone-sms-contacts.spec.ts` (AOSP-image Contacts) |
| `test/phone-adapter.test.mjs` | REWRITE (shared by H6, T11; TZ deletes) | `journeys/telephony.spec.ts`; observer-lease cases to `test/integration/phone-sms-contacts.test.ts` |
| `test/sms-agent-flow.test.mjs` | MERGE | `test/integration/phone-sms.test.mjs` |
| `test/sms-incomplete-rows.test.mjs` | MERGE (shared by H6, T11; TZ deletes) | `test/integration/phone-sms.test.mjs` or `journeys/phone-sms.spec.ts` |

#### `test/integration/maps.test.ts` — H6

Cases: Cloud Maps provider, chat markup, device navigation relay (drop upstream text block), Maps requests refused after account switch.

| Source | Verdict | Cases to carry (reviewer note) |
|---|---|---|
| `scripts/test-cloud-maps.ts` | MOVE | shrink failure-copy asserts |
| `scripts/test-maps-device-navigation.ts` | MOVE | delete upstream text block 109-130 |
| `test/maps-chat-markup.test.mjs` | MERGE (shared by H6, T11; TZ deletes) | `test/integration/maps.test.mjs`, `journeys/maps.spec.ts` |
| `test/maps-navigation.test.mjs` | MERGE | `test/integration/maps.test.mjs` |

#### `test/integration/photos-library.test.ts` — H6

Cases: photo library adapter and agent (moved from test/fixtures/photo-library-adapter.mjs).

| Source | Verdict | Cases to carry (reviewer note) |
|---|---|---|
| `test/fixtures/photo-library-adapter.mjs` | MOVE | `test/integration/photos-library-agent.test.mjs` (node:test, direct import) |

#### `test/integration/workflows.test.ts` — H7

Cases: workflow protocol over HTTP (scripts/test-workflow-protocol.ts as base): approval notice identity, definition bounds, device registration, lifecycle resend, notice return, output/reminder contracts, reminder read, typed schedule; automations completion/transport/when (3).

| Source | Verdict | Cases to carry (reviewer note) |
|---|---|---|
| `scripts/test-workflow-protocol.ts` | MOVE | real module + HTTP: merge base |
| `test/automation-completion.test.mjs` | MERGE | `test/integration/automations.test.mjs` |
| `test/automations-transport.test.mjs` | MERGE | `test/integration/automations.test.mjs`; cases 1-2 go with `development-cloud-agents.ts` |
| `test/automations-unified.test.mjs` | KEEP (shared by H7, T13; TZ deletes) | protocol → `test/integration/automations.test.mjs`; 7 cases → `journeys/workflows.spec.ts` |
| `test/polish-automation-when.test.mjs` | MERGE | `test/integration/automations.test.mjs` (3 cases, direct imports) |
| `test/workflow-adapter-recovery.test.mjs` | carry from DELETE | version-mismatch case → `test/integration/workflows-protocol.test.mjs` |
| `test/workflow-approval-notice-identity.test.mjs` | MERGE | `workflows-protocol.test.mjs` |
| `test/workflow-definition-bounds.test.mjs` | MERGE | `workflows-protocol.test.mjs` |
| `test/workflow-device-registration.test.mjs` | MERGE | `workflows-protocol.test.mjs` |
| `test/workflow-lifecycle-resend.test.mjs` | MERGE | `workflows-protocol.test.mjs` |
| `test/workflow-notice-return.test.mjs` | MERGE | `workflows-protocol.test.mjs` |
| `test/workflow-output-contract.test.mjs` | MERGE | `workflows-protocol.test.mjs` |
| `test/workflow-reminder-contract.test.mjs` | MERGE | `workflows-protocol.test.mjs` |
| `test/workflow-reminder-read.test.mjs` | MERGE | `workflows-protocol.test.mjs` |
| `test/workflow-typed-schedule.test.mjs` | MERGE | `workflows-protocol.test.mjs` |

#### `test/integration/digests.test.ts` — H7

Cases: digest capabilities, missed run now, occurrence delivery, cancellation concurrency, local digest storage.

| Source | Verdict | Cases to carry (reviewer note) |
|---|---|---|
| `scripts/test-digest-cancellation.ts` | MERGE | cancellation concurrency (T3 exception) |
| `scripts/test-local-digest-storage.ts` | MOVE | dev store on disk + digest inbox |
| `test/browser/digest-native-sources.production.spec.ts` | MERGE (shared by H7, T13; TZ deletes) | `journeys/digests.production.spec.ts` (all 3 tests) |
| `test/browser/digest-resident-schedule.production.spec.ts` | MERGE (shared by H7, T13; TZ deletes) | `journeys/digests.production.spec.ts` (both tests) |
| `test/browser/digest-source-renewal.spec.ts` | MERGE (shared by H7, T13; TZ deletes) | 3 assertions to `journeys/digests.production.spec.ts` |
| `test/browser/digest-summary.spec.ts` | MERGE (shared by H7, T13; TZ deletes) | 1 case (native result privacy) to `journeys/digests.production.spec.ts` |
| `test/browser/helpers/retained-digests.ts` | REWRITE (shared by H7, T1; TZ deletes) | `harness/nav.ts` via Automations → Scheduled digests |
| `test/browser/resident-background-results.spec.ts` | MERGE (shared by H7, T13, T14; TZ deletes) | `journeys/digests.spec.ts`; mock entry → `journeys/dev-surface.spec.ts` |
| `test/digest-capabilities.test.mjs` | MERGE | `test/integration/digests.test.ts` |
| `test/digest-missed-run-now.test.mjs` | MERGE | `test/integration/digests.test.ts` |
| `test/digest-occurrence-delivery.test.mjs` | MERGE | `test/integration/digests.test.ts` |
| `test/fixtures/hosted-digest-refresh.jsx` | KEEP | `specs/quint/refinement/application/fixtures/`; delete if Q-HOST-5 retires hosted digests |

#### `test/integration/android-jvm.test.ts` — H8

Cases: ONE host-JVM runner: compiles real Alpha Java classes against one stub tree and runs the drivers in test/integration/jvm/*.java, one test() per driver.

| Source | Verdict | Cases to carry (reviewer note) |
|---|---|---|
| `scripts/test-calendar-availability-provider-rows.ts` | MERGE | provider-row leg of CalendarAvailabilityReaderTest |
| `test/aosp-capabilities.test.mjs` | MERGE (shared by H11, H8; TZ deletes) | Gradle JVM image-capability test (interim: test/tooling/aosp.test.ts) |
| `test/calendar-availability-reader.test.mjs` | KEEP | Gradle JVM calendar test; script leg → integration fixture case |
| `test/calendar-deletion-identity.test.mjs` | KEEP | Gradle JVM test |
| `test/calendar-range-reader.test.mjs` | PORT | Gradle JVM test over an extracted `AlphaCalendarConfiguration` |
| `test/calendar-sync-consent.test.mjs` | KEEP | Gradle JVM |
| `test/calendar-sync-mutation.test.mjs` | KEEP | Gradle JVM (no patch step; `patches/` is gone) |
| `test/calendar-sync-receipt-recovery.test.mjs` | KEEP | Gradle JVM |
| `test/calendar-sync-snapshot.test.mjs` | KEEP | Gradle JVM (delete `calendar-sync-snapshot-jvm.mjs`) |
| `test/canonical-notification-security.test.mjs` | REWRITE | Gradle JVM test of `RendererCredentialSlots` + tap age; or DELETE (owner) |
| `test/clock-native-contract.test.mjs` | KEEP | Gradle JVM or upstream |
| `test/clock-repeat-days.test.mjs` | MERGE | surviving clock contract case |
| `test/cloud-speech-stream.test.mjs` | KEEP | JVM lane |
| `test/cloud-speech-timing.test.mjs` | MERGE | JVM lane |
| `test/cloud-voice-limit.test.mjs` | REWRITE (shared by H3, H8, T4; TZ deletes) | `test/integration/voice.test.ts` (parser), JVM lane, `journeys/voice.spec.ts` |
| `test/cloud-voice-profile.test.mjs` | REWRITE (shared by H8, T4; TZ deletes) | `journeys/voice.spec.ts`, JVM lane |
| `test/connection-routes.test.mjs` | KEEP | Gradle JVM `ConnectionRoutesTest` |
| `test/credential-owner-admission.test.mjs` | REWRITE | Gradle JVM `CredentialFencesTest` over extracted class |
| `test/credential-slot-lock-order.test.mjs` | REWRITE | same `CredentialFencesTest` |
| `test/credential-stop-dispatch.test.mjs` | REWRITE | same `CredentialFencesTest` |
| `test/fixtures/CalendarAvailabilityReaderTest.java` | KEEP | Gradle calendar (reader-only rows upstream) |
| `test/fixtures/CalendarSyncConsentTest.java` | MERGE | Gradle calendar |
| `test/fixtures/CalendarSyncMutationTest.java` | KEEP | Gradle calendar (`CalendarSyncTest`) |
| `test/fixtures/CalendarSyncReceiptRecoveryTest.java` | MERGE | Gradle calendar |
| `test/fixtures/CalendarSyncSnapshotTest.java` | KEEP | Gradle calendar; Quint harness path follows |
| `test/fixtures/CloudSpeechPolicyTest.java` | MERGE | Gradle voice |
| `test/fixtures/CloudVoiceLimitTest.java` | MERGE | Gradle voice |
| `test/fixtures/ConnectionRoutesTest.java` | KEEP | Gradle connection-cloud (retarget after U-A6) |
| `test/fixtures/GmailBackgroundLockContentionTest.java` | KEEP | Gradle credentials/inbox |
| `test/fixtures/GoogleAgentAccessFileTest.java` | MERGE | Gradle inbox-google or importer integration |
| `test/fixtures/HostedNoticeWithdrawTest.java` | MERGE | into Gradle `HostedResultNoticesTest` |
| `test/fixtures/HostedResultNoticesTest.java` | KEEP | Gradle notices |
| `test/fixtures/KeyboardDictationPolicyTest.java` | MERGE | Gradle voice |
| `test/fixtures/NativeDigestSourcesTest.java` | KEEP | Gradle workflows-digest |
| `test/fixtures/NativeNotificationSessionTest.java` | KEEP | Gradle resident |
| `test/fixtures/NativeVoiceBindingTest.java` | MERGE (shared by H7, H8; TZ deletes) | Gradle resident/voice |
| `test/fixtures/NoteRecorderJournalTest.java` | KEEP | Gradle notes |
| `test/fixtures/NotesDeletionLeaseTest.java` | MERGE | Gradle notes |
| `test/fixtures/PluginWorkersTest.java` | MERGE | Gradle runtime |
| `test/fixtures/RendererRecoveryBudgetTest.java` | MERGE | Gradle shell |
| `test/fixtures/ResidentDeliveryTest.java` | MERGE | with ResidentResultTransportTest into `ResidentResultDeliveryTest` (Gradle JVM `workflows-digest`) |
| `test/fixtures/ResidentResultTransportTest.java` | MERGE | same target as ResidentDeliveryTest; slot-policy rows move to the credential test |
| `test/fixtures/SmsActionJournalResultTest.java` | KEEP | later MERGE into Gradle `phone` suite |
| `test/fixtures/scoped-calendar-jvm/android/content/ContentProviderOperation.java` | KEEP | moves with the Calendar JVM tests (D18 keeps the Android sync half) |
| `test/fixtures/secure-store-memory/MemoryTest.java` | KEEP | Gradle JVM set; upstream follow-up for pure-store cases |
| `test/fixtures/secure-store-memory/android/util/AtomicFile.java` | KEEP | shared android-jvm shims folder |
| `test/gmail-background-lock-contention.test.mjs` | REWRITE | Gradle JVM test of unsliced classes |
| `test/google-workspace-return-flow.test.mjs` | KEEP | — |
| `test/google-workspace-return-native.test.mjs` | MERGE | `GoogleWorkspaceReturnFlowTest`; manifest/domain rules → `verify-apks.ts` |
| `test/hosted-notice-withdraw.test.mjs` | MERGE | `hosted-result-notices` → Gradle `HostedResultNoticesTest` |
| `test/hosted-result-notices.test.mjs` | KEEP | Gradle `HostedResultNoticesTest` |
| `test/native-navigation-client-header.test.mjs` | REWRITE | android-jvm |
| `test/native-notification-device-slot.test.mjs` | KEEP | android-jvm |
| `test/native-notification-diagnostics.test.mjs` | MERGE | android-jvm |
| `test/native-notification-session.test.mjs` | KEEP | android-jvm |
| `test/notes-deletion-lease.test.mjs` | MERGE | android-jvm |
| `test/notes-recorder.test.mjs` | REWRITE (shared by H6, H8, T8; TZ deletes) | race cases → `test/integration/notes-recorder.test.mjs`; flows → `journeys/notes.spec.ts`; JVM journal → `test/android-jvm/note-recorder-journal.test.mjs`; manifest chec… |
| `test/notification-installation-root.test.mjs` | MERGE | `test/android-jvm/notification-owner.test.mjs` (compile extracted class unsliced) |
| `test/notification-persist-owner-branches.test.mjs` | MERGE | same as above |
| `test/owner-route-parity.test.mjs` | REWRITE (shared by H2, H8; TZ deletes) | Gradle JVM connection-cloud suite + `test/integration/connection-cloud.test.ts`, shared case-table JSON |
| `test/plugin-worker-guard.test.mjs` | MERGE | Gradle JVM (interim `test/integration/native-plugin-workers.test.mjs`) with `fixtures/PluginWorkersTest.java` |
| `test/power-cold-native-pin.test.mjs` | REWRITE | Gradle JVM `PowerLaunchPinTest` after extracting the pin policy class; interim keep test 2 only |
| `test/power-sense-entry.test.mjs` | MERGE | manifest rules → `scripts/verify-apks.ts`; non-overlapping cases → Gradle JVM; API-36 compile deleted |
| `test/prepared-navigation-route.test.mjs` | REWRITE (shared by H2, H8; TZ deletes) | JSON case table → `test/integration/local-agent.test.ts` + Gradle JVM gate test |
| `test/renderer-recovery-budget.test.mjs` | MERGE | MERGE test 1 into Gradle `android/app/src/test/java/.../RendererRecoveryBudgetTest.java`; DELETE test 2 |
| `test/renderer-slot-deployment-namespace.test.mjs` | KEEP | KEEP, MOVE to Gradle `RendererCredentialSlotsTest.java` |
| `test/renderer-slot-policy.test.mjs` | carry from DELETE | DELETE; carry the SMS-ledger cases into Gradle `RendererCredentialSlotsTest.java` |
| `test/reset-cloud-revocation.test.mjs` | KEEP | KEEP, MOVE to Gradle `ResetBeforeDispatchTest.java` |
| `test/reset-startup.test.mjs` | MERGE | MERGE test 1 into Gradle `AlphaDataResetTest.java`; DELETE test 2 |
| `test/serial-storage-tasks.test.mjs` | MERGE | host-JVM runner `test/android-jvm.test.mjs` |
| `test/shared-deletion-window.test.mjs` | MERGE | host-JVM runner, upstream follow-up |
| `test/sms-action-journal.test.mjs` | MERGE | host-JVM runner |
| `test/source-renewal-notices.test.mjs` | MERGE | host-JVM runner |
| `test/speech-output-warmup.test.mjs` | MERGE | host-JVM runner, upstream follow-up |
| `test/streaming-speech.test.mjs` | MERGE | host-JVM runner, upstream follow-up |
| `test/workflow-approval-notice.test.mjs` | KEEP | Gradle `WorkflowNoticeTest` |
| `test/workflow-notice-delivery.test.mjs` | KEEP | Gradle `WorkflowNoticeTest` |
| `test/workflow-worker-assets.test.mjs` | KEEP (shared by H10, H8; TZ deletes) | `test/tooling/workflow-worker.test.mjs` + Gradle JUnit |
| `test/workspace-return-fallback.test.mjs` | KEEP | Gradle `GoogleWorkspaceReturnTest` |

JVM drivers under `test/integration/jvm/` (H8), each one `test()` in `android-jvm.test.ts`; Java written inline in JS strings by
today's wrappers becomes these files:

- `test/integration/jvm/CalendarSyncTest.java`: CalendarSyncConsentTest, CalendarSyncMutationTest, CalendarSyncReceiptRecoveryTest, CalendarSyncSnapshotTest; wrappers calendar-sync-{consent,mutation,receipt-recovery,snapshot}.
- `test/integration/jvm/CalendarReadTest.java`: CalendarAvailabilityReaderTest, calendar-range-reader, calendar-deletion-identity, scripts/test-calendar-availability-provider-rows.ts.
- `test/integration/jvm/NoticesTest.java`: HostedResultNoticesTest + HostedNoticeWithdrawTest, native-notification-{session,device-slot,diagnostics}, notification-installation-root, notification-persist-owner-branches, canonical-notification-security.
- `test/integration/jvm/WorkflowNoticesTest.java`: the 7 cases from WorkflowApprovalNoticeTest, WorkflowNoticeDeliveryTest, WorkflowNoticeRecoveryTest, WorkflowNoticeTapsTest (TP3).
- `test/integration/jvm/CredentialsTest.java`: credential-{owner-admission,slot-lock-order,stop-dispatch}, renderer-slot-deployment-namespace, renderer-slot-policy SMS-ledger rows, GmailBackgroundLockContentionTest, reset-cloud-revocation, reset-startup test 1, native-secure-slots native list.
- `test/integration/jvm/ConnectionRoutesTest.java`: ConnectionRoutesTest, owner-route-parity (shared JSON), native-navigation-client-header, prepared-navigation-route gate, ResidentRequestDeadlineTest rows (§3.1 #77).
- `test/integration/jvm/VoiceJvmTest.java`: CloudSpeechPolicyTest, CloudVoiceLimitTest, KeyboardDictationPolicyTest, NativeVoiceBindingTest, cloud-speech-stream relay cases 3-5, cloud-voice-profile case 6.
- `test/integration/jvm/NotesJvmTest.java`: NoteRecorderJournalTest (torn journal, missing segment, pending canonical save), NotesDeletionLeaseTest.
- `test/integration/jvm/RuntimeJvmTest.java`: PluginWorkersTest, RendererRecoveryBudgetTest test 1, power-cold-native-pin test 2, power-sense-entry non-manifest cases.
- `test/integration/jvm/ResidentResultDeliveryTest.java`: ResidentDeliveryTest + ResidentResultTransportTest, NativeDigestSourcesTest.
- `test/integration/jvm/SmsJournalTest.java`: SmsActionJournalResultTest, SmsSendJournalTest (without the pre-upstream journal block), MMS journal-before-dispatch order.
- `test/integration/jvm/GoogleWorkspaceReturnTest.java`: google-workspace-return-flow, google-workspace-return-native (non-manifest), workspace-return-fallback, GoogleAgentAccessFileTest.
- `test/integration/jvm/StorageBrowserTest.java`: StorageBrowserTest (Files escape safety; upstream follow-up), files-browser path-escape rows.
- `test/integration/jvm/AppUpdateTest.java`: UpdateDownloadTest admission bounds (§3.1 #78); UpdateFlowTest itself moves to the formal plan.

### 2.2 Tooling (`test/tooling/`, lane `tooling`)

Rules: run the real script against a temp checkout (`test/support/git.mjs`, `test/tooling/support/pinned-checkout.mjs`); no regex
over the script's own source, no assertions on constants, no workflow-YAML regexes (those go to the CI plan's workflow lint).

#### `test/tooling/android-build.test.ts` — H11

Cases: build-android preflight, build path, consumer build, gzip assets, host, runtime staging selection, voice model staging, Paradee runtime, prepared workflow worker, local agent selection, host speech admission, Gradle verification/supply chain.

| Source | Verdict | Cases to carry (reviewer note) |
|---|---|---|
| `test/android-build-path.test.mjs` | KEEP | `test/tooling/android-build.test.mjs` |
| `test/android-consumer-build.test.mjs` | KEEP | `test/tooling/android-build.test.mjs` |
| `test/android-gzip-assets.test.mjs` | KEEP | `test/tooling/android-build.test.mjs` |
| `test/android-host.test.mjs` | KEEP | `test/tooling/android-build.test.mjs` |
| `test/android-runtime-staging-selection.test.mjs` | KEEP | `test/tooling/android-build.test.mjs` |
| `test/android-stage-voice-models.test.mjs` | MERGE | test/tooling/android-build-inputs.test.ts |
| `test/gradle-verification.test.mjs` | KEEP | `test/tooling/android-supply-chain.test.ts` (~120 lines) |
| `test/host-speech-admission.test.mjs` | KEEP | `test/tooling/native-inputs.test.ts` |
| `test/local-agent-selection.test.mjs` | KEEP | `test/tooling/android-build-inputs.test.ts` |
| `test/paradee-runtime.test.mjs` | MERGE | `test/tooling/android-build-inputs.test.ts` |
| `test/prepared-workflow-worker.test.mjs` | MERGE | `test/tooling/android-build.test.mjs` |
| `test/strict-build-inputs.test.mjs` | KEEP | embedding cases to `test/embedding-host-admission.test.mjs`; rest renamed `android-build-preflight.test.mjs` |

#### `test/tooling/android-instrumentation.test.ts` — H11

Cases: instrumentation runner registry and outcome parsing with the fake adb, native campaign runners, calendar regression runner, installed-upgrade runner (no legacy-digest cases), emulator admission.

| Source | Verdict | Cases to carry (reviewer note) |
|---|---|---|
| `test/android-instrumentation-runner.test.mjs` | KEEP | `test/tooling/android-instrumentation.test.mjs` (about 300 lines) |
| `test/calendar-regression-runner.test.mjs` | MERGE | `test/tooling/native-campaigns.test.ts` |
| `test/fixtures/isolated-native-campaign.mjs` | SIMPLIFY | merge 7 importers into `test/tooling/native-campaign-runners.test.mjs`, or delete with the manual runners |
| `test/installed-upgrade-runner.test.mjs` | SIMPLIFY | `test/tooling/device-campaigns.test.ts`; delete 5 legacy-digest cases (D1) |
| `test/instrumentation-outcome-status.test.mjs` | MERGE | `test/tooling/device-campaigns.test.ts` |
| `test/native-campaign-evidence.test.mjs` | MERGE | `test/tooling/native-campaign.test.mjs` |
| `test/native-permission-runner.test.mjs` | MERGE | campaigns |
| `test/native-reminder-recovery-runner.test.mjs` | MERGE | campaigns |
| `test/native-reminder-runner.test.mjs` | MERGE | campaigns |
| `test/native-restart-runner.test.mjs` | MERGE | campaigns |
| `test/native-webview-admission.test.mjs` | MERGE | campaigns |
| `test/resident-native-ci-admission.test.mjs` | MERGE | `test/android-ci-tooling.test.mjs` (emulator admission) |

#### `test/tooling/aosp.test.ts` — H11

Cases: stage-aosp, Pixel 10a, Cuttlefish (+ postboot), product lock, provisioning overlay, secure camera, staging patches, capabilities, listener SystemUI.

| Source | Verdict | Cases to carry (reviewer note) |
|---|---|---|
| `test/aosp-capabilities.test.mjs` | MERGE (shared by H11, H8; TZ deletes) | Gradle JVM image-capability test (interim: test/tooling/aosp.test.ts) |
| `test/aosp-cuttlefish.test.mjs` | MERGE | test/tooling/aosp.test.ts |
| `test/aosp-listener-systemui.test.mjs` | MERGE | test/tooling/aosp.test.ts |
| `test/aosp-pixel10a.test.mjs` | MERGE | test/tooling/aosp.test.ts |
| `test/aosp-product-lock.test.mjs` | MERGE | test/tooling/aosp.test.ts |
| `test/aosp-provisioning-overlay.test.mjs` | MERGE | test/tooling/aosp.test.ts |
| `test/aosp-secure-camera-policy.test.mjs` | MERGE | test/tooling/aosp.test.ts |
| `test/aosp-secure-camera.test.mjs` | MERGE | test/tooling/aosp.test.ts |
| `test/aosp-staging-patches.test.mjs` | MERGE | test/tooling/aosp.test.ts |
| `test/cuttlefish-launcher-postboot.test.mjs` | KEEP | MOVE → `test/tooling/aosp.test.ts` |

#### `test/tooling/apk-verify-audit.test.ts` — H9

Cases: verify-apks and audit-production-bundle on fixture APKs/bundles: power/tile/keyboard policies, developer archive, licences/SBOM/font licence, llama.cpp only, files legacy storage, demo copy, avatar initials, packaged runtime.

| Source | Verdict | Cases to carry (reviewer note) |
|---|---|---|
| `test/android-dependency-fingerprint.test.mjs` | KEEP | `test/tooling/release-licenses.test.mjs` (or android-build) |
| `test/apk-alpha-power-policy.test.mjs` | MERGE | test/tooling/apk-verify-audit.test.ts |
| `test/apk-alpha-tile-policy.test.mjs` | MERGE | test/tooling/apk-verify-audit.test.ts |
| `test/apk-keyboard-dictation.test.mjs` | MERGE | test/tooling/apk-verify-audit.test.ts |
| `test/avatar-initials-audit.test.mjs` | MERGE | `test/production-bundle-audit.test.mjs` |
| `test/cloud-resident-authority.test.mjs` | MERGE | `test/release/build-gating.test.mjs` |
| `test/demo-copy.test.mjs` | MERGE | audit case → `test/tooling/apk-verify-audit.test.ts`; "MVP" rule → bundle DENYLIST |
| `test/developer-archive.test.mjs` | KEEP | `test/tooling/apk-verify-audit.test.ts` |
| `test/files-legacy-storage.test.mjs` | MERGE | `test/tooling/apk-verify-audit.test.ts` |
| `test/font-license.test.mjs` | MERGE | `test/release-tooling/licences.test.mjs`, drop tests 1, 6, 8 and wording pins |
| `test/licenses.test.mjs` | KEEP | `test/tooling/apk-verify-audit.test.ts`; drop named-package inventory pins |
| `test/llama-cpp-only.test.mjs` | MERGE | `test/tooling/apk-verify-audit.test.ts`; delete repo-wide scans |
| `test/packaged-runtime.test.py` | KEEP | `test/tooling/apk-verify-audit.test.ts` |
| `test/production-bundle-audit.test.mjs` | KEEP | `test/tooling/production-bundle-audit.test.mjs` |
| `test/runtime-licenses.test.mjs` | MERGE | `test/release-licences.test.mjs` |
| `test/sbom.test.mjs` | MERGE | `test/release-licences.test.mjs` |
| `test/verify-apks.test.mjs` | KEEP | Move into `test/release/apk-verify-audit.test.ts`. Drop the runtime-profile refusals that `one-runtime-profile.test.mjs` also checks, the exact manifest count and the se… |

#### `test/tooling/release-signing.test.ts` — H9

Cases: sign-release-apks, record-release, enroll-release-keys (one ceremony), AOSP release signing, owner-sign edges, publish-update-manifest, app-update candidate, deliver-app-update, release-signing, assetlinks and auth callback, OS update enrollment.

| Source | Verdict | Cases to carry (reviewer note) |
|---|---|---|
| `test/aosp-release-signing.test.mjs` | MERGE | test/tooling/release-signing.test.ts |
| `test/app-update-candidate.test.mjs` | MERGE | test/tooling/release-signing.test.ts |
| `test/assetlinks-cloud-config.test.mjs` | KEEP | `test/release/assetlinks.test.mjs` |
| `test/auth-callback-manifest.test.mjs` | MERGE | `test/release/assetlinks.test.mjs` |
| `test/deliver-app-update.test.mjs` | KEEP | MOVE → `test/tooling/release-signing.test.ts` |
| `test/enroll-release-keys.test.mjs` | KEEP | `test/tooling/release-signing.test.ts` (drop literal key list; one shared ceremony) |
| `test/os-update-enrollment.test.mjs` | KEEP | MOVE to `test/tooling/` |
| `test/owner-sign-aosp-release-edges.test.mjs` | MERGE | `test/tooling/release-signing.test.ts` |
| `test/publish-update-manifest.test.mjs` | MERGE | `test/tooling/release-signing.test.ts`, import `parseUpdateManifest` |
| `test/record-release.test.mjs` | KEEP | KEEP, MERGE into `test/tooling/release-signing.test.ts` |
| `test/release-signing.test.mjs` | MERGE | MERGE into `test/tooling/release-signing.test.ts`; DELETE the T1 parts |
| `test/sign-release-apks.test.mjs` | KEEP | — |

#### `test/tooling/app-update.test.ts` — H9

Cases: update APK admission, update channel, update-manifest admission table (parseUpdateManifest: HTTPS, no URL credentials, signer/flavor, sha256, size, index feed bounds).

| Source | Verdict | Cases to carry (reviewer note) |
|---|---|---|
| `test/settings-truth.test.mjs` | REWRITE | `test/app-update.integration.test.mjs` (update-manifest admission table) |
| `test/update-apk-admission.test.mjs` | KEEP | `test/tooling/app-update.test.mjs` |
| `test/update-channel.test.mjs` | KEEP | `test/tooling/app-update.test.mjs` |

#### `test/tooling/voice-host.test.ts` — H11

Cases: voice host record and absent admission (table-driven overlay), voice latency CLI.

| Source | Verdict | Cases to carry (reviewer note) |
|---|---|---|
| `test/native-voice-latency.test.mjs` | KEEP | `test/tooling/voice-latency.test.ts` |
| `test/voice-host-absent-admission.test.mjs` | MERGE | `test/release/voice-host.test.ts`; table-drive the overlay cases |
| `test/voice-host-record.test.mjs` | MERGE | `test/release/voice-host.test.ts`, together with `android-stage-voice-models.test.mjs`; drop the assertions on constants in the committed record |
| `test/voice-timing.test.mjs` | MERGE | CLI part → `test/tooling/voice-latency.test.mjs` |

#### `test/tooling/embedding-host.test.ts` — H11

Cases: embedding host admission, preparation, library source, native contract.

| Source | Verdict | Cases to carry (reviewer note) |
|---|---|---|
| `test/embedding-host-admission.test.mjs` | KEEP | `test/tooling/embedding-host.test.mjs` |
| `test/embedding-host-preparation.test.mjs` | MERGE | `test/tooling/embedding-host.test.mjs` |
| `test/embedding-library-source.test.mjs` | MERGE | `test/tooling/embedding-host.test.mjs` |
| `test/embedding-native-contract.test.mjs` | MERGE | `test/tooling/embedding-host.test.mjs` |
| `test/strict-build-inputs.test.mjs` | KEEP | embedding cases to `test/embedding-host-admission.test.mjs`; rest renamed `android-build-preflight.test.mjs` |

#### `test/tooling/ci.test.ts` — H10

Cases: affected selection, required result, emulator evidence suite cases, proof export.

| Source | Verdict | Cases to carry (reviewer note) |
|---|---|---|
| `test/browser-proof-export.test.mjs` | KEEP | move to `test/tooling/ci-proof-export.test.mjs`; research "A" label was wrong |
| `test/ci-affected.test.mjs` | KEEP | `test/tooling/ci-selection.test.ts` |
| `test/ci-emulator-evidence.test.mjs` | SPLIT | keep suite cases; action-pin/permission rule to `scripts/ci/check-workflows.ts` |
| `test/ci-required-checks.test.mjs` | MERGE | `requiredResult` to ci-selection; ruleset-name rule to workflow lint |

#### `test/tooling/cloud-deployment.test.ts` — H10

Cases: cloud deployment, email deployment, readiness.

| Source | Verdict | Cases to carry (reviewer note) |
|---|---|---|
| `test/cloud-deployment.test.mjs` | KEEP | `test/tooling/cloud-deployment.test.ts` |
| `test/cloud-email-deployment.test.mjs` | MERGE | cloud-deployment suite |
| `test/cloud-readiness.test.mjs` | KEEP | `test/tooling/cloud-readiness.test.mjs` |

#### `test/tooling/cloud-resident-host.test.ts` — H10

Cases: cloud resident host by direct import: embedding route, full profile, SDK routing, product character host, own-provider host.

| Source | Verdict | Cases to carry (reviewer note) |
|---|---|---|
| `test/cloud-resident-embedding-route.test.mjs` | MERGE | `test/tooling/cloud-resident-host.test.mjs` |
| `test/cloud-resident-full-profile.test.mjs` | MERGE | `test/tooling/cloud-resident-host.test.mjs` |
| `test/cloud-resident-host.test.mjs` | REWRITE | `test/tooling/cloud-resident-host.test.mjs` (direct import) |
| `test/cloud-sdk-routing.test.mjs` | MERGE | `test/tooling/cloud-resident-host.test.mjs` |
| `test/own-provider-host.test.mjs` | KEEP | MOVE to `test/integration/cloud-resident-host.test.mjs` |
| `test/product-character-host.test.mjs` | MERGE | `test/tooling/cloud-resident-host.test.mjs` (direct import) |

#### `test/tooling/local-agent-launcher.test.ts` — H10

Cases: one fake-bun launch helper: embedding overrides (2), identity, model selection (4), cloud QA launcher.

| Source | Verdict | Cases to carry (reviewer note) |
|---|---|---|
| `test/agent-embedding-overrides.test.mjs` | MERGE | `test/tooling/local-agent-launcher.test.mjs` (2 launches) |
| `test/agent-identity.test.mjs` | MERGE | `test/tooling/local-agent-launcher.test.mjs` |
| `test/agent-model-selection.test.mjs` | MERGE | `test/tooling/local-agent-launcher.test.mjs` (4 cases) |
| `test/cloud-qa-launcher.test.mjs` | MERGE | `test/tooling/local-agent-launcher.test.mjs` |

#### `test/tooling/owner-tools.test.ts` — H10

Cases: owner branch integrity, ruleset readback, pilot rotation journal/units/update export.

| Source | Verdict | Cases to carry (reviewer note) |
|---|---|---|
| `test/ci-ruleset-readback.test.mjs` | KEEP | owner tools suite |
| `test/owner-branch-integrity.test.mjs` | MERGE | `test/tooling/owner-tools.test.ts` |
| `test/pilot-rotation-journal.test.mjs` | MERGE | `test/release-tooling/pilot.test.ts` (1 case + anchor refusal) |
| `test/pilot-units.test.mjs` | MERGE | `test/release-tooling/pilot.test.ts` (admission, blockers, readback; drop qualify-head and source-text) |
| `test/pilot-update-export.test.mjs` | MERGE | `test/release-tooling/pilot.test.ts` (export parser, `planHome`, agent restart, readback recheck) |

#### `test/tooling/python.test.ts` — H10

Cases: one runner that runs each Python test once: the kept `test/*.py` files move to `test/tooling/python/` (`aosp-fresh-presets.test.py` tests 1-4, `aosp-native-fixtures.py`, `cloud-signing-input.test.py`, `embedding-artifact-inputs.test.py`, `hosted-native-inputs.test.py`, `packaged-runtime.test.py`, `qualified-app-update.test.py` importing a shared fixture module instead of another test), plus `test/tooling/python/maps-regional-gateway.test.py` from `scripts/maps/test-dataset-manifest.py`; `scripts/ci/*` Python tests stay where the scripts plan puts them and are listed here by path.

| Source | Verdict | Cases to carry (reviewer note) |
|---|---|---|
| `scripts/maps/test-dataset-manifest.py` | MOVE | becomes test/tooling/python/maps-regional-gateway.test.py; absorb 2 cases of scripts/maps/test-region.py |
| `test/aosp-fresh-presets.test.py` | REWRITE | keep tests 1-4 in test/tooling/python.test.mjs (2-4 skip without fetched inputs); delete 5-6 |
| `test/aosp-native-fixtures.py` | KEEP | run from test/tooling/python.test.mjs |
| `test/cloud-signing-input.test.py` | KEEP | run by `test/tooling/python.test.mjs` |
| `test/embedding-artifact-inputs.test.py` | KEEP | `test/tooling/python.test.mjs` runner |
| `test/hosted-native-inputs.test.py` | KEEP | single Python collector |
| `test/maps-dataset-manifest.test.mjs` | MERGE | one `scripts/maps` Python runner (path-scoped lane) |
| `test/python-suites.test.mjs` | KEEP | rename `test/tooling/python.test.mjs`; absorb one-file Python wrappers; drop ABI line |
| `test/qualified-app-update.test.py` | KEEP | shared fixture module instead of importing another test |

#### `test/tooling/upstream-sources.test.ts` — H10

Cases: client feature preparation, core state patch, upstream native source, upstream pin guard, reachability, owner gate compat, digest route registration, runtime source clone, source snapshot.

| Source | Verdict | Cases to carry (reviewer note) |
|---|---|---|
| `test/client-feature-preparation.test.mjs` | KEEP | `test/tooling/upstream-sources.test.ts` |
| `test/core-state-patch.test.mjs` | KEEP | MOVE → `test/tooling/upstream-sources.test.ts` |
| `test/digest-route-registration.test.mjs` | KEEP | `test/tooling/upstream-pin.test.mjs` |
| `test/fixtures/agent-identity-canonical.test.ts` | KEEP | `test/agent/identity.test.ts`, run by the merged upstream-source runner in CI |
| `test/runtime-source-clone.test.mjs` | KEEP | drop APFS/timing evidence |
| `test/source-snapshot.test.mjs` | KEEP | goes with `source-snapshot.ts` if `build-archive.ts` is dropped |
| `test/upstream-native-source.test.mjs` | KEEP | `test/tooling/upstream-pin.test.mjs` |
| `test/upstream-owner-gate-compat.test.mjs` | REWRITE | `test/tooling/upstream-pin.test.mjs` (import upstream gate; check `OWNER_ROUTE_TABLE`) |
| `test/upstream-pin-guard.test.mjs` | KEEP | `test/tooling/upstream-pin.test.mjs` |
| `test/upstream-reachability.test.mjs` | KEEP | `test/tooling/upstream-pin.test.mjs` (drop committed-record check) |

#### `test/tooling/workflow-worker.test.ts` — H10

Cases: workflow worker assets.

| Source | Verdict | Cases to carry (reviewer note) |
|---|---|---|
| `test/workflow-worker-assets.test.mjs` | KEEP (shared by H10, H8; TZ deletes) | `test/tooling/workflow-worker.test.mjs` + Gradle JUnit |

### 2.3 Resident, live and Quint host files

#### `test/resident/digest-restart.test.ts` — H7

Cases: 4 real runtime processes with SIGKILL; no `result.json`.

| Source | Verdict | Cases to carry (reviewer note) |
|---|---|---|
| `scripts/test-local-digest-restart.ts` | MOVE | 4 runtime processes, SIGKILL; drop result.json |

#### `test/resident/resident-bundle.test.ts` — H7

Cases: packaged mobile workflow bundle under Bun, workflow compiler (import `COMPILER_PROGRAM`), staged workflow worker, native Cloud runtime config.

| Source | Verdict | Cases to carry (reviewer note) |
|---|---|---|
| `test/fixtures/NativeVoiceBindingTest.java` | MERGE | Gradle resident/voice |
| `scripts/test-mobile-workflow-bundle.ts` | MOVE | packaged bundle under Bun |
| `scripts/test-workflow-compiler.ts` | MOVE | import COMPILER_PROGRAM instead of regex |
| `scripts/test-workflow-worker.ts` | MOVE | staged worker under Bun |
| `scripts/test-native-cloud-runtime-config.ts` | MERGE | with native-cloud-runtime-config-check.ts |

#### `test/live/redaction.test.ts` — H7

Cases: real provider redaction, skipped unless `--live`.

| Source | Verdict | Cases to carry (reviewer note) |
|---|---|---|
| `scripts/test-local-redaction.ts` | MOVE | opt-in --live; skipped without it |

#### `test/quint/tooling.test.mjs` — Q1

Cases: check-traces, model-state, campaigns, quint-lib, changed models, checker (no floors, no retry supervisor), receipt guard (3 cases from quint-forward-receipts), refinement harness self-test, state inventory, source bundle capture, lemma check (+ 5 unique lemma-checker cases).

| Source | Verdict | Cases to carry (reviewer note) |
|---|---|---|
| `test/lemma-check.test.mjs` | KEEP | absorb `lemma-checker`; later `test/quint/tooling.test.mjs` |
| `test/lemma-checker.test.mjs` | MERGE | into `test/lemma-check.test.mjs` (5 unique cases) |
| `test/quint-changed-models.test.mjs` | KEEP | `test/tooling/quint.test.mjs` |
| `test/quint-checker.test.mjs` | KEEP | `test/tooling/quint.test.mjs`; drop floors, retry supervisor, receipt temp-repo test |
| `test/quint-forward-receipts.test.mjs` | MERGE | `test/quint/tooling.test.mjs` |
| `test/quint-refinement-harness.test.mjs` | KEEP | KEEP, MERGE into `test/quint/tooling.test.mjs` |
| `test/quint-source-bundle-capture.test.mjs` | KEEP | KEEP, MERGE into `test/quint/tooling.test.mjs` |
| `test/quint-state-inventory.test.mjs` | KEEP | KEEP, MERGE into `test/quint/tooling.test.mjs` |
| `test/quint-workflow-engine-refinement.test.mjs` | MERGE | MERGE: test 1 into `test/quint/tooling.test.mjs`; test 2 into `test/quint/refinement.test.mjs` |

#### `test/quint/refinement.test.mjs` — Q1

One `test()` per model in `specs/quint/{application,native,services}/manifest.json` plus the composition family flag, calling the
family index (`specs/quint/refinement/{application,native,services,composition}/index.mjs`). Generic checks once: receipt passed, no
unobserved state field (replaces six copies), manifest completeness. Model filter from `ALPHA_QUINT_MODELS` (comma list or family
name) so `quint:changed` and CI can select. Absorbs the 4 aggregates (`quint-{application,services,native,composition}-refinement`)
and every per-model wrapper; the MERGE/PORT/MOVE wrappers need the formal-plan registrations listed in test-45 §Cross-file 2 and
test-46 first. Composition runs here only (the CI plan removes `quint:refinement --families=composition` from the browser
production job).

### 2.4 Playwright journeys (`test/browser/journeys/`)

Every journey uses the fixture in §4.1. Tests tagged `@production` run against the flag-off bundle; untagged tests run on the dev
build; `@storage` also runs in firefox/webkit. `journey-core-loops.production.spec.ts` is split by loop into the @production
sections of chat, reminders, browser, notes, calendar, maps, workflows, inbox, camera, files and settings (shared; TZ deletes it).

#### `test/browser/journeys/chat.spec.ts` — T3

Cases: send, stream, Stop, double send, notices (combined copy), restart recovery, history paging/windowing, draft continuity across HOME/Back/rotation, stopped-reply honesty, retired-send typing lease.

| Source | Verdict | Cases to carry (reviewer note) |
|---|---|---|
| `scripts/test-connection-history.ts` | REWRITE (shared by H2, T3; TZ deletes) | 4 cases |
| `test/action-message-presentation.test.mjs` | REWRITE (shared by H6, T3; TZ deletes) | `journeys/chat.spec.ts` (one answer per browser open, live and restored); receipt refusal matrix goes to `test/integration/device-actions.test.mjs` |
| `test/assistant-draft-dispatch.test.mjs` | carry from DELETE | 4 cases → `journeys/chat.spec.ts`; controller tests are an upstream follow-up |
| `test/browser-receipt-order.test.mjs` | carry from DELETE (shared by T10, T3; TZ deletes) | `journeys/browser.spec.ts` + 1 case in `journeys/chat.spec.ts` |
| `test/browser/assistant-draft-recovery.spec.ts` | MERGE | `journeys/chat.spec.ts` (draft continuity) |
| `test/browser/assistant-draft-review.spec.ts` | MERGE | `journeys/chat.spec.ts` |
| `test/browser/chat-continuity.production.spec.ts` | KEEP | becomes `journeys/chat.spec.ts` |
| `test/browser/chat-continuity.spec.ts` | MERGE | `journeys/chat.spec.ts` |
| `test/browser/chat-decline.production.spec.ts` | MERGE | `journeys/chat.spec.ts` |
| `test/browser/chat-header-home.spec.ts` | REWRITE | `journeys/chat.spec.ts` |
| `test/browser/chat-message-polish.spec.ts` | MERGE | `journeys/chat.spec.ts` |
| `test/browser/chat-reply-announcement.spec.ts` | MERGE | `journeys/chat.spec.ts` |
| `test/browser/chat-system-notices.production.spec.ts` | MERGE | `journeys/chat.spec.ts` |
| `test/browser/composer-dispatch.spec.ts` | MERGE | `journeys/chat.spec.ts` on the resident (2-3 cases) |
| `test/browser/composer-send-focus.spec.ts` | MERGE | `journeys/chat.spec.ts` (4 cases) |
| `test/browser/dev-search-question.spec.ts` | MERGE (shared by T12, T3; TZ deletes) | `journeys/chat.spec.ts` (composer sent only on Send); `journeys/home-shell.spec.ts` (Inbox attention card) |
| `test/browser/explicit-send.spec.ts` | MERGE | `journeys/chat.spec.ts`, through a visible suggestion chip |
| `test/browser/full-chat-grabber.spec.ts` | MERGE (shared by T12, T3; TZ deletes) | `journeys/chat.spec.ts` (sheet) + `journeys/home-shell.spec.ts` (raised dock) |
| `test/browser/journey-a-conversation.spec.ts` | KEEP (shared by T3, T4; TZ deletes) | `journeys/chat.spec.ts`; voice test → `journeys/voice.spec.ts` |
| `test/browser/journey-core-loops.production.spec.ts` | KEEP (shared by T10, T11, T13, T15, T3, T6, T7, T8, T9; TZ deletes) | chat, reminders, browser, notes, calendar/maps, workflows, inbox, camera-photos, files, settings journeys (production project) |
| `test/browser/local-agent-native-stream.spec.ts` | MERGE | `journeys/chat.spec.ts` |
| `test/browser/local-agent-stream.spec.ts` | MERGE | `journeys/chat.spec.ts` |
| `test/browser/mail-controls.spec.ts` | MERGE (shared by T3, T6; TZ deletes) | `journeys/chat.spec.ts`, `journeys/inbox.spec.ts` |
| `test/browser/maps-chat-cards.spec.ts` | REWRITE | `journeys/chat.spec.ts` |
| `test/browser/photos-clean-controls.spec.ts` | MERGE (shared by T10, T3; TZ deletes) | camera-photos, `journeys/chat.spec.ts`, `journeys/files.spec.ts` |
| `test/browser/proposal-recovery.spec.ts` | MERGE | `journeys/chat.spec.ts` |
| `test/browser/reminder-v2-assistant.spec.ts` | MERGE | `journeys/chat.spec.ts` |
| `test/browser/resident-failures.production.spec.ts` | MERGE | `journeys/chat.spec.ts` (prod) |
| `test/browser/standalone-shell.spec.ts` | MERGE (shared by T12, T3; TZ deletes) | `journeys/home-shell.spec.ts` + `journeys/chat.spec.ts` |
| `test/browser/view-navigation-react.spec.ts` | MERGE | `journeys/chat.spec.ts` (resident harness) |
| `test/browser/workflow-open-view.spec.ts` | MERGE | `journeys/chat.spec.ts` (device-action approval) |
| `test/calendar-approval-ui.test.mjs` | REWRITE | `journeys/chat.spec.ts` (Calendar review in chat); parse tables to calendar integration |
| `test/chat-navigation-detent.test.mjs` | carry from DELETE | 3 steps in `journeys/chat.spec.ts` |
| `test/chat-transcript-window.test.mjs` | REWRITE | `journeys/chat.spec.ts` long-conversation step |
| `test/checkin-choice-presentation.test.mjs` | MERGE | chat journey check-in step |
| `test/history-initial-state.test.mjs` | carry from DELETE | 3 cases in `journeys/chat.spec.ts` |
| `test/optional-view-channel-chat.test.mjs` | carry from DELETE | 2 cases → `journeys/chat.spec.ts` |
| `test/restored-history-limits.test.mjs` | REWRITE | `journeys/chat.spec.ts` (2-3 cases) |
| `test/stopped-reply-match.test.mjs` | carry from DELETE | 1 case `journeys/chat.spec.ts` |
| `test/stopped-reply-outcome.test.mjs` | REWRITE | `journeys/chat.spec.ts` (2 cases) |
| `test/system-notice-collapse.test.mjs` | REWRITE | `journeys/chat.spec.ts` (5 cases, merged with `chat-system-notices.spec.ts`) |
| `test/workflow-reply-markup.test.mjs` | REWRITE | 2 cases → `journeys/chat.spec.ts` |

#### `test/browser/journeys/chat-context.spec.ts` — T3

Cases: all-view context, selected content and documents, message actions, device records, Calendar review in chat, reply edit, attachment across room switch.

| Source | Verdict | Cases to carry (reviewer note) |
|---|---|---|
| `scripts/test-agent-context-browser.ts` | REWRITE (shared by H6, T3, T9; TZ deletes) | sanitizer cases to device-actions; context flows to journeys |
| `test/browser/all-view-context.production.spec.ts` | MERGE (shared by T3, T7; TZ deletes) | `journeys/chat.spec.ts` (context); capability test → `journeys/reminders.spec.ts` |
| `test/browser/context-selection.spec.ts` | MERGE | `journeys/chat.spec.ts` context block (12 cases) |
| `test/browser/conversation-selection-storage.spec.ts` | carry from DELETE | carry 2 cases to `journeys/chat.spec.ts`; drop from `storage-specs.ts` |
| `test/browser/message-actions.spec.ts` | MERGE | `journeys/chat.spec.ts`, 1 → `home-shell` |
| `test/browser/message-reply-edit.spec.ts` | MERGE | `journeys/chat.spec.ts` |
| `test/device-record-presentation.test.mjs` | MERGE | `journeys/chat.spec.ts` |

#### `test/browser/journeys/voice.spec.ts` — T4

Cases: Talk route Cloud/local fallback, barge-in, Stop speaking, phone-call pause, 429/503 quiet retry copy, mic denied "Open app settings", voice navigation allowlist, voice-requested actions bound to the final transcript, dev-host streamed speech (one Vite server).

| Source | Verdict | Cases to carry (reviewer note) |
|---|---|---|
| `scripts/test-cloud-voice-cancellation-flow.ts` | REWRITE | 2 cases |
| `test/batch-ack-shell-retirement.test.mjs` | carry from DELETE | 1 case → `journeys/voice.spec.ts` |
| `test/browser-voice-cancellation.test.mjs` | carry from DELETE | `journeys/voice.spec.ts`, 3 cases |
| `test/browser/chat-voice-mode.spec.ts` | REWRITE | `journeys/voice.spec.ts` |
| `test/browser/cloud-tts-streaming.spec.ts` | KEEP | `dev-host/cloud-speech-stream.spec.ts`, one server, drop unit test 6 |
| `test/browser/dev-speech-account-switch.spec.ts` | MERGE | `journeys/voice.spec.ts` |
| `test/browser/journey-a-conversation.spec.ts` | KEEP (shared by T3, T4; TZ deletes) | `journeys/chat.spec.ts`; voice test → `journeys/voice.spec.ts` |
| `test/browser/listener-invocation.production.spec.ts` | KEEP | `journeys/voice.spec.ts` |
| `test/browser/native-speech.production.spec.ts` | MERGE | `journeys/voice.spec.ts` (production project) |
| `test/browser/speak-replies.spec.ts` | MERGE | `journeys/voice.spec.ts` |
| `test/browser/voice-assistant.production.spec.ts` | KEEP | basis of `journeys/voice.spec.ts` |
| `test/browser/voice-preparation-ownership.spec.ts` | MERGE (shared by T4, T8; TZ deletes) | `journeys/voice.spec.ts` + `journeys/notes.spec.ts` |
| `test/browser/voice-stop-speaking.spec.ts` | MERGE | `journeys/voice.spec.ts` (assistant; production project) |
| `test/browser/voice-timing.spec.ts` | MERGE | `journeys/voice.spec.ts` |
| `test/cloud-streaming-conversation.test.mjs` | REWRITE | `journeys/voice.spec.ts` |
| `test/cloud-voice-limit.test.mjs` | REWRITE (shared by H3, H8, T4; TZ deletes) | `test/integration/voice.test.ts` (parser), JVM lane, `journeys/voice.spec.ts` |
| `test/cloud-voice-profile.test.mjs` | REWRITE (shared by H8, T4; TZ deletes) | `journeys/voice.spec.ts`, JVM lane |
| `test/development-voice-navigation.test.mjs` | REWRITE (shared by H3, T4; TZ deletes) | `test/integration/voice.test.ts` + `journeys/voice.spec.ts` |
| `test/local-speech-playback.test.mjs` | REWRITE (shared by T4, T8; TZ deletes) | steps in `journeys/notes.spec.ts` (Cloud fallback, error copy) and `journeys/voice.spec.ts` (Listen refuses links) |
| `test/offline-signed-out-speech.test.mjs` | REWRITE | `journeys/voice.spec.ts` (offline + signed out) |
| `test/private-preview-cartesia-route.test.mjs` | carry from DELETE | 2 cases (start timeout fence, phase captions) to `journeys/voice.spec.ts` |
| `test/startup-warning-retention.test.mjs` | carry from DELETE | optional 1 case `journeys/voice.spec.ts` |
| `test/voice-call-interrupted-capture.test.mjs` | carry from DELETE | Carry the call pause and the `[WORKFLOW]` stripping to `journeys/voice.spec.ts` |
| `test/voice-calm-cloud-errors.test.mjs` | carry from DELETE | Carry to `journeys/voice.spec.ts`: 429 Retry-After wait, bounded retries, 401 terminal line, on-device fallback |
| `test/voice-prepared-navigation.test.mjs` | carry from DELETE | Carry: an unknown or mismatched view path makes no claim (`journeys/voice.spec.ts`) |
| `test/voice-replies.test.mjs` | carry from DELETE | 3 cases → `journeys/voice.spec.ts` |
| `test/voice-request-provenance.test.mjs` | carry from DELETE | 1 security case → `journeys/voice.spec.ts` |
| `test/voice-requested-actions.test.mjs` | carry from DELETE | ask-first case → `journeys/voice.spec.ts` |
| `test/voice-start-failure-copy.test.mjs` | carry from DELETE | copy cases → `journeys/voice.spec.ts` |

#### `test/browser/journeys/voice-dictation.spec.ts` — T4

Cases: dictation into composer/Notes, interim then one final, unconfirmed-mic states, provider change rejects late text.

| Source | Verdict | Cases to carry (reviewer note) |
|---|---|---|
| `test/browser-local-transcription.test.mjs` | carry from DELETE | duplicate of `browser-speech.spec.ts`; 1 case to `journeys/voice.spec.ts` |
| `test/browser/voice-composer-recovery.spec.ts` | MERGE | `journeys/voice.spec.ts` |

#### `test/browser/journeys/account-sign-in.spec.ts` — T5

Cases: sign-in gate, email code, Google start/cancel races, saved sign-in retry, post-sign-in setup, sign-in incomplete during startup, key refused/replaced during admission.

| Source | Verdict | Cases to carry (reviewer note) |
|---|---|---|
| `test/browser/accessibility-sign-in.production.spec.ts` | MERGE | `journeys/connection-cloud.spec.ts` (production) |
| `test/browser/native-cloud-signin.spec.ts` | MERGE | `journeys/connection-cloud.spec.ts` (sign-in) |
| `test/browser/post-sign-in-setup.spec.ts` | MERGE | `post-sign-in-setup.production.spec.ts` |
| `test/browser/saved-signin-retry.production.spec.ts` | MERGE | `journeys/connection-cloud` (production) |
| `test/cloud-phone-login.test.mjs` | MERGE (shared by H2, T5; TZ deletes) | `test/integration/connection-cloud.test.mjs` (cases 2-3); `journeys/connection-cloud.spec.ts` (case 1) |
| `test/cloud-sign-in-state.test.mjs` | REWRITE | `journeys/connection-cloud.spec.ts` + later integration |
| `test/post-sign-in-setup.test.mjs` | carry from DELETE (shared by T15, T5; TZ deletes) | 4 cases to `journeys/connection-cloud.spec.ts`, `journeys/startup-permissions.spec.ts`, `journeys/settings.spec.ts` |
| `test/sign-in-incomplete-queue.test.mjs` | REWRITE | `journeys/connection-cloud.spec.ts` (2 cases) |

#### `test/browser/journeys/account-plan.spec.ts` — T5

Cases: plan and billing, membership code errors, "Not available" balance, redeemed plan end, account replacement, per-owner draft isolation on replacement.

| Source | Verdict | Cases to carry (reviewer note) |
|---|---|---|
| `test/browser/billing-recovery.production.spec.ts` | MERGE | `journeys/connection-cloud.spec.ts` (subscription) |
| `test/browser/cloud-account-panel.spec.ts` | MERGE | `journeys/connection-cloud.spec.ts` |
| `test/browser/cloud-account-replacement.production.spec.ts` | MERGE | `journeys/connection-cloud.spec.ts` (both cases; drop personal-setup seed) |
| `test/browser/native-cloud-subscription.spec.ts` | KEEP | `journeys/connection-cloud.spec.ts` (plan) |
| `test/cloud-membership-presentation.test.mjs` | MERGE (shared by T14, T5; TZ deletes) | account-sheet + accessibility journeys |
| `test/subscription-entitlement.test.mjs` | carry from DELETE | carry 3 cases to `journeys/connection-cloud.spec.ts` |

#### `test/browser/journeys/agent-connection.spec.ts` — T5

Cases: resident agent status/admission/auto-retry 3/10/30/60 s, pre-bind stop refusal, explicit panel kept at startup, own provider keys and cancel readback, delegation return, P-43 honest replies, "Agent unavailable" opens Settings > Agent connection.

| Source | Verdict | Cases to carry (reviewer note) |
|---|---|---|
| `scripts/test-cloud-delegation-return.ts` | MOVE | delegation-return page (only while C4 keeps it) |
| `scripts/test-cloud-delegation.ts` | REWRITE | 7 cases |
| `test/browser/browser-cloud-bootstrap.spec.ts` | carry from DELETE | (optional step in `journeys/connection-cloud.spec.ts`) |
| `test/browser/connection-activity-presentation.spec.ts` | MERGE | `journeys/connection-cloud.spec.ts` (1 case) |
| `test/browser/connection-boundaries.production.spec.ts` | MERGE (shared by T14, T5; TZ deletes) | `journeys/connection-cloud.spec.ts` (~11) + `journeys/production-gating.spec.ts` (1) |
| `test/browser/connection-startup-presentation.spec.ts` | MERGE | `journeys/connection-cloud.spec.ts` (resident restart, no chooser flash) |
| `test/browser/device-view-profile.spec.ts` | MERGE | `journeys/connection-cloud.spec.ts` (5–6 scenarios on the harness bridge) |
| `test/browser/local-agent-availability.spec.ts` | MERGE | `journeys/connection-cloud.spec.ts` |
| `test/browser/local-agent-stop.spec.ts` | MERGE | `journeys/connection-cloud.spec.ts` |
| `test/browser/local-provider-settings.spec.ts` | MERGE | `journeys/connection-cloud.spec.ts` |
| `test/browser/own-provider.production.spec.ts` | MERGE | `journeys/connection-cloud.spec.ts` (production) |
| `test/browser/privacy-per-connection.spec.ts` | MERGE | `journeys/connection-cloud.spec.ts` + settings |
| `test/browser/production-surface.spec.ts` | MERGE (shared by T14, T5; TZ deletes) | `journeys/production-gating.spec.ts` (prod); P-43 matrix → `journeys/connection-cloud.spec.ts` (prod) |
| `test/browser/provider-key-reconnect.production.spec.ts` | MERGE | `journeys/connection-cloud.spec.ts` (prod) |
| `test/browser/resident-first-run.production.spec.ts` | MERGE (shared by T15, T5; TZ deletes) | `journeys/connection-cloud.spec.ts` (prod) + `journeys/startup-permissions.spec.ts` (prod) |
| `test/browser/resident-recovery.production.spec.ts` | MERGE | `journeys/connection-cloud.spec.ts` (prod) |
| `test/browser/signed-out-page.production.spec.ts` | MERGE | `journeys/connection-cloud` (production) mandatory sign-in |
| `test/cloud-delegation-callback.test.mjs` | REWRITE | `journeys/connection-cloud.spec.ts` (5 cases) |
| `test/connection-chooser-focus.test.mjs` | carry from DELETE | 1 step → `journeys/connection-cloud.spec.ts` |
| `test/connection-presentation-state.test.mjs` | carry from DELETE (shared by H2, T5; TZ deletes) | ~15 cases → `connection-cloud.test.ts`, `journeys/connection-cloud`, `chat`, `settings` |
| `test/fixtures/google-cancel-boundary.mjs` | carry from DELETE | with `test/google-cancel-boundary.test.mjs`; cases → `journeys/connection-cloud.spec.ts` |
| `test/google-cancel-committed-key.test.mjs` | carry from DELETE | F01 case to `journeys/connection-cloud.spec.ts` |
| `test/google-native-mfa.test.mjs` | carry from DELETE | 2 cases in `journeys/connection-cloud.spec.ts` |
| `test/own-provider-cancel-readback.test.mjs` | carry from DELETE | 2 assertions → `journeys/connection-cloud.spec.ts` |
| `test/own-provider-service-restore.test.mjs` | carry from DELETE | 2 assertions → `journeys/connection-cloud.spec.ts` |
| `test/provider-key-release-drain.test.mjs` | carry from DELETE | 1 case to `journeys/connection-cloud.spec.ts` |
| `test/resident-admission-outcome.test.mjs` | REWRITE | `journeys/connection-cloud.spec.ts` (6 cases) |
| `test/resident-auto-retry.test.mjs` | REWRITE | `journeys/connection-cloud.spec.ts` (1 case, Playwright clock) |
| `test/resident-explicit-panel-startup.test.mjs` | REWRITE | `journeys/connection-cloud.spec.ts` (1 case) |
| `test/settings-signout-confirm.test.mjs` | carry from DELETE | carry 1 case to `journeys/connection-cloud.spec.ts` |

#### `test/browser/journeys/inbox.spec.ts` — T6

Cases: read, folders, images, hostile HTML (4 cases), attachments, pagination, read-cache restore, attention, retention, Gmail connect return.

| Source | Verdict | Cases to carry (reviewer note) |
|---|---|---|
| `scripts/test-inbox-attention-flow.ts` | REWRITE (shared by H5, T6; TZ deletes) | journey + 2 pure cases |
| `scripts/test-inbox-cloud-flow.ts` | REWRITE | vm transplant replaced by journey |
| `scripts/test-inbox-retention-cases.ts` | REWRITE | retention cases through UI |
| `scripts/test-mail-html.ts` | REWRITE | 4 hostile-input cases |
| `test/browser/attachment-accessibility.spec.ts` | MERGE | `journeys/inbox.spec.ts` |
| `test/browser/dev-inbox-triage.spec.ts` | MERGE | `journeys/inbox.spec.ts`: triage; reply/forward; drafts |
| `test/browser/dev-inbox.spec.ts` | MERGE | `journeys/inbox.spec.ts`: compose-attach-save-restore-send-open; drafts |
| `test/browser/file-email.spec.ts` | MERGE | `journeys/inbox.spec.ts` "attach to email" (with `photo-email`) |
| `test/browser/gmail-grant-recovery.spec.ts` | MERGE | `journeys/inbox.spec.ts` |
| `test/browser/gmail-mvp-scope.spec.ts` | REWRITE | basis of `journeys/inbox.spec.ts` |
| `test/browser/home-inbox.spec.ts` | MERGE | `journeys/inbox.spec.ts` Home card |
| `test/browser/inbox-attachment-layout.spec.ts` | MERGE | `journeys/inbox.spec.ts` attachment review |
| `test/browser/inbox-folders-compatibility.production.spec.ts` | MERGE | `journeys/inbox.spec.ts` production describe |
| `test/browser/inbox-hostile-attachment.spec.ts` | KEEP | `journeys/inbox.spec.ts` › hostile attachments |
| `test/browser/inbox-message-layout.spec.ts` | MERGE | `journeys/inbox.spec.ts` |
| `test/browser/inbox-owner-fence.spec.ts` | MERGE | `journeys/inbox.spec.ts` owner safety |
| `test/browser/inbox-save-attachment.spec.ts` | MERGE | `journeys/inbox.spec.ts` › hostile attachments |
| `test/browser/journey-core-loops.production.spec.ts` | KEEP (shared by T10, T11, T13, T15, T3, T6, T7, T8, T9; TZ deletes) | chat, reminders, browser, notes, calendar/maps, workflows, inbox, camera-photos, files, settings journeys (production project) |
| `test/browser/journey-f-email-notifications.spec.ts` | MERGE (shared by T11, T6; TZ deletes) | tests 1-4 → `journeys/inbox.spec.ts`; test 5 → `journeys/notifications.spec.ts` |
| `test/browser/mail-controls.spec.ts` | MERGE (shared by T3, T6; TZ deletes) | `journeys/chat.spec.ts`, `journeys/inbox.spec.ts` |
| `test/browser/mail-images.spec.ts` | MERGE | `journeys/inbox.spec.ts` |
| `test/browser/owner-gmail-read-state-absent.spec.ts` | MERGE | `journeys/inbox.spec.ts` (1 parametrised case) |
| `test/browser/photo-email.spec.ts` | MERGE | `journeys/inbox.spec.ts` (2 cases) |
| `test/google-workspace-return.test.mjs` | REWRITE | `journeys/inbox.spec.ts` (3 Gmail-connect cases) |
| `test/inbox-operation-guards.test.mjs` | MERGE | inbox integration (regressed receipt never re-dispatches, mailbox byte budget); review-sheet cases to `journeys/inbox.spec.ts`; legacy shared-document eraser deleted (A1) |

#### `test/browser/journeys/inbox-compose.spec.ts` — T6

Cases: draft recovery, reviewed send, trash/undo, use-in-email (reply to self, off-screen append), unsaved recovery, Gmail grant recovery.

| Source | Verdict | Cases to carry (reviewer note) |
|---|---|---|
| `scripts/test-inbox-drafts-browser.ts` | REWRITE | in-page backdoors replaced by UI |
| `test/browser/inbox-compose-layout.spec.ts` | MERGE | `journeys/inbox.spec.ts` compose/local draft |
| `test/browser/inbox-folders-drafts.spec.ts` | MERGE | `journeys/inbox.spec.ts` |
| `test/browser/inbox-read-cancel-draft.spec.ts` | MERGE | `journeys/inbox.spec.ts` |
| `test/browser/inbox-unsaved-recovery.spec.ts` | MERGE | `journeys/inbox.spec.ts` "unsaved edits" (stays in the storage list) |
| `test/browser/journey-f-reviewed-send.spec.ts` | KEEP | `journeys/inbox.spec.ts` (reviewed send), on `fakeGmailProvider` |
| `test/browser/mail-preview.spec.ts` | MERGE | `journeys/inbox.spec.ts` |
| `test/browser/mail-review.production.spec.ts` | MERGE | `journeys/inbox.spec.ts` (production) |
| `test/browser/use-in-email.production.spec.ts` | KEEP | basis of `journeys/inbox.spec.ts` |
| `test/browser/use-in-email.spec.ts` | MERGE | `journeys/inbox.spec.ts` (production) |
| `test/use-in-email-review.test.mjs` | REWRITE | `journeys/inbox.spec.ts` |

#### `test/browser/journeys/calendar.spec.ts` — T7

Cases: create/edit/delete with review, all-day/zone/repeat provider fields, DST gap refusal, unknown delete holds dispatch, midnight rollover, drafts survive resize and reload.

| Source | Verdict | Cases to carry (reviewer note) |
|---|---|---|
| `scripts/test-calendar-crud-review.ts` | REWRITE | 4 cases |
| `scripts/test-calendar-query-race.ts` | REWRITE | 1 case |
| `test/browser/calendar-creation-recovery.spec.ts` | MERGE | `journeys/calendar.spec.ts` |
| `test/browser/calendar-delete-completion.spec.ts` | MERGE | `journeys/calendar.spec.ts` "late completion" case |
| `test/browser/calendar-delete-review.spec.ts` | MERGE | `journeys/calendar.spec.ts` |
| `test/browser/calendar-edit-draft.spec.ts` | MERGE | `journeys/calendar.spec.ts` |
| `test/browser/calendar-end-after-start.spec.ts` | MERGE | `journeys/calendar.spec.ts` |
| `test/browser/calendar-form-controls.spec.ts` | MERGE | `journeys/calendar.spec.ts` form section |
| `test/browser/calendar-form-draft.spec.ts` | MERGE | `journeys/calendar.spec.ts` |
| `test/browser/calendar-month-focus.spec.ts` | MERGE | `journeys/calendar.spec.ts` |
| `test/browser/calendar-proposal-review.production.spec.ts` | KEEP | `journeys/calendar.spec.ts` production section |
| `test/browser/calendar-save-completion.spec.ts` | MERGE | `journeys/calendar.spec.ts` "late completion" case |
| `test/browser/calendar-wide-days.spec.ts` | MERGE | `journeys/calendar.spec.ts` |
| `test/browser/canonical-calendar-form-review.spec.ts` | MERGE | `journeys/calendar.spec.ts` |
| `test/browser/dev-calendar-assistant.spec.ts` | REWRITE | `journeys/calendar.spec.ts` assistant-action table on the resident |
| `test/browser/dev-calendar-navigation.spec.ts` | MERGE | `journeys/calendar.spec.ts` (pending-open cover, cancel on leave) |
| `test/browser/dev-calendar-recurring-assistant.spec.ts` | MERGE | `journeys/calendar.spec.ts` assistant-action table (recurring rows) |
| `test/browser/dev-calendar-series.spec.ts` | MERGE | `journeys/calendar.spec.ts`: two repeating-event cases (one occurrence; whole series with explicit scope) |
| `test/browser/dev-parity.spec.ts` | carry from DELETE (shared by T14, T7; TZ deletes) | carry device-controls round trip → `journeys/dev-surface.spec.ts`; calendar edit-during-review conflict → `journeys/calendar.spec.ts` only if no calendar-agent spec keep… |
| `test/browser/domain-recovery-lifecycle.spec.ts` | MERGE | 1 case to `journeys/calendar.spec.ts` |
| `test/browser/home-brief-result.production.spec.ts` | KEEP (shared by T13, T7; TZ deletes) | `journeys/workflows.spec.ts` (digest→brief) + `journeys/calendar.spec.ts` (canonical Home card) |
| `test/browser/journey-core-loops.production.spec.ts` | KEEP (shared by T10, T11, T13, T15, T3, T6, T7, T8, T9; TZ deletes) | chat, reminders, browser, notes, calendar/maps, workflows, inbox, camera-photos, files, settings journeys (production project) |
| `test/browser/native-calendar-deletion-routing.spec.ts` | MERGE | `journeys/calendar.spec.ts` |
| `test/calendar-confirmation.test.mjs` | carry from DELETE | 2 steps in `journeys/calendar.spec.ts` |
| `test/calendar-end-after-start.test.mjs` | carry from DELETE | DST-gap step into `journeys/calendar.spec.ts` |
| `test/canvas-geometry.test.mjs` | MERGE (shared by T12, T7; TZ deletes) | `journeys/home-shell.spec.ts` viewports, `journeys/calendar.spec.ts` columns |
| `test/fixtures/calendar-mounted-editor.mjs` | REWRITE | Playwright fixture for `journeys/calendar.spec.ts` |

#### `test/browser/journeys/calendar-agent.spec.ts` — T7

Cases: Agent Calendar, Google link, availability freshness "unknown", approval queue.

| Source | Verdict | Cases to carry (reviewer note) |
|---|---|---|
| `test/browser/calendar-approval-queue.spec.ts` | REWRITE | `journeys/calendar.spec.ts` via approval queue UI |
| `test/browser/calendar-availability.spec.ts` | REWRITE | `journeys/calendar.spec.ts` production section on resident-agent harness |
| `test/browser/home-calendar-density.spec.ts` | MERGE | `journeys/calendar.spec.ts` |
| `test/browser/one-calendar.spec.ts` | MERGE | `journeys/calendar.spec.ts` (3 cases) |

#### `test/browser/journeys/reminders.spec.ts` — T7

Cases: Clock handoff (7 cases), reminder create/snooze/complete/Reopen, DST gap, notice taps, timing review, cross-tab retention (@storage).

| Source | Verdict | Cases to carry (reviewer note) |
|---|---|---|
| `scripts/test-reminder-time-flow.ts` | REWRITE | DST gap |
| `test/browser/agent-clock-handoff.spec.ts` | REWRITE | `journeys/reminders.spec.ts` (Clock handoff, production harness; 7 cases) |
| `test/browser/all-view-context.production.spec.ts` | MERGE (shared by T3, T7; TZ deletes) | `journeys/chat.spec.ts` (context); capability test → `journeys/reminders.spec.ts` |
| `test/browser/browser-reminder-edit-recovery.spec.ts` | REWRITE | `journeys/reminders.spec.ts` (4-5 cases) |
| `test/browser/browser-reminder-recurrence.spec.ts` | MERGE | `journeys/reminders.spec.ts` (3 cases) |
| `test/browser/clock-dialog-accessibility.spec.ts` | MERGE | `journeys/reminders.spec.ts`, accessibility sweep |
| `test/browser/clock-repeat.production.spec.ts` | MERGE | `journeys/reminders.spec.ts` |
| `test/browser/dev-clock.spec.ts` | MERGE | `journeys/reminders.spec.ts`: set/list/delete; ring-snooze-dismiss (+ recurring); mock mode makes no handoff |
| `test/browser/durable-delete-undo.spec.ts` | MERGE | `journeys/reminders.spec.ts` |
| `test/browser/journey-c-alarms.spec.ts` | MERGE | `journeys/reminders.spec.ts` |
| `test/browser/journey-core-loops.production.spec.ts` | KEEP (shared by T10, T11, T13, T15, T3, T6, T7, T8, T9; TZ deletes) | chat, reminders, browser, notes, calendar/maps, workflows, inbox, camera-photos, files, settings journeys (production project) |
| `test/browser/reminder-create-review.spec.ts` | MERGE | `journeys/reminders.spec.ts` |
| `test/browser/reminder-decision-review.spec.ts` | MERGE | `journeys/reminders.spec.ts` |
| `test/browser/reminder-delete-review.spec.ts` | MERGE | `journeys/reminders.spec.ts` |
| `test/browser/reminder-refusal-ui.spec.ts` | MERGE | `journeys/reminders.spec.ts` |
| `test/browser/reminder-timing-review.spec.ts` | MERGE | `journeys/reminders.spec.ts` |

#### `test/browser/journeys/notes.spec.ts` — T8

Cases: canonical CRUD, checklist, empty-note discard on Back/Home, owner switch reloads list, read-aloud stops on edit/leave, Trash and permanent delete, palette on review dialog.

| Source | Verdict | Cases to carry (reviewer note) |
|---|---|---|
| `test/browser/canonical-notes-checklist-labels.spec.ts` | MERGE | `journeys/notes.spec.ts` |
| `test/browser/canonical-notes-design.spec.ts` | MERGE | `journeys/notes.spec.ts`, accessibility sweep |
| `test/browser/canonical-notes-draft-copy.spec.ts` | MERGE | `journeys/notes.spec.ts` |
| `test/browser/canonical-notes.spec.ts` | KEEP | becomes `journeys/notes.spec.ts`; delete 1 legacy case, rewrite 5 |
| `test/browser/dev-sensors.spec.ts` | REWRITE (shared by T15, T8; TZ deletes) | `journeys/settings.spec.ts` (shade mic switch persists); `journeys/notes.spec.ts` (recorder stops, canonical Notes) |
| `test/browser/journey-core-loops.production.spec.ts` | KEEP (shared by T10, T11, T13, T15, T3, T6, T7, T8, T9; TZ deletes) | chat, reminders, browser, notes, calendar/maps, workflows, inbox, camera-photos, files, settings journeys (production project) |
| `test/browser/notes-permission-recovery.spec.ts` | MERGE | `journeys/notes.spec.ts` |
| `test/browser/responsive-surfaces.production.spec.ts` | MERGE (shared by T14, T8; TZ deletes) | `journeys/accessibility` (production) layout section; Notes cases → `journeys/notes` |
| `test/browser/share-panel.spec.ts` | REWRITE | `journeys/notes` share step |
| `test/canonical-note-calendar-admission.test.mjs` | carry from DELETE | 2 steps in `journeys/notes.spec.ts` |
| `test/notes-organize.test.mjs` | MERGE (shared by H6, T8; TZ deletes) | validator table → `test/integration/notes.test.mjs`; stale-revision / missing-folder agent moves → `journeys/notes.spec.ts` |

#### `test/browser/journeys/notes-capture.spec.ts` — T8

Cases: voice note recording (save after lost create reply = one note), transcript windows, summary/web source notes, saved-note transcription order, unsigned recorder refuses mic.

| Source | Verdict | Cases to carry (reviewer note) |
|---|---|---|
| `scripts/test-cloud-voice-flow.ts` | REWRITE | voice note flow |
| `test/app-record-pending-actions.test.mjs` | carry from DELETE | carry 3 cases to journeys/notes.spec.ts |
| `test/browser-note-pending-audio.test.mjs` | carry from DELETE | `journeys/notes.spec.ts`, 4 cases |
| `test/browser-saved-transcript-audio.test.mjs` | carry from DELETE | `journeys/notes.spec.ts`, 2 cases |
| `test/browser/browser-speech.spec.ts` | MERGE | `journeys/notes.spec.ts` |
| `test/browser/document-summary-note.production.spec.ts` | MERGE | `journeys/notes.production.spec.ts` |
| `test/browser/note-audio-lifecycle.spec.ts` | REWRITE | `journeys/notes.spec.ts` |
| `test/browser/notes-audio-journey.spec.ts` | MERGE | `journeys/notes.spec.ts` (cross-browser) |
| `test/browser/summary-source-note.spec.ts` | MERGE | `journeys/notes.spec.ts` |
| `test/browser/voice-levels.spec.ts` | MERGE | `journeys/notes.spec.ts` (recording) |
| `test/browser/voice-preparation-ownership.spec.ts` | MERGE (shared by T4, T8; TZ deletes) | `journeys/voice.spec.ts` + `journeys/notes.spec.ts` |
| `test/local-speech-playback.test.mjs` | REWRITE (shared by T4, T8; TZ deletes) | steps in `journeys/notes.spec.ts` (Cloud fallback, error copy) and `journeys/voice.spec.ts` (Listen refuses links) |
| `test/notes-recorder-controls.test.mjs` | carry from DELETE | 3 assertions → `journeys/notes.spec.ts` |
| `test/notes-recorder.test.mjs` | REWRITE (shared by H6, H8, T8; TZ deletes) | race cases → `test/integration/notes-recorder.test.mjs`; flows → `journeys/notes.spec.ts`; JVM journal → `test/android-jvm/note-recorder-journal.test.mjs`; manifest chec… |
| `test/saved-note-transcript.test.mjs` | REWRITE | `journeys/notes.spec.ts` (3 cases) |

#### `test/browser/journeys/camera.spec.ts` — T9

Cases: capture, mode switch stops recording, lock-screen session cannot reach Maps/Notes, agent capture queue, one recording race.

| Source | Verdict | Cases to carry (reviewer note) |
|---|---|---|
| `scripts/test-agent-camera-flow.ts` | REWRITE (shared by H6, T9; TZ deletes) | DeviceActions half to integration; capture to camera journey |
| `scripts/test-agent-context-browser.ts` | REWRITE (shared by H6, T3, T9; TZ deletes) | sanitizer cases to device-actions; context flows to journeys |
| `test/browser-camera-storage.test.mjs` | REWRITE | 4 cases → `journeys/camera-photos.spec.ts` |
| `test/browser/agent-camera-capture.spec.ts` | MERGE | `journeys/camera-photos.spec.ts` |
| `test/browser/browser-camera.spec.ts` | MERGE | `journeys/camera-photos.spec.ts` |
| `test/browser/camera-controls.spec.ts` | MERGE | `journeys/camera-photos.spec.ts` |
| `test/browser/camera-tools-layout.spec.ts` | MERGE | `journeys/camera-photos.spec.ts` |
| `test/browser/canonical-icons.spec.ts` | REWRITE (shared by T12, T14, T9; TZ deletes) | `journeys/home-shell.spec.ts`, `journeys/accessibility.spec.ts`, `journeys/camera-photos.spec.ts` |
| `test/browser/dev-camera-focus.spec.ts` | MERGE | `journeys/camera-photos.spec.ts`: tap/keyboard focus clears on switch and Home |
| `test/browser/dev-camera-light.spec.ts` | MERGE | `journeys/camera-photos.spec.ts`: screen light, unfiltered photo, retires on switch/Home/ended |
| `test/browser/dev-image-question.spec.ts` | MERGE | `journeys/camera-photos.spec.ts`: ask about the camera frame; ask about a saved photo |
| `test/browser/journey-core-loops.production.spec.ts` | KEEP (shared by T10, T11, T13, T15, T3, T6, T7, T8, T9; TZ deletes) | chat, reminders, browser, notes, calendar/maps, workflows, inbox, camera-photos, files, settings journeys (production project) |
| `test/browser/product-recovery-entry.spec.ts` | REWRITE (shared by T10, T9; TZ deletes) | `journeys/browser.spec.ts`, `journeys/camera-photos.spec.ts` |
| `test/camera-preview-recovery.test.mjs` | carry from DELETE | ~10 steps in `journeys/camera-photos.spec.ts` |
| `test/context-selection.test.mjs` | carry from DELETE | folder half with C19; 1 photo-rewrite step → `journeys/camera-photos.spec.ts` |

#### `test/browser/journeys/photos.spec.ts` — T9

Cases: permitted library, albums, batch, edit, share, Recently Deleted exact-revision delete (3 steps), viewer keyboard zoom/pan, tied-date paging on current rows.

| Source | Verdict | Cases to carry (reviewer note) |
|---|---|---|
| `test/browser/browser-photo-edit.spec.ts` | MERGE | `journeys/camera-photos.spec.ts` |
| `test/browser/camera-media.production.spec.ts` | KEEP (shared by T10, T9; TZ deletes) | `journeys/camera-photos.spec.ts` + `journeys/files.spec.ts` |
| `test/browser/media-polish.spec.ts` | MERGE | `journeys/camera-photos.spec.ts` (+1 to chat) |
| `test/browser/permitted-photos.spec.ts` | MERGE | `journeys/camera-photos.spec.ts` (3 cases) |
| `test/browser/photo-agent-review-leave.spec.ts` | MERGE | `journeys/camera-photos.spec.ts` (1 case) |
| `test/browser/photo-album-accessibility.spec.ts` | MERGE | `journeys/camera-photos.spec.ts` + accessibility |
| `test/browser/photo-albums.spec.ts` | MERGE | `journeys/camera-photos.spec.ts` |
| `test/browser/photo-batch.spec.ts` | MERGE | `journeys/camera-photos.spec.ts` |
| `test/browser/photo-delete-accessibility.spec.ts` | MERGE | `journeys/camera-photos.spec.ts` |
| `test/browser/photo-order.spec.ts` | REWRITE | `journeys/camera-photos.spec.ts` (1 case, current-store seed) |
| `test/browser/photo-permitted-batch.spec.ts` | MERGE | `journeys/camera-photos.spec.ts` |
| `test/browser/photos-grid-density.spec.ts` | MERGE | `journeys/camera-photos.spec.ts` (1 case) |
| `test/browser/photos-pending-read.production.spec.ts` | MERGE | `journeys/camera-photos.spec.ts` (production, 2 cases) |
| `test/photos-pending-read.test.mjs` | carry from DELETE | 2 cases to `journeys/camera-photos.spec.ts` |
| `test/photos-thumbnail-refresh.test.mjs` | carry from DELETE | 2 cases to `journeys/camera-photos.spec.ts` |
| `test/share-panel-adapter.test.mjs` | carry from DELETE | 1 case `journeys/camera-photos.spec.ts` |

#### `test/browser/journeys/video.spec.ts` — T9

Cases: video playback and edit on the native path.

| Source | Verdict | Cases to carry (reviewer note) |
|---|---|---|
| `test/browser/browser-video.spec.ts` | MERGE | `journeys/camera-photos.spec.ts` |
| `test/browser/native-video-library-change.spec.ts` | MERGE | `journeys/camera-photos.spec.ts` |
| `test/browser/video-edit.spec.ts` | MERGE | `journeys/camera-photos.spec.ts` |
| `test/video-capture-limit.test.mjs` | carry from DELETE | Carry the size-limit save and the size-limit failure to `journeys/camera-photos.spec.ts` |

#### `test/browser/journeys/scan.spec.ts` — T9

Cases: page camera, edges, OCR, searchable PDF ("nothing written keeps review open"), Close/Keep/Discard/Resume draft, all-day poster to event.

| Source | Verdict | Cases to carry (reviewer note) |
|---|---|---|
| `test/browser/journey-j01-poster-calendar.spec.ts` | KEEP | `journeys/camera-photos.spec.ts` (scan) |
| `test/browser/local-ocr.spec.ts` | MERGE | `journeys/camera-photos.spec.ts` (scan) |
| `test/browser/scan-correction.spec.ts` | MERGE | `journeys/camera-photos` Scan |
| `test/browser/scan-document.spec.ts` | MERGE | `journeys/camera-photos` Scan |
| `test/browser/scan-draft.spec.ts` | MERGE | `journeys/camera-photos` Scan |
| `test/browser/scan-edges.spec.ts` | MERGE | `journeys/camera-photos` Scan |
| `test/browser/scan-event.spec.ts` | MERGE | `journeys/camera-photos` Scan → Calendar |
| `test/browser/scan-keep.spec.ts` | MERGE | `journeys/camera-photos` Scan (via photos plugin) |
| `test/browser/scan-links.spec.ts` | MERGE | `journeys/camera-photos` Scan |
| `test/browser/scan-native-page-camera.spec.ts` | MERGE (shared by T1, T9; TZ deletes) | `journeys/camera-photos` Scan; bridge → `harness/plugins/camera.ts` |
| `test/browser/scan-page-camera.spec.ts` | MERGE | `journeys/camera-photos` Scan (browser-camera; owner question) |
| `test/browser/scan-pdf.spec.ts` | MERGE | `journeys/camera-photos` Scan |
| `test/browser/scan-review-keyboard.spec.ts` | MERGE | `journeys/camera-photos` Scan large-text step |
| `test/browser/scan-searchable.spec.ts` | MERGE | `journeys/camera-photos` Scan |
| `test/browser/scan-text-draft.spec.ts` | MERGE | `journeys/camera-photos` Scan |
| `test/camera-scan-keep.test.mjs` | carry from DELETE | 2 steps in `journeys/camera-photos.spec.ts` |
| `test/scan-all-day-draft.test.mjs` | REWRITE | `journeys/camera-photos.spec.ts` (1 case) |
| `test/scan-document-drafts.test.mjs` | REWRITE | `journeys/camera-photos.spec.ts` (4 cases) |
| `test/scan-review-pdf-errors.test.mjs` | REWRITE (shared by T10, T9; TZ deletes) | `journeys/camera-photos.spec.ts` (2) + `journeys/files.spec.ts` (1) |

#### `test/browser/journeys/files.spec.ts` — T10

Cases: import, preview, bulk, sort, storage usage, save attachment, 30-day Trash expiry with fixed clock, late picker result after leaving Files, Recent eviction releases grant, Ask on selected document (3 cases).

| Source | Verdict | Cases to carry (reviewer note) |
|---|---|---|
| `test/browser/camera-media.production.spec.ts` | KEEP (shared by T10, T9; TZ deletes) | `journeys/camera-photos.spec.ts` + `journeys/files.spec.ts` |
| `test/browser/dev-content-question.spec.ts` | MERGE | `journeys/files.spec.ts`: ask about a file, compose, send |
| `test/browser/dev-files.spec.ts` | MERGE | `journeys/files.spec.ts`: new folder; PDF pages + Ask; sandboxed HTML; source link + 5 MiB limit; rename after reload |
| `test/browser/document-excerpt-sensitive.spec.ts` | MERGE | `journeys/files.spec.ts` |
| `test/browser/files-agent-filter.spec.ts` | REWRITE | `journeys/files.spec.ts` "agent actions" through the agent fake |
| `test/browser/files-bulk.spec.ts` | MERGE | `journeys/files.spec.ts` (archive-path guard to `storage-contract.spec.ts`) |
| `test/browser/files-dialog-accessibility.spec.ts` | MERGE | `journeys/files.spec.ts` "Files dialogs" |
| `test/browser/files-dialog-dismissal.spec.ts` | MERGE | `journeys/files.spec.ts` "Files dialogs" |
| `test/browser/files-dialog-large-text.spec.ts` | MERGE | `journeys/files.spec.ts` "Files dialogs" |
| `test/browser/files-location-layout.spec.ts` | MERGE | one step in the Files root test |
| `test/browser/files-preview-media.spec.ts` | MERGE | `journeys/files.spec.ts` "preview" |
| `test/browser/files-sort-directions.spec.ts` | MERGE | `journeys/files.spec.ts` |
| `test/browser/journey-core-loops.production.spec.ts` | KEEP (shared by T10, T11, T13, T15, T3, T6, T7, T8, T9; TZ deletes) | chat, reminders, browser, notes, calendar/maps, workflows, inbox, camera-photos, files, settings journeys (production project) |
| `test/browser/photos-clean-controls.spec.ts` | MERGE (shared by T10, T3; TZ deletes) | camera-photos, `journeys/chat.spec.ts`, `journeys/files.spec.ts` |
| `test/browser/selected-content-question.spec.ts` | MERGE | `journeys/files` "ask about a file" |
| `test/browser/selected-content-readiness.spec.ts` | MERGE | `journeys/files` "ask about a file" |
| `test/browser/selected-document-accessibility.spec.ts` | MERGE | `journeys/files` "open a document" |
| `test/browser/storage-usage.spec.ts` | MERGE | `journeys/files.spec.ts` (storage lane) |
| `test/scan-review-pdf-errors.test.mjs` | REWRITE (shared by T10, T9; TZ deletes) | `journeys/camera-photos.spec.ts` (2) + `journeys/files.spec.ts` (1) |
| `test/selection-ask-readiness.test.mjs` | REWRITE | `journeys/files.spec.ts` (3 cases) |

#### `test/browser/journeys/storage-contract.spec.ts` — T10

Cases: real browser/documents.ts store across two tabs and under quota failure (2 cases), zip path traversal; tagged @storage for firefox/webkit.

| Source | Verdict | Cases to carry (reviewer note) |
|---|---|---|
| `test/browser/domain-atomicity.spec.ts` | MERGE | `test/browser/storage-contract.spec.ts` (2 cases, T3 exception) |
| `test/browser/files-bulk.spec.ts` | MERGE | `journeys/files.spec.ts` (archive-path guard to `storage-contract.spec.ts`) |

#### `test/browser/journeys/browser.spec.ts` — T10

Cases: tabs, private tab, external handoff, find, copy link, bookmark startup failure quiet outside Browser, agent-opened page receipt ordering.

| Source | Verdict | Cases to carry (reviewer note) |
|---|---|---|
| `scripts/test-browser-bookmark-recovery.ts` | REWRITE | bookmark recovery through UI |
| `test/browser-bookmark-startup.test.mjs` | carry from DELETE | 1 case → `journeys/browser.spec.ts` |
| `test/browser-command-refusals.test.mjs` | carry from DELETE | cases to `journeys/browser.spec.ts`; duplicate of navigation-creation:34-44 |
| `test/browser-navigation-creation.test.mjs` | carry from DELETE | `journeys/browser.spec.ts`, 5 cases |
| `test/browser-receipt-order.test.mjs` | carry from DELETE (shared by T10, T3; TZ deletes) | `journeys/browser.spec.ts` + 1 case in `journeys/chat.spec.ts` |
| `test/browser-session-persistence.test.mjs` | carry from DELETE | `journeys/browser.spec.ts`, 4 cases; `createSessionSaver` tests go with D20 |
| `test/browser/browser-chat-overlay.spec.ts` | MERGE | `journeys/browser.spec.ts` |
| `test/browser/browser-copy-link.spec.ts` | MERGE | `journeys/browser.spec.ts` |
| `test/browser/browser-external-handoff.production.spec.ts` | MERGE | `journeys/browser.spec.ts` (production) |
| `test/browser/browser-external-handoff.spec.ts` | MERGE | `journeys/browser.spec.ts` (production) |
| `test/browser/browser-list-focus.spec.ts` | MERGE | `journeys/browser.spec.ts`; Quint trace leaves e2e |
| `test/browser/browser-navigation.spec.ts` | MERGE | `journeys/browser.spec.ts` |
| `test/browser/browser-paste-fallback.production.spec.ts` | MERGE | `journeys/browser.spec.ts` (reading) |
| `test/browser/browser-profile-unsupported.production.spec.ts` | MERGE | `journeys/browser.spec.ts` (failures) |
| `test/browser/browser-web-find.production.spec.ts` | MERGE | `journeys/browser.spec.ts` production section |
| `test/browser/journey-core-loops.production.spec.ts` | KEEP (shared by T10, T11, T13, T15, T3, T6, T7, T8, T9; TZ deletes) | chat, reminders, browser, notes, calendar/maps, workflows, inbox, camera-photos, files, settings journeys (production project) |
| `test/browser/journey-e-browser-credentials.spec.ts` | KEEP | `journeys/browser.spec.ts` |
| `test/browser/product-recovery-entry.spec.ts` | REWRITE (shared by T10, T9; TZ deletes) | `journeys/browser.spec.ts`, `journeys/camera-photos.spec.ts` |

#### `test/browser/journeys/browser-reading.spec.ts` — T10

Cases: reviewed reading, sensitive refusal, research note (J05), saved sign-ins/password provider.

| Source | Verdict | Cases to carry (reviewer note) |
|---|---|---|
| `test/browser-reading-capability.test.mjs` | carry from DELETE | instrumented reading tests; 1 case to `journeys/browser.spec.ts` |
| `test/browser/browser-signins.spec.ts` | MERGE | `journeys/browser.spec.ts` |
| `test/browser/reading-capability.spec.ts` | MERGE | `journeys/browser.spec.ts` |
| `test/browser/reading-review.spec.ts` | MERGE (shared by H3, T10; TZ deletes) | `journeys/browser.spec.ts` |
| `test/browser/reading-sensitive.spec.ts` | REWRITE | `journeys/browser.spec.ts` |
| `test/browser/reading-source.spec.ts` | MERGE | `journeys/browser.spec.ts` |

#### `test/browser/journeys/maps.spec.ts` — T11

Cases: search, route alternatives, navigation start/stop, voice pause while screen off, Google content policy (3 cases), wire-context privacy, aged fix keeps route, share-choice, attribution, unavailable, event return.

| Source | Verdict | Cases to carry (reviewer note) |
|---|---|---|
| `scripts/maps/test-recovery-renderer.ts` | REWRITE | orphan recovery renderer script |
| `scripts/maps/test-renderer.ts` | REWRITE | orphan renderer script |
| `scripts/test-maps-context-browser.ts` | REWRITE | wire-context privacy |
| `scripts/test-maps-reroute-freshness.ts` | REWRITE | aged fix keeps route |
| `test/abort-signal-compat.test.mjs` | carry from DELETE | optional WebView-113 case in `journeys/maps.spec.ts` |
| `test/browser/calendar-maps-handoff.spec.ts` | MERGE | `journeys/maps.spec.ts` |
| `test/browser/dev-location.spec.ts` | MERGE (shared by T11, T13; TZ deletes) | `journeys/maps.spec.ts` Recenter; `journeys/workflows.spec.ts` away-from-Home condition |
| `test/browser/dev-maps-share.spec.ts` | MERGE | `journeys/maps.spec.ts`: share a place |
| `test/browser/dev-maps-voice.spec.ts` | MERGE | `journeys/maps.spec.ts`: spoken guidance; guidance outside Maps |
| `test/browser/global-basemap.spec.ts` | MERGE | `journeys/maps.spec.ts` |
| `test/browser/google-maps-raster.production.spec.ts` | MERGE | `journeys/maps.spec.ts` |
| `test/browser/journey-core-loops.production.spec.ts` | KEEP (shared by T10, T11, T13, T15, T3, T6, T7, T8, T9; TZ deletes) | chat, reminders, browser, notes, calendar/maps, workflows, inbox, camera-photos, files, settings journeys (production project) |
| `test/browser/journey-j04-android.production.spec.ts` | MERGE | `journeys/maps.spec.ts` |
| `test/browser/journey-j04-cloud-maps.production.spec.ts` | KEEP | `journeys/maps.spec.ts` |
| `test/browser/journey-j04-schedule-travel.spec.ts` | MERGE | `journeys/maps.spec.ts` |
| `test/browser/managed-maps-unavailable.production.spec.ts` | MERGE | `journeys/maps.spec.ts` (production) |
| `test/browser/maps-approved-read.spec.ts` | MERGE | `journeys/maps.spec.ts` (agent share) |
| `test/browser/maps-event-return-ownership.spec.ts` | MERGE | `journeys/maps.spec.ts` (hand-off) |
| `test/browser/maps-event-return.spec.ts` | MERGE | `journeys/maps.spec.ts` (hand-off) |
| `test/browser/maps-legacy-provenance.production.spec.ts` | MERGE | `journeys/maps.spec.ts` (production) |
| `test/browser/maps-list-focus.spec.ts` | MERGE | `journeys/maps.spec.ts` (focus) |
| `test/browser/maps-share-layout.spec.ts` | MERGE | `journeys/maps.spec.ts` (share) |
| `test/browser/owner-maps-attribution-refusals.spec.ts` | MERGE | `journeys/maps.spec.ts` (2 cases) |
| `test/browser/upstream-map-plane.spec.ts` | MERGE | `journeys/maps.spec.ts` |
| `test/google-maps-content.test.mjs` | REWRITE | `journeys/maps.spec.ts` (3 cases) |
| `test/maps-chat-markup.test.mjs` | MERGE (shared by H6, T11; TZ deletes) | `test/integration/maps.test.mjs`, `journeys/maps.spec.ts` |
| `test/navigation-voice-pause.test.mjs` | REWRITE | `journeys/maps.spec.ts` |

#### `test/browser/journeys/telephony.spec.ts` — T11

Cases: dialer, voicemail tab/delete-once, MMI refusal, emergency/busy wording, SMS mark-read bound, SIM pick, uncertain send keeps operation id, Contacts version-carrying save, late status after leaving Home.

| Source | Verdict | Cases to carry (reviewer note) |
|---|---|---|
| `test/browser/aosp-contacts.spec.ts` | MERGE | `journeys/telephony.spec.ts` |
| `test/browser/aosp-phone.spec.ts` | MERGE | `journeys/telephony.spec.ts` |
| `test/browser/aosp-telephony-views.spec.ts` | KEEP | `journeys/telephony.spec.ts` |
| `test/browser/dev-contacts.spec.ts` | MERGE | `journeys/telephony.spec.ts`: contact CRUD/favourite/Undo/reload |
| `test/browser/dev-incoming-call.spec.ts` | MERGE | `journeys/telephony.spec.ts`: accept/end; decline → voicemail → Undo |
| `test/browser/dev-message-attachments.spec.ts` | MERGE | `journeys/telephony.spec.ts`: attachment round-trip; PDF intact |
| `test/browser/dev-messages-lifecycle.spec.ts` | MERGE | `journeys/telephony.spec.ts`: search after reload; swipe delete + Undo |
| `test/browser/dev-phone-messages.spec.ts` | MERGE | `journeys/telephony.spec.ts`: call controls + recents after reload; message after reload |
| `test/browser/dev-voicemail-audio.spec.ts` | MERGE | `journeys/telephony.spec.ts`: read/stop/stale completion; Delete+Home retire; not-ready retry |
| `test/contacts-adapter.test.mjs` | REWRITE (shared by H6, T11; TZ deletes) | `journeys/phone-sms-contacts.spec.ts` (AOSP-image Contacts) |
| `test/image-sms.test.mjs` | REWRITE | `test/browser/journeys/messages.spec.ts` (mark-read bound, SIM pick/inactive/Allow SIM, uncertain send keeps operation ID); rest duplicated by SmsSend/MmsCompose Quint r… |
| `test/phone-adapter.test.mjs` | REWRITE (shared by H6, T11; TZ deletes) | `journeys/telephony.spec.ts`; observer-lease cases to `test/integration/phone-sms-contacts.test.ts` |
| `test/sms-incomplete-rows.test.mjs` | MERGE (shared by H6, T11; TZ deletes) | `test/integration/phone-sms.test.mjs` or `journeys/phone-sms.spec.ts` |
| `test/telephony-attention-lifecycle.test.mjs` | REWRITE | `journeys/telephony.spec.ts` (late status reads nothing) |
| `test/telephony-presenters.test.mjs` | REWRITE | `journeys/telephony.spec.ts` (Home cards) |

#### `test/browser/journeys/notifications.spec.ts` — T11

Cases: shade rows, Clear all mixed batch, tap routing per kind with draft preserved (5 cases), calendar alert tap opens exact event, workflow notice taps.

| Source | Verdict | Cases to carry (reviewer note) |
|---|---|---|
| `scripts/test-canonical-notification-navigation.ts` | REWRITE | 5 cases: tap routing per kind, draft preserved |
| `test/browser-notification-clear.test.mjs` | carry from DELETE | `journeys/notifications.spec.ts`, 4 cases |
| `test/browser/dev-hosted-journey.spec.ts` | MERGE | `journeys/notifications.spec.ts`: tap notice → retained output, switches persist, checks paused; notifications off |
| `test/browser/dev-hosted-results.spec.ts` | MERGE | `journeys/notifications.spec.ts`: shade hides result text, Clear all (1 step) |
| `test/browser/dev-notifications.spec.ts` | REWRITE | `journeys/notifications.spec.ts`: settings collection+previews+shade Clear all; locked redaction in shade; history clear w/ Cancel; pending/failed policy write toggles c… |
| `test/browser/gmail-notice-question.spec.ts` | MERGE | `journeys/notifications.spec.ts` (with `reminder-notice-question`) |
| `test/browser/journey-f-email-notifications.spec.ts` | MERGE (shared by T11, T6; TZ deletes) | tests 1-4 → `journeys/inbox.spec.ts`; test 5 → `journeys/notifications.spec.ts` |
| `test/browser/journey-f-hosted-result.spec.ts` | MERGE | `journeys/notifications.spec.ts` |
| `test/browser/notification-action-lifecycle.spec.ts` | REWRITE | `journeys/notifications.spec.ts` |
| `test/browser/reminder-notice-question.spec.ts` | MERGE | `journeys/notifications.spec.ts` |
| `test/browser/reminder-notice-taps.spec.ts` | MERGE | `journeys/notifications.spec.ts` |
| `test/browser/workflow-notice-taps.spec.ts` | MERGE | `journeys/notifications.spec.ts` |
| `test/browser/workflow-notices.spec.ts` | MERGE (shared by T11, T13; TZ deletes) | `journeys/notifications.spec.ts` + `journeys/workflows.spec.ts` |
| `test/canonical-notification-navigation.test.mjs` | carry from DELETE | `journeys/notifications.spec.ts` (4 cases) |
| `test/shade-notice-question.test.mjs` | carry from DELETE | 1 case `journeys/notifications.spec.ts` |

#### `test/browser/journeys/home-shell.spec.ts` — T12

Cases: standalone Home, HOME/Back detents, dock, toast (Retry stays visible, Undo), render-error recovery, system shade pull and hung-shade timeout, modal scrim, canvas viewports.

| Source | Verdict | Cases to carry (reviewer note) |
|---|---|---|
| `test/browser/assistant-surface-close.spec.ts` | REWRITE | `journeys/home-shell.spec.ts` |
| `test/browser/canonical-icons.spec.ts` | REWRITE (shared by T12, T14, T9; TZ deletes) | `journeys/home-shell.spec.ts`, `journeys/accessibility.spec.ts`, `journeys/camera-photos.spec.ts` |
| `test/browser/dev-search-question.spec.ts` | MERGE (shared by T12, T3; TZ deletes) | `journeys/chat.spec.ts` (composer sent only on Send); `journeys/home-shell.spec.ts` (Inbox attention card) |
| `test/browser/full-chat-grabber.spec.ts` | MERGE (shared by T12, T3; TZ deletes) | `journeys/chat.spec.ts` (sheet) + `journeys/home-shell.spec.ts` (raised dock) |
| `test/browser/mvp.spec.ts` | SPLIT (shared by T12, T14, T15; TZ deletes) | `home-shell`, `dev-surface`, `settings`; legacy cases deleted |
| `test/browser/notifications-handle.spec.ts` | MERGE (shared by T12, T14; TZ deletes) | `journeys/home-shell.spec.ts` (4 cases); 200 % case → `journeys/accessibility.spec.ts` |
| `test/browser/root-view-states.spec.ts` | MERGE | `journeys/home-shell` "fresh profile" |
| `test/browser/shell-toast.spec.ts` | MERGE | `journeys/home-shell` "notices" on the fake clock |
| `test/browser/standalone-shell.spec.ts` | MERGE (shared by T12, T3; TZ deletes) | `journeys/home-shell.spec.ts` + `journeys/chat.spec.ts` |
| `test/canonical-icons.test.mjs` | REWRITE | `scripts/vendor-lucide-icons.ts --check`; rendered icons in `journeys/home-shell.spec.ts` |
| `test/canvas-geometry.test.mjs` | MERGE (shared by T12, T7; TZ deletes) | `journeys/home-shell.spec.ts` viewports, `journeys/calendar.spec.ts` columns |
| `test/fixtures/modal-scrim-chromium.mjs` | KEEP | `journeys/home-shell.spec.ts`; move beside harness |
| `test/shade-tile-facts.test.mjs` | carry from DELETE | carry 2 cases to `journeys/home-shell.spec.ts` (standalone) |
| `test/shell-navigation-detent.test.mjs` | REWRITE | `journeys/home-shell.spec.ts` (3 cases) |
| `test/system-shade-timeout.test.mjs` | REWRITE | `journeys/home-shell.spec.ts` (hung shade request) |
| `test/system-shade.test.mjs` | REWRITE | `journeys/home-shell.spec.ts` (touch pull); manifest rule → `scripts/verify-apks.ts` |
| `test/toast-undo-offer.test.mjs` | REWRITE | `journeys/home-shell.spec.ts` (2-3 cases beyond `shell-toast.spec.ts`) |
| `test/view-navigation-settle.test.mjs` | MERGE | `journeys/home-shell.spec.ts`: fence failure after claim; a lost positive result is never followed by a second |

#### `test/browser/journeys/home-overview.spec.ts` — T12

Cases: daily overview, attention, brief empty/error/fresh, Agent Calendar "verified empty" rules (6-7 cases), retained brief withdrawn on disconnect.

| Source | Verdict | Cases to carry (reviewer note) |
|---|---|---|
| `test/browser/home-attention.spec.ts` | MERGE | `journeys/home-shell.spec.ts` overview |
| `test/browser/home-chat-anchor.spec.ts` | MERGE | `journeys/home-shell.spec.ts` chat-over-Home |
| `test/browser/home-daily-overview.spec.ts` | REWRITE | `journeys/home-shell.spec.ts` overview |
| `test/browser/home-landscape.spec.ts` | MERGE | `journeys/home-shell.spec.ts` orientation |
| `test/browser/home-overlay-stability.spec.ts` | MERGE | `journeys/home-shell.spec.ts` (with chat-anchor) |
| `test/home-calendar-selection.test.mjs` | REWRITE | `journeys/home-shell.spec.ts` (6-7 Agent Calendar cases) |
| `test/home-google-connection-source.test.mjs` | carry from DELETE | 1 case in `journeys/home-shell.spec.ts` |
| `test/home-shell.test.mjs` | carry from DELETE | 3 cases in `journeys/home-shell.spec.ts` |

#### `test/browser/journeys/launcher.spec.ts` — T12

Cases: installed apps, default apps, drawer, no installed-app read until drawer opens, failed launch toast once, favourites save error.

| Source | Verdict | Cases to carry (reviewer note) |
|---|---|---|
| `test/browser/drawer-full-height.spec.ts` | MERGE | `journeys/home-shell.spec.ts` |
| `test/browser/home-app-library.spec.ts` | MERGE | `journeys/home-shell.spec.ts` launcher |
| `test/browser/home-launcher.spec.ts` | MERGE | `journeys/home-shell.spec.ts` |
| `test/browser/home-native-launcher.spec.ts` | MERGE (shared by T12, T15; TZ deletes) | `journeys/home-shell.spec.ts` (+ permissions case → `journeys/startup-permissions.spec.ts`) |

#### `test/browser/journeys/settings.spec.ts` — T15

Cases: truthful state, device facts, update admission happy path, privacy per connection, appearance and theme boot order, text size latest-write-wins, locale/hour cycle (4), Phone page, Passwords, Activity, diagnostics refresh vs Clear problems, Google connections, reset private data.

| Source | Verdict | Cases to carry (reviewer note) |
|---|---|---|
| `test/app-update-automatic.test.mjs` | carry from DELETE | carry 3 cases to journeys/settings.spec.ts |
| `test/browser/appearance-storage.spec.ts` | MERGE | `journeys/settings.spec.ts` (appearance) |
| `test/browser/dev-display.spec.ts` | MERGE | `journeys/settings.spec.ts`: Display text size persists, scales once |
| `test/browser/dev-password-provider.spec.ts` | MERGE | `journeys/settings.spec.ts`: install/select/persist/fill/lock; cancel+failed save; Home clears sample |
| `test/browser/dev-sensors.spec.ts` | REWRITE (shared by T15, T8; TZ deletes) | `journeys/settings.spec.ts` (shade mic switch persists); `journeys/notes.spec.ts` (recorder stops, canonical Notes) |
| `test/browser/journey-core-loops.production.spec.ts` | KEEP (shared by T10, T11, T13, T15, T3, T6, T7, T8, T9; TZ deletes) | chat, reminders, browser, notes, calendar/maps, workflows, inbox, camera-photos, files, settings journeys (production project) |
| `test/browser/mvp.spec.ts` | SPLIT (shared by T12, T14, T15; TZ deletes) | `home-shell`, `dev-surface`, `settings`; legacy cases deleted |
| `test/browser/operation-review-accessibility.spec.ts` | REWRITE (shared by T14, T15; TZ deletes) | `journeys/accessibility.spec.ts` + `journeys/settings.spec.ts` (1 case each) |
| `test/browser/owner-settings-review.spec.ts` | MERGE | `journeys/settings.spec.ts` (2 cases) |
| `test/browser/password-entry-back.spec.ts` | MERGE | `journeys/settings.spec.ts` (Passwords step) |
| `test/browser/password-manager.spec.ts` | MERGE | `journeys/settings.spec.ts` (Passwords, 6 cases) |
| `test/browser/password-provider-setup.spec.ts` | MERGE | `journeys/settings.spec.ts` (Passwords) |
| `test/browser/password-provider-storage.spec.ts` | carry from DELETE | 1 case → `journeys/settings.spec.ts` |
| `test/browser/settings-device-facts.spec.ts` | MERGE | `journeys/settings` "Android facts and updates" |
| `test/browser/settings-navigation.spec.ts` | MERGE | `journeys/settings` navigation step |
| `test/browser/settings-page-accessibility.spec.ts` | MERGE (shared by T14, T15; TZ deletes) | `journeys/settings` keyboard step; dev rows → `journeys/dev-surface` |
| `test/browser/settings-truth.production.spec.ts` | KEEP | `journeys/settings` (production); shade → `home-shell`; plan/status → `connection-cloud` |
| `test/browser/settings.production.spec.ts` | MERGE (shared by T14, T15; TZ deletes) | `journeys/settings` (production); gating → `journeys/production-gating` |
| `test/browser/user-selected-settings.production.spec.ts` | MERGE | `journeys/settings.spec.ts` |
| `test/cloud-plan-cancel.test.mjs` | carry from DELETE | one step in `journeys/settings.spec.ts` |
| `test/dc-lite-keys.test.mjs` | REWRITE | step in `journeys/settings.spec.ts` |
| `test/diagnostics-export.test.mjs` | KEEP (shared by H2, T15; TZ deletes) | `test/integration/diagnostics-export.test.mjs`; fence case to `journeys/settings.spec.ts` |
| `test/google-agent-access.test.mjs` | MERGE (shared by H5, T15; TZ deletes) | host cases → inbox-gmail-google; renderer cases → `journeys/settings.spec.ts` |
| `test/google-connection-return.test.mjs` | REWRITE (shared by H5, T15; TZ deletes) | watcher cases as import-based integration; panel to settings journey |
| `test/google-connections-resource-budget.test.mjs` | REWRITE | `journeys/settings.spec.ts` |
| `test/locale-time.test.mjs` | REWRITE | `journeys/settings.spec.ts` (4 locale/hour-cycle cases) |
| `test/native-adapter-activity.test.mjs` | REWRITE | `journeys/settings.spec.ts` (Activity) |
| `test/password-manager-fences.test.mjs` | MERGE | `journeys/settings.spec.ts` |
| `test/password-manager-hidden.test.mjs` | MERGE | `journeys/settings.spec.ts` |
| `test/password-manager.test.mjs` | MERGE | `journeys/settings.spec.ts` (Passwords) |
| `test/phone-info-page.test.mjs` | REWRITE | `journeys/settings.spec.ts` (Settings → Phone) |
| `test/post-sign-in-setup.test.mjs` | carry from DELETE (shared by T15, T5; TZ deletes) | 4 cases to `journeys/connection-cloud.spec.ts`, `journeys/startup-permissions.spec.ts`, `journeys/settings.spec.ts` |
| `test/settings-refresh-text-scale.test.mjs` | carry from DELETE | carry 2 cases to `journeys/settings.spec.ts` |
| `test/system-bar-appearance.test.mjs` | REWRITE | `journeys/settings.spec.ts` (theme → bar icons once, retry) |

#### `test/browser/journeys/startup-permissions.spec.ts` — T15

Cases: permission walkthrough, denied never re-prompts, late notification rejection after deadline, startup frames.

| Source | Verdict | Cases to carry (reviewer note) |
|---|---|---|
| `test/browser-startup-permissions.test.mjs` | carry from DELETE | `journeys/startup-permissions.spec.ts`, 3 cases |
| `test/browser/helpers/startup-frames.ts` | KEEP | `journeys/startup-permissions.spec.ts` |
| `test/browser/home-native-launcher.spec.ts` | MERGE (shared by T12, T15; TZ deletes) | `journeys/home-shell.spec.ts` (+ permissions case → `journeys/startup-permissions.spec.ts`) |
| `test/browser/mock-readiness.spec.ts` | REWRITE | `journeys/startup-permissions.spec.ts` |
| `test/browser/native-plugin-startup.spec.ts` | MERGE | `journeys/startup-permissions.spec.ts` |
| `test/browser/post-sign-in-setup.production.spec.ts` | KEEP | becomes `journeys/startup-permissions.spec.ts` (production) |
| `test/browser/resident-first-run.production.spec.ts` | MERGE (shared by T15, T5; TZ deletes) | `journeys/connection-cloud.spec.ts` (prod) + `journeys/startup-permissions.spec.ts` (prod) |
| `test/browser/startup-access.spec.ts` | REWRITE | `journeys/startup-permissions.spec.ts` (production lane) |
| `test/browser/startup-permissions-walkthrough.spec.ts` | MERGE | `journeys/startup-permissions.spec.ts` |
| `test/notice-owner-startup.test.mjs` | carry from DELETE | 2 assertions → `journeys/startup-permissions.spec.ts` |
| `test/post-sign-in-setup.test.mjs` | carry from DELETE (shared by T15, T5; TZ deletes) | 4 cases to `journeys/connection-cloud.spec.ts`, `journeys/startup-permissions.spec.ts`, `journeys/settings.spec.ts` |

#### `test/browser/journeys/workflows.spec.ts` — T13

Cases: runs, approvals, receipts, missed run, interruption recovery, unknown-outcome lock across reload, run detail states, lost response/missing disclosure/stopped run, lifecycle, run/cancel.

| Source | Verdict | Cases to carry (reviewer note) |
|---|---|---|
| `scripts/test-workflow-approval-ui-flow.ts` | REWRITE | lost response, missing disclosure, stopped run |
| `scripts/test-workflow-lifecycle-ui-flow.ts` | REWRITE | lifecycle |
| `scripts/test-workflow-ui-flow.ts` | REWRITE | run/cancel |
| `test/automations-unified.test.mjs` | KEEP (shared by H7, T13; TZ deletes) | protocol → `test/integration/automations.test.mjs`; 7 cases → `journeys/workflows.spec.ts` |
| `test/browser/dev-digest-schedule.spec.ts` | MERGE | `journeys/workflows.spec.ts`: time-zone mismatch notice only |
| `test/browser/dev-incoming-attachments.spec.ts` | MERGE | `journeys/workflows.spec.ts`: email trigger saves exact attachment to Files; inbox step opens it |
| `test/browser/dev-location.spec.ts` | MERGE (shared by T11, T13; TZ deletes) | `journeys/maps.spec.ts` Recenter; `journeys/workflows.spec.ts` away-from-Home condition |
| `test/browser/dev-workflow-execution.spec.ts` | MERGE | `journeys/workflows.spec.ts`: Run now → output + history; Change keeps steps, paused stays paused |
| `test/browser/home-brief-result.production.spec.ts` | KEEP (shared by T13, T7; TZ deletes) | `journeys/workflows.spec.ts` (digest→brief) + `journeys/calendar.spec.ts` (canonical Home card) |
| `test/browser/home-workflows.spec.ts` | MERGE | `journeys/workflows.spec.ts` Home card |
| `test/browser/journey-core-loops.production.spec.ts` | KEEP (shared by T10, T11, T13, T15, T3, T6, T7, T8, T9; TZ deletes) | chat, reminders, browser, notes, calendar/maps, workflows, inbox, camera-photos, files, settings journeys (production project) |
| `test/browser/journey-d-digests.spec.ts` | MERGE | `journeys/workflows.spec.ts` |
| `test/browser/mvp-workflow-scope.spec.ts` | MERGE | `journeys/workflows.spec.ts` (mock) |
| `test/browser/unified-automations.spec.ts` | MERGE | `journeys/workflows.spec.ts` |
| `test/browser/workflow-generation.spec.ts` | MERGE | `journeys/workflows.spec.ts` (generation) |
| `test/browser/workflow-intent-storage.spec.ts` | MERGE | `journeys/workflows.spec.ts` (runs) |
| `test/browser/workflow-interruption-recovery.spec.ts` | KEEP | `journeys/workflows.spec.ts` (runs/recovery) |
| `test/browser/workflow-missed-run-now.spec.ts` | MERGE | `journeys/workflows.spec.ts` (runs) |
| `test/browser/workflow-notice-history.spec.ts` | MERGE | `journeys/workflows.spec.ts` (notices) |
| `test/browser/workflow-notices.spec.ts` | MERGE (shared by T11, T13; TZ deletes) | `journeys/notifications.spec.ts` + `journeys/workflows.spec.ts` |
| `test/browser/workflow-outcome-unknown.spec.ts` | MERGE | `journeys/workflows.spec.ts` (runs) |
| `test/browser/workflow-presentation-execution.spec.ts` | MERGE | `journeys/workflows.spec.ts` (device steps) |
| `test/browser/workflow-removed-navigation.spec.ts` | MERGE | `journeys/workflows.spec.ts` (lifecycle) |
| `test/browser/workflow-run-context.spec.ts` | MERGE | `journeys/workflows.spec.ts` |
| `test/browser/workflow-scope-refusal.spec.ts` | MERGE | `journeys/workflows.spec.ts` (generation) |
| `test/browser/workflows.production.spec.ts` | MERGE | `journeys/workflows.spec.ts` production section |
| `test/hosted-digest-panel.test.mjs` | carry from DELETE | optional 1 case `journeys/workflows.spec.ts` |
| `test/workflow-management-capability.test.mjs` | carry from DELETE | 1 case → `journeys/workflows.spec.ts` |

#### `test/browser/journeys/workflows-authoring.spec.ts` — T13

Cases: authoring, edit details, draft persistence across reopen/owner change/conflict.

| Source | Verdict | Cases to carry (reviewer note) |
|---|---|---|
| `scripts/test-workflow-metadata-ui-flow.ts` | REWRITE | edit details |
| `test/browser/dev-workflow-authoring.spec.ts` | MERGE | `journeys/workflows.spec.ts`: create typed workflow w/ review-Save; draft restored; Describe with pending save (saved, left) |
| `test/workflow-draft-reopen.test.mjs` | carry from DELETE | 3 cases → `journeys/workflows.spec.ts` |

#### `test/browser/journeys/digests.spec.ts` — T13

Cases: journey D, schedules, "Run now" never auto-submits without review, live source picker, sources renewal.

| Source | Verdict | Cases to carry (reviewer note) |
|---|---|---|
| `scripts/test-hosted-live-source-picker.ts` | REWRITE | source picker through UI |
| `test/browser/digest-native-sources.production.spec.ts` | MERGE (shared by H7, T13; TZ deletes) | `journeys/digests.production.spec.ts` (all 3 tests) |
| `test/browser/digest-resident-schedule.production.spec.ts` | MERGE (shared by H7, T13; TZ deletes) | `journeys/digests.production.spec.ts` (both tests) |
| `test/browser/digest-source-renewal.spec.ts` | MERGE (shared by H7, T13; TZ deletes) | 3 assertions to `journeys/digests.production.spec.ts` |
| `test/browser/digest-summary.spec.ts` | MERGE (shared by H7, T13; TZ deletes) | 1 case (native result privacy) to `journeys/digests.production.spec.ts` |
| `test/browser/resident-background-results.spec.ts` | MERGE (shared by H7, T13, T14; TZ deletes) | `journeys/digests.spec.ts`; mock entry → `journeys/dev-surface.spec.ts` |

#### `test/browser/journeys/accessibility.spec.ts` — T14

Cases: one sweep: state catalogue x theme x text scale x landscape, both builds via tags; confidentiality innerText check; map-label contrast pair in the harness table.

| Source | Verdict | Cases to carry (reviewer note) |
|---|---|---|
| `test/browser/accessibility-lifecycle.spec.ts` | MERGE | `journeys/accessibility.spec.ts` (`lifecycle`) |
| `test/browser/accessibility-resilience.spec.ts` | MERGE | `journeys/accessibility`, `home-shell`, `camera-photos`, `maps`, `settings`, `notes`, `browser` |
| `test/browser/accessibility-sweep.production.spec.ts` | MERGE | `journeys/accessibility.spec.ts` run by the production project |
| `test/browser/accessibility-sweep.spec.ts` | KEEP | `journeys/accessibility.spec.ts` (`sweep`) |
| `test/browser/calendar-accessibility.spec.ts` | MERGE | `journeys/accessibility.spec.ts` |
| `test/browser/camera-overlay-contrast.spec.ts` | MERGE | `journeys/accessibility.spec.ts` contrast sweep |
| `test/browser/canonical-icons.spec.ts` | REWRITE (shared by T12, T14, T9; TZ deletes) | `journeys/home-shell.spec.ts`, `journeys/accessibility.spec.ts`, `journeys/camera-photos.spec.ts` |
| `test/browser/compact-viewport.spec.ts` | MERGE | `journeys/accessibility.spec.ts` (3 steps; delete digest-event test) |
| `test/browser/confidentiality-claims.spec.ts` | REWRITE | rule in `scripts/audit-production-bundle.ts` + mock check in the a11y sweep loop |
| `test/browser/design.spec.ts` | MERGE | a11y sweep mock-state loop |
| `test/browser/home-compact-scroll.spec.ts` | MERGE | `journeys/accessibility.spec.ts` |
| `test/browser/large-text-overlap.spec.ts` | MERGE | `journeys/accessibility.spec.ts` |
| `test/browser/native-insets.spec.ts` | MERGE | `journeys/accessibility.spec.ts` (insets) |
| `test/browser/notifications-handle.spec.ts` | MERGE (shared by T12, T14; TZ deletes) | `journeys/home-shell.spec.ts` (4 cases); 200 % case → `journeys/accessibility.spec.ts` |
| `test/browser/operation-review-accessibility.spec.ts` | REWRITE (shared by T14, T15; TZ deletes) | `journeys/accessibility.spec.ts` + `journeys/settings.spec.ts` (1 case each) |
| `test/browser/photo-overlay-contrast.spec.ts` | MERGE | `journeys/accessibility.spec.ts` (1 case) |
| `test/browser/remaining-dialog-layout.spec.ts` | MERGE | `journeys/accessibility.spec.ts` |
| `test/browser/remaining-subview-accessibility.spec.ts` | MERGE | `journeys/accessibility.spec.ts` |
| `test/browser/responsive-surfaces.production.spec.ts` | MERGE (shared by T14, T8; TZ deletes) | `journeys/accessibility` (production) layout section; Notes cases → `journeys/notes` |
| `test/browser/responsive-surfaces.spec.ts` | MERGE | `journeys/accessibility` layout section |
| `test/browser/review-visual-viewport.spec.ts` | REWRITE | `journeys/accessibility` keyboard step |
| `test/browser/subview-accessibility.spec.ts` | MERGE | `journeys/accessibility.spec.ts` |
| `test/browser/view-focus.spec.ts` | REWRITE | `journeys/accessibility.spec.ts` |
| `test/browser/workflow-dialog-layout.spec.ts` | MERGE | `journeys/accessibility.spec.ts` / sweep states |
| `test/cloud-membership-presentation.test.mjs` | MERGE (shared by T14, T5; TZ deletes) | account-sheet + accessibility journeys |

#### `test/browser/journeys/production-gating.spec.ts` — T14

Cases: flag-off build: no ?mode=dev, staging, local agent bridge, regional Maps, fixture Settings controls; CSP; no dev surfaces.

| Source | Verdict | Cases to carry (reviewer note) |
|---|---|---|
| `test/browser/connection-boundaries.production.spec.ts` | MERGE (shared by T14, T5; TZ deletes) | `journeys/connection-cloud.spec.ts` (~11) + `journeys/production-gating.spec.ts` (1) |
| `test/browser/home-attention.production.spec.ts` | MERGE | `journeys/production-gating.spec.ts` (fresh Home) |
| `test/browser/home-daily-overview.production.spec.ts` | MERGE | `journeys/production-gating.spec.ts` |
| `test/browser/production-surface.spec.ts` | MERGE (shared by T14, T5; TZ deletes) | `journeys/production-gating.spec.ts` (prod); P-43 matrix → `journeys/connection-cloud.spec.ts` (prod) |
| `test/browser/settings.production.spec.ts` | MERGE (shared by T14, T15; TZ deletes) | `journeys/settings` (production); gating → `journeys/production-gating` |
| `test/dev-surface-gates.test.mjs` | REWRITE | `journeys/production-gating.spec.ts` (production project) |

#### `test/browser/journeys/dev-surface.spec.ts` — T14

Cases: dev build smoke: mock mode, fixture images, device controls, no sign-in gate in dev, one dev-simulator smoke (D19).

| Source | Verdict | Cases to carry (reviewer note) |
|---|---|---|
| `test/browser/dev-connection-setup.spec.ts` | MERGE | `journeys/dev-surface.spec.ts`: local profile chat + restore history |
| `test/browser/dev-controls-accessibility.spec.ts` | MERGE | `journeys/dev-surface.spec.ts`: one viewport; profile switch; absent in mock mode |
| `test/browser/dev-parity.spec.ts` | carry from DELETE (shared by T14, T7; TZ deletes) | carry device-controls round trip → `journeys/dev-surface.spec.ts`; calendar edit-during-review conflict → `journeys/calendar.spec.ts` only if no calendar-agent spec keep… |
| `test/browser/dev-surface-copy.spec.ts` | MERGE | `journeys/dev-surface.spec.ts` (drop Wallet) |
| `test/browser/fixture-images.spec.ts` | MERGE | `journeys/dev-surface.spec.ts` |
| `test/browser/mock-background-admission.spec.ts` | MERGE | `journeys/dev-surface.spec.ts` |
| `test/browser/mvp.spec.ts` | SPLIT (shared by T12, T14, T15; TZ deletes) | `home-shell`, `dev-surface`, `settings`; legacy cases deleted |
| `test/browser/native-mock-chrome.spec.ts` | MERGE | `journeys/dev-surface.spec.ts` |
| `test/browser/resident-background-results.spec.ts` | MERGE (shared by H7, T13, T14; TZ deletes) | `journeys/digests.spec.ts`; mock entry → `journeys/dev-surface.spec.ts` |
| `test/browser/settings-page-accessibility.spec.ts` | MERGE (shared by T14, T15; TZ deletes) | `journeys/settings` keyboard step; dev rows → `journeys/dev-surface` |
| `test/browser/signed-out-page.spec.ts` | MERGE | `journeys/dev-surface` |
| `test/browser/simulator-recovery.spec.ts` | MERGE | `journeys/dev-simulator.spec.ts` |
| `test/browser/simulator-save.spec.ts` | MERGE | `journeys/dev-simulator.spec.ts` |

### 2.5 Live specs (`test/browser/live/`, project `live`, manual)

#### `test/browser/live/voice.local.spec.ts` — T4

Cases: direct voice live; drop the Component patch and receipt.

| Source | Verdict | Cases to carry (reviewer note) |
|---|---|---|
| `test/browser/direct-voice-live.local.spec.ts` | KEEP | rename `journeys/voice.local.spec.ts`; drop Component patch and receipt |

#### `test/browser/live/cloud-voice.local.spec.ts` — T4

Cases: Cloud TTS latency and Cloud voice live in one file.

| Source | Verdict | Cases to carry (reviewer note) |
|---|---|---|
| `test/browser/cloud-tts-latency.local.spec.ts` | MERGE | `live/cloud-voice.local.spec.ts` |
| `test/browser/cloud-voice-live.local.spec.ts` | MERGE | `live/cloud-voice.local.spec.ts` |

#### `test/browser/live/agent-playback.local.spec.ts` — T4

Cases: browser agent playback.

| Source | Verdict | Cases to carry (reviewer note) |
|---|---|---|
| `test/browser/browser-agent-playback.local.spec.ts` | KEEP | live lane |

### 2.6 Hand-offs (not targets of this plan)

**Formal plan (`specs/quint/**`)** (57): the behaviour stays covered by a Quint driver (registered, ported or moved by the formal plan); the `test/` file itself is deleted as §1 says, after that formal change lands.

`test/accessibility-timeout.test.mjs`, `test/agent-calendar-mutation.test.mjs`, `test/browser-deletion-recovery.test.mjs`, `test/browser/dock-clearance.spec.ts`, `test/browser/helpers/page-modules.ts`, `test/calendar-mounted-draft-handoff.test.mjs`, `test/calendar-mounted-edit-admission.test.mjs`, `test/calendar-mounted-editor.test.mjs`, `test/camera-rapid-leave.test.mjs`, `test/canonical-calendar-draft-ownership.test.mjs`, `test/chat-attachment-composer.test.mjs`, `test/committed-view-observation.test.mjs`, `test/files-index.test.mjs`, `test/first-send-draft-migration.test.mjs`, `test/fixtures/NativeReadEpochTest.java`, `test/fixtures/ResidentCredentialShutdownRetryTest.java`, `test/fixtures/ResidentScheduleRearmTest.java`, `test/fixtures/ScopedCalendarSnapshotTest.java`, `test/fixtures/SqliteCalendarProvider.java`, `test/fixtures/UpdateFlowTest.java`, `test/fixtures/android-browser-module-stage.mjs`, `test/fixtures/browser-external-handoff.mjs`, `test/fixtures/canonical-calendar-draft-owner.mjs`, `test/fixtures/committed-view-observation.mjs`, `test/fixtures/core-state-root.mjs`, `test/fixtures/first-send-draft-migration.mjs`, `test/fixtures/google-account-panel.mjs`, `test/fixtures/google-browser-auth/ai/eliza/auth/cloud/CloudSignInChainTest.java.txt`, `test/fixtures/google-browser-auth/chain-methods.mjs`, `test/fixtures/native-google-host-builder-port.mjs`, `test/fixtures/quint/ChatInputCurrentComparison.qnt`, `test/fixtures/quint/FilesBrowserComparison.qnt`, `test/fixtures/quint/HomeLayoutComparison.qnt`, `test/fixtures/quint/MapsComparison.qnt`, `test/fixtures/quint/NotesViewComparison.qnt`, `test/fixtures/quint/PhotosLibraryComparison.qnt`, `test/fixtures/quint/SettingsNavComparison.qnt`, `test/fixtures/settings-model-traces.mjs`, `test/hosted-digest-mutation-ownership.test.mjs`, `test/hosted-digest-refresh-ownership.test.mjs`, `test/hosted-notice-question.test.mjs`, `test/live-capture-resource.test.mjs`, `test/local-agent-provider-admission.test.mjs`, `test/native-deletion-review-fence.test.mjs`, `test/pending-action-background-recovery.test.mjs`, `test/reminder-open-intent.test.mjs`, `test/reset-wiring.test.mjs`, `test/resident-credential-shutdown-retry.test.mjs`, `test/resident-recovery-review.test.mjs`, `test/resident-result-transport.test.mjs`, `test/scoped-calendar-snapshot.test.mjs`, `test/service-read-cache.test.mjs`, `test/shade-row-custody.test.mjs`, `test/source-renewal-question.test.mjs`, `test/task-service-sql-concurrency.test.mjs`, `test/task-service-stop.test.mjs`, `test/workflow-trigger-detection.test.mjs`

**Upstream follow-up (D14)** (47): behaviour of pinned upstream code; deleted here, listed in the PR.

`test/browser-construction.test.mjs`, `test/browser-site-permissions.test.mjs`, `test/browser/live-voice.spec.ts`, `test/browser/login-field-reporter.spec.ts`, `test/browser/upstream-client-features.spec.ts`, `test/calendar-agent-write-host.test.mjs`, `test/calendar-read-timing.test.mjs`, `test/camera-resume.test.mjs`, `test/cloud-email-resend.test.mjs`, `test/deletion-window.test.mjs`, `test/files-agent-patch.test.mjs`, `test/files-browser-atomic-placement.test.mjs`, `test/fixtures/ClockContractTest.java`, `test/fixtures/CloudSpeechTimingsTest.java`, `test/fixtures/CloudSpeechWireTest.java`, `test/fixtures/FirstWriteSpeechOutputTest.java`, `test/fixtures/ResidentAttachmentTest.java`, `test/fixtures/SmsSendJournalTest.java`, `test/fixtures/SpeechLeadTrimTest.java`, `test/fixtures/StorageBrowserTest.java`, `test/fixtures/StorageWatchSlotTest.java`, `test/fixtures/google-browser-auth/ai/eliza/auth/cloud/CloudSignInBrowserTest.java.txt`, `test/fixtures/google-browser-auth/ai/eliza/auth/cloud/CloudSignInFlowTest.java`, `test/fixtures/google-browser-auth/ai/eliza/auth/cloud/CloudSignInReadinessTest.java.txt`, `test/fixtures/google-browser-auth/native-sign-in.test.mjs`, `test/fixtures/lifeops-scheduled-task-route.mjs`, `test/fixtures/resident-java-source-stage.mjs`, `test/google-browser-auth.test.mjs`, `test/native-cloud-control-jvm.test.mjs`, `test/native-cloud-permission-handoff.test.mjs`, `test/notice-owner-coordinator.test.mjs`, `test/own-provider/CredentialRequestFenceTest.java`, `test/own-provider/OwnProviderTest.java`, `test/own-provider/OwnSpeechTest.java`, `test/photos-library-patch.test.mjs`, `test/photos-view.test.mjs`, `test/resident-build-output.test.mjs`, `test/saved-note-speech-policy.test.mjs`, `test/scan-document-draft-ownership.test.mjs`, `test/secure-store-memory.test.mjs`, `test/voice-assistant.test.mjs`, `test/voice-capture-lifecycle.test.mjs`, `test/voice-capture-retirement.test.mjs`, `test/voice-context-loss.test.mjs`, `test/workflow-approval-poster.test.mjs`, `test/workflow-scope.test.mjs`, `test/workflow-source-publication.test.mjs`

**Harness (T1)** (42): helper folded into `test/browser/harness/**` (§4.2); deleted by TZ.

`test/browser/accessibility-audit.ts`, `test/browser/accessibility-states.ts`, `test/browser/app-navigation.ts`, `test/browser/calendar-draft-readiness.ts`, `test/browser/calendar-fixture.ts`, `test/browser/cloud-notes-voice-fixture.ts`, `test/browser/cloud-voice-fixture.ts`, `test/browser/content-review-layout.spec.ts`, `test/browser/device-apps-stub.ts`, `test/browser/flag-off-android.ts`, `test/browser/generic-cloud-speech-fixture.ts`, `test/browser/helpers/browser-calendar.ts`, `test/browser/helpers/calendar-review.ts`, `test/browser/helpers/canonical-calendar.ts`, `test/browser/helpers/canonical-notes.ts`, `test/browser/helpers/cloud-connection-notices.ts`, `test/browser/helpers/cloud-plan-settings.ts`, `test/browser/helpers/connection-diagnostics.ts`, `test/browser/helpers/delivery-fixture.ts`, `test/browser/helpers/home-calendar.ts`, `test/browser/helpers/mail-actions.ts`, `test/browser/helpers/native-cloud-plan-fixture.ts`, `test/browser/helpers/native-cloud-signin.ts`, `test/browser/helpers/native-navigation-protocol.ts`, `test/browser/helpers/native-notes.ts`, `test/browser/helpers/ocr-stub.ts`, `test/browser/helpers/one-calendar.ts`, `test/browser/helpers/owned-photo.ts`, `test/browser/helpers/photos-bridge.ts`, `test/browser/helpers/resident-agent-plugin.ts`, `test/browser/helpers/settled.ts`, `test/browser/hosted-harness.ts`, `test/browser/inbox-draft-navigation.ts`, `test/browser/map-label-contrast.spec.ts`, `test/browser/native-speech-fixture.ts`, `test/browser/resident-stub.ts`, `test/browser/scan-review-navigation.ts`, `test/browser/telephony-fixture.ts`, `test/browser/voice-assistant-fixture.ts`, `test/browser/voice-fixture.ts`, `test/browser/warm-dev-server.ts`, `test/browser/workflow-navigation.ts`

### 2.7 Every surviving fixture and support file, and where it goes

| Path | Fate | Unit |
|---|---|---|
| `test/fixtures/{CalendarAvailabilityReaderTest,CalendarSyncConsentTest,CalendarSyncMutationTest,CalendarSyncReceiptRecoveryTest,CalendarSyncSnapshotTest}.java` | merged into `test/integration/jvm/{CalendarReadTest,CalendarSyncTest}.java` | H8 |
| `test/fixtures/{CloudSpeechPolicyTest,CloudVoiceLimitTest,NativeVoiceBindingTest}.java`, `test/fixtures/KeyboardDictationPolicyTest.java` | merged into `test/integration/jvm/VoiceJvmTest.java` | H8 |
| `test/fixtures/ConnectionRoutesTest.java` | `test/integration/jvm/ConnectionRoutesTest.java` | H8 |
| `test/fixtures/GmailBackgroundLockContentionTest.java` | merged into `test/integration/jvm/CredentialsTest.java` | H8 |
| `test/fixtures/GoogleAgentAccessFileTest.java` | merged into `test/integration/jvm/GoogleWorkspaceReturnTest.java` | H8 |
| `test/fixtures/{HostedNoticeWithdrawTest,HostedResultNoticesTest,NativeNotificationSessionTest}.java` | merged into `test/integration/jvm/NoticesTest.java` | H8 |
| `test/fixtures/{NoteRecorderJournalTest,NotesDeletionLeaseTest}.java` | merged into `test/integration/jvm/NotesJvmTest.java` | H8 |
| `test/fixtures/{PluginWorkersTest,RendererRecoveryBudgetTest}.java` | merged into `test/integration/jvm/RuntimeJvmTest.java` | H8 |
| `test/fixtures/{ResidentDeliveryTest,ResidentResultTransportTest}.java` (+ `NativeDigestSourcesTest.java`) | merged into `test/integration/jvm/ResidentResultDeliveryTest.java` | H8 |
| `test/fixtures/{SmsActionJournalResultTest,SmsSendJournalTest}.java` | merged into `test/integration/jvm/SmsJournalTest.java` | H8 |
| `test/fixtures/StorageBrowserTest.java` | `test/integration/jvm/StorageBrowserTest.java` | H8 |
| `test/fixtures/SqliteCalendarProvider.java`, `test/fixtures/scoped-calendar-jvm/**`, `test/fixtures/calendar-provider-jvm/**`, `test/fixtures/android-stubs/**`, `test/fixtures/note-recorder-jvm/**`, `test/fixtures/secure-store-memory/android/util/AtomicFile.java` | one stub tree `test/integration/jvm/stubs/` (formal plan repoints the two calendar drivers in the same change) | H8 |
| `test/fixtures/secure-store-memory/MemoryTest.java` | deleted with `test/secure-store-memory.test.mjs` (TP3; upstream follow-up) | TZ |
| `test/fixtures/calendar-sync-snapshot-jvm.mjs` | folded into `android-jvm.test.ts` via `test/support/jvm.mjs` (`runJvm`), then deleted | H8 |
| `test/fixtures/ScopedCalendarSnapshotTest.java`, `test/fixtures/UpdateFlowTest.java`, `test/fixtures/app-update-jvm/**`, `test/fixtures/reviewed-copies-jvm/**`, `test/fixtures/google-browser-auth/{chain-methods.mjs,ai/eliza/auth/cloud/CloudSignInChainTest.java.txt,ai/eliza/auth/cloud/CloudSignInBrowserTest.java.txt}` | used by Quint native harnesses: formal plan moves them into `specs/quint/refinement/native/fixtures/` (the `CloudSignIn*` texts go upstream later, D14) | formal |
| `test/fixtures/{android-browser-module-stage,core-state-root,lifeops-scheduled-task-route,native-google-host-builder-port,prepared-worker-producer,resident-java-source-stage,scheduled-task-controls,settings-model-traces,workflow-worker-assets}.mjs`, `test/fixtures/hosted-digest-refresh.jsx` | Quint support: formal plan moves them into `specs/quint/refinement/**/fixtures/` | formal |
| `test/fixtures/{browser-external-handoff,calendar-draft-handoff,calendar-mounted-editor,camera-calendar-review,modal-scrim-chromium,notes-recorder-media,observed-sms-adapter,product-character-host,reminder-open-intent,retained-reminder-tap,shade-notice-question,shade-row-custody,use-in-email-review,workflow-clock-admission}.mjs` | PORT/REWRITE fixtures of Quint drivers: formal plan ports the driver to import the real module, then the fixture is deleted (TZ) or moved beside the driver; the journey cases they also fed are in §2.4 | formal, TZ |
| `test/fixtures/android-gzip-assets.mjs`, `test/fixtures/pilot-update.mjs`, `test/fixtures/prepare-local-agent.mjs` | shared with Quint drivers: formal plan moves them to `specs/quint/refinement/services/fixtures/`; `test/tooling/{android-build,owner-tools,local-agent-launcher}.test.ts` import the new path | formal |
| `test/fixtures/app-update-candidate.mjs`, `test/fixtures/mobile-uuid-build.mjs` | `test/support/release-fixture.mjs` (Quint importers repointed by the formal plan) | H9 |
| `test/fixtures/browser-daily-stores.mjs`, `test/fixtures/browser-reminder-clock.mjs` | `test/integration/support/browser-daily.mjs` | H4 |
| `test/fixtures/browser-source.mjs` | `test/support/load-module.mjs` | H10 |
| `test/fixtures/ts-source.mjs` | deleted; importers use `test/support/strip-types.mjs` (byte-identical twin) | TZ |
| `test/fixtures/camera-preview-port.mjs` | `harness/plugins/camera.ts` `fakeCamera` | T1 |
| `test/fixtures/cloud-plugin-selection.mjs` | `test/tooling/android-build.test.ts` (runs in `android.yml`, which sets the env) | H11 |
| `test/fixtures/cloud-voice-view.mjs` | replaced by real imports in `test/integration/voice.test.ts`, then deleted | TZ |
| `test/fixtures/device-action-policy.mjs` | `test/integration/support/device-action-journal.ts` | H6 |
| `test/fixtures/git-fixture.mjs` | `test/support/git.mjs` | H10 |
| `test/fixtures/isolated-native-campaign.mjs` | `test/tooling/android-instrumentation.test.ts` (its 7 importers merge there) | H11 |
| `test/fixtures/jvm-tools.mjs`, `test/fixtures/kotlin-tools.mjs` | `test/support/jvm.mjs`; `--prepare` to `scripts/ci/prepare-host-kotlin.ts` (scripts/CI plan) | H8 |
| `test/fixtures/native-source.mjs` | `test/support/upstream-source.mjs` | H10 |
| `test/fixtures/photo-library-adapter.mjs` | body moves into `test/integration/photos-library.test.ts` (Quint importers repointed by the formal plan) | H6 |
| `test/fixtures/voice-host-product.mjs` | `test/tooling/voice-host.test.ts` support | H11 |
| `test/fixtures/wait-for.mjs` | `test/support/wait-for.mjs` (without `deferred`) | H10 |
| `test/fixtures/agent-identity-canonical.test.ts` | `test/tooling/local-agent-launcher.test.ts` (it never runs in CI today) | H10 |
| `test/support/managed-google-agent.mjs` | `test/integration/support/managed-google-agent.mjs` | H5 |
| `test/support/strip-types.mjs` | stays until the formal plan's ports remove its 36 `specs/` importers; then TZ deletes it | TZ |


## 3. Coverage at risk

Rule: a source file whose behaviour is listed here may be deleted only in the same change that adds the replacement
case. The unit that owns the replacement target owns the deletion. "Today" means the worktree snapshot above.

### 3.1 Behaviours with no other coverage, and the replacement to write

| # | Behaviour that loses all coverage | Covered today only by | Replacement (file: case to write) | Unit |
|---|---|---|---|---|
| 1 | Direct agent action policy: which proposals run without review; dedup of chat results ("Opened example.com." once per open, live and restored) | `action-message-presentation`, `agent-action-preferences` | `test/integration/device-actions.test.ts`: policy matrix + receipt refusal matrix; `journeys/chat.spec.ts`: one answer per browser open, live and restored | H6, T3 |
| 2 | Agent Calendar saved-feed restore and 401/403 invalidation | `agent-calendar-refresh-state` 126-248 (already broken by the A1 constructor change) | `test/integration/calendar-agent.test.ts`: ~8 cases on the real `AgentCalendar` import | H4 |
| 3 | "Agent unavailable" opens Settings > Agent connection | `agent-status-route` | `journeys/agent-connection.spec.ts` @production: tap the status, Settings > Agent connection is shown | T5 |
| 4 | P-43 honest replies: signed-out "Sign in for AI", one Manage card on a plan refusal, no Stop control | `agent-always-local`, part of `native-cloud-subscription.spec.ts` | `journeys/agent-connection.spec.ts` @production: three cases on the Cloud fake | T5 |
| 5 | Composer draft safety: refused send puts text back without a notice line; restart during send offers review, not a draft; account switch never shows the other owner's draft | `assistant-draft-dispatch` | `journeys/chat.spec.ts`: three cases (agent fake refuses send; reload mid-send; account replacement) | T3 |
| 6 | Reply settlement: one user row and one reply row when saved delivery races the transport; late reply after a conversation switch dropped | nothing (`assistant-settlement-delivery` already deleted) | `journeys/chat.spec.ts`: agent fake delivers the reply twice (saved + live); switch conversation before a held reply | T3 |
| 7 | Workflows unknown-outcome lock survives reload until "Allow another"; 429 versus unknown | `automations-unified` (adapter half) | `journeys/workflows.spec.ts`: held mutation, reload, lock shown, confirm unlocks | T13 |
| 8 | Voice ack Stop: mic closed until ack cleanup settles; failed cleanup blocks restart | `batch-ack-shell-retirement` | `journeys/voice.spec.ts`: voice fake holds cleanup, Talk stays disabled; failed cleanup shows "Voice unconfirmed · restart app" | T4 |
| 9 | Browser bookmark startup failure: quiet outside Browser, reported inside | `browser-bookmark-startup`, `scripts/test-browser-bookmark-recovery.ts` | `journeys/browser.spec.ts`: bridge bookmark read fails; Home shows nothing; Browser shows the notice | T10 |
| 10 | Photos video copy and permanent delete keep bytes and row together; abandoned edit receipts swept | `browser-camera-storage` | `journeys/photos.spec.ts`: 4 cases (copy, delete, reload during edit, sweep) | T9 |
| 11 | Agent-opened page: receipt before presentation, "Not synced yet" on receipt failure, presentation waits for the carrying chat request | browser host tests (two live regressions) | `journeys/browser.spec.ts` @production: agent fake opens a page with a held receipt; failed receipt | T10 |
| 12 | Notification Clear all: lock between check and write dismisses nothing; per-row outcomes in a mixed batch | `browser-notification-clear` | `journeys/notifications.spec.ts`: bridge `AlphaNotifications.clear` returns a mixed batch | T11 |
| 13 | Startup permissions (web build): denied never re-prompts; late notification rejection after deadline | `browser-startup-permissions` | `journeys/startup-permissions.spec.ts`: two cases with `page.clock` | T12 |
| 14 | The accessibility audit rules can fire (otherwise the sweep passes vacuously) | `accessibility-audit.spec.ts` | `journeys/accessibility.spec.ts`: one `test('each rule reports its fixture')` over `harness/a11y.ts` fixtures, 1 page, no per-rule spec | T14 |
| 15 | Agent context, inbox draft, maps context, bookmark recovery rendered-adapter flows | `scripts/test-agent-context-browser.ts`, `test-inbox-drafts-browser.ts`, `test-maps-context-browser.ts`, `test-browser-bookmark-recovery.ts` (via `adapters.spec.ts`) | `journeys/chat-context.spec.ts`, `journeys/inbox-compose.spec.ts`, `journeys/maps.spec.ts` (wire-context privacy), `journeys/browser.spec.ts` | T3, T6, T11, T10 |
| 16 | Delegation return page `apps/app/public/delegation-return.html` | `scripts/test-cloud-delegation-return.ts` | `journeys/agent-connection.spec.ts`: open the page with each return state (only while C4 keeps the page; delete with it otherwise) | T5 |
| 17 | Modal-dialog toast: toast above dialog, Undo inside dialog, cleared on close; render failure under a modal | resilience tests on the legacy Older-notes source | `journeys/home-shell.spec.ts`: same three steps on the Calendar review dialog | T12 |
| 18 | Idempotent voice-note save after a lost reply (one note per clip); recording summary save and "Source changed" refusal | `canonical-notes.spec.ts:61-89,480-550`, `canonical-recording-audio-save` | `journeys/notes-capture.spec.ts`: agent fake `failAfterApplied` on create; summary card reply then edited source | T8 |
| 19 | Chat continuity (first-message Restore, assistant surface shares draft through Close, create failure/hang/429 keeps text, confirmed cancel not repeated, history paging to first message) | `chat-continuity.spec.ts` (remote kind, D5) | `journeys/chat.spec.ts`: same 6 steps on `harness/plugins/agent.ts` with `createConversation` failure options | T3 |
| 20 | `interruptSpeech` reopens exactly one capture | `chat-dictation-api.spec.ts:94-122` | `journeys/voice.spec.ts`: capture count read from the bridge call recorder | T4 |
| 21 | Calendar alert tap opens the exact event | `dev-calendar-alerts` test 1 | `journeys/notifications.spec.ts` @production: bridge-seeded calendar notice, tap, event shown | T11 |
| 22 | Android conversation-selection path (`runtime/conversation-selection.ts`, plain `localStorage`): saved conversation gone → fallback; retirement during creation sends nothing | nothing (deleted spec ran the web path) | `journeys/chat.spec.ts` @production: two cases | T3 |
| 23 | Revocation response shapes `refused-in-body`, `no-content`, `server-error`, `unsupported` all mean "Signed out here only" | `connection-boundaries` (9 kept to 5) | `test/integration/connection-cloud.test.ts`: table of the 9 shapes against the real revocation parser | H2 |
| 24 | Composer "session lapsed before dispatch" | `composer-dispatch` case 2 | `journeys/chat.spec.ts` @production: agent fake expires the session between draft and send | T3 |
| 25 | Development action executor: journal write failure never dispatches; failed terminal write not repeated; lost reminder-creation response recovered once | dev executor specs | `test/integration/device-actions.test.ts`: the same three on the real `DeviceActions` with `scripts/fixtures/device-action-journal.ts` (moved to `test/integration/support/`) | H6 |
| 26 | Files: two concurrent renames one winner; no partial folder after duplicate-path import; attachment sha256 mismatch refused; excerpt capped at 12,000 chars; zip path traversal (`../`, absolute, drive, backslash, `//`) | `files-bulk.spec.ts:46-54`, files specs | `journeys/storage-contract.spec.ts` @storage: rename race + traversal table; `journeys/files.spec.ts`: duplicate import, sha mismatch | T10 |
| 27 | AlphaClient: sensitive view aborts background workflow generation; a busy chat abort never cancels another consumer | `dev-workflow-background-agent.spec.ts:13`, `dev-workflow-agent.spec.ts:12` (deleted in stage A) | `test/integration/alpha-client.test.ts`: two cases with a fake transport | H2 |
| 28 | Workflow-notice failure paths: failed persistence posts nothing; cancel while waiting for the store lock prevents publication | dev executor spec | `journeys/workflows.spec.ts`: bridge `AlphaNotifications.post` fails; held lock then cancel | T13 |
| 29 | Calendar agent review: edit during review → conflict; receipt survives reload | `dev-parity.spec.ts:104-111` | `journeys/calendar-agent.spec.ts`: two steps | T7 |
| 30 | Real `browser/documents.ts` store across tabs and under quota failure | `domain-atomicity.spec.ts` | `journeys/storage-contract.spec.ts` @storage: 2 cases (two pages, quota fault) | T10 |
| 31 | Inbox read cache: expired cache not restored, owner change during held restore, body/folder bytes preserved | `home-inbox.spec.ts:58-103,187-200` | `journeys/inbox.spec.ts`: three steps (clock past expiry; account switch with held read; reload) | T6 |
| 32 | Retained brief withdrawn on disconnect | `home-daily-overview.spec.ts:406-427` | `journeys/home-overview.spec.ts`: disconnect, brief card gone | T12 |
| 33 | Product palette on body-appended dialogs | `home-launcher.spec.ts:92-111` | `journeys/notes.spec.ts`: one colour assertion on the review dialog | T8 |
| 34 | J05 reviewed page answer saves one note with its web source; B/J02 recording saves audio only and transcription is explicit | `journey-core-loops.production` via `helpers/legacy-notes.ts` | `journeys/browser-reading.spec.ts` @production (J05) and `journeys/notes-capture.spec.ts` @production (J02) on canonical Notes; agent fake answers `/api/notes/state` (today it returns 503) | T10, T8 |
| 35 | Share note → Email with draft preservation (9 cases); summary → note on the production bundle | `gmail-mvp-scope`, `document-summary-note.production`, `native-speech.production` | `journeys/inbox-compose.spec.ts` (share note, 9 steps) and `journeys/notes-capture.spec.ts` @production (summary note), on canonical Notes in the same change that deletes the legacy engine | T6, T8 |
| 36 | Login-field reporter rules (trusted focus, own frame and origin, no cleartext, fill registered fields, submit on real submit, unload notice) | `login-field-reporter.spec.ts` (Java text-block extraction) | none in this repo: upstream follow-up `plugin-native-browser-surface` (D14). Listed in the PR. | – |
| 37 | Native stream edge kinds `invalid-native`, `malformed-complete`, `failed-ready`, `tool-only`, `correction`, `view-change` | `local-agent-native-stream` | `test/integration/local-agent.test.ts`: table of the 6 kinds against `streamNativeAgent` on the resident bridge fixture | H2 |
| 38 | Legacy Notes byte-exact text import (CRLF/BOM/empty), invalid-file refusal, selected-note download | `mvp.spec.ts` | `journeys/notes.spec.ts`: three steps on canonical Notes **only if** canonical Notes keeps import/download (owner question 1 in test-17); otherwise they go with D3 | T8 |
| 39 | Unsigned recorder refuses the microphone | `mvp.spec.ts:133` (legacy Notes) | `journeys/notes-capture.spec.ts`: canonical record button signed out | T8 |
| 40 | Map label contrast | `map-label-contrast.spec.ts` | token pair added to the contrast table in `harness/a11y.ts`; checked by the sweep | T14 |
| 41 | Voice-note deletion with a lost audio or Notes reply | `note-audio-delete-recovery` | `journeys/notes-capture.spec.ts`: bridge `AlphaNoteAudio.delete` reply lost, reload, one deletion | T8 |
| 42 | Editing or leaving a note stops read-aloud; offline on-device read-aloud on the production bundle | `note-read-aloud`, `native-speech.production` | `journeys/notes.spec.ts` (edit stops speech) and @production (offline read-aloud) | T8 |
| 43 | Notes→Calendar link fails closed for a deleted note; double activation makes one draft | `note-calendar-handoff` 1-4 | `journeys/notes.spec.ts` **only if** the owner keeps the hand-off (controls were removed; test-13/15 owner question). Otherwise deleted with `helpers/note-schedule-contract.ts` | T8 |
| 44 | Cross-tab notification writes merge without loss | `notification-storage-migration` test 2 | `journeys/storage-contract.spec.ts` @storage | T10 |
| 45 | Canonical failed save in firefox/webkit | legacy `notes-save-failure` | `journeys/notes.spec.ts` failed-save step tagged @storage | T8 |
| 46 | Damaged-store recovery (exact-byte download then confirmed reset) for bookmarks, albums, password provider | three specs seeding legacy localStorage keys (break with C6) | `harness/storage.ts` `damageDocument(key)`; one step each in `journeys/browser.spec.ts`, `journeys/photos.spec.ts`, `journeys/browser-reading.spec.ts` | T1, T10, T9 |
| 47 | Photo paging order with tied dates | legacy v1 database seed | `journeys/photos.spec.ts`: bridge seeds current rows with equal dates | T9 |
| 48 | Resident reading binding change aborts speech (`createNativeReadingVoice`) | `reading-review` test 8 | `test/integration/voice.test.ts`: one case | H3 |
| 49 | Reopen a completed reminder | `reminder-lifecycle` test 2 | `journeys/reminders.spec.ts`: Reopen step | T7 |
| 50 | Cross-tab retention of reminder creations, actions, schedules | three storage specs | `journeys/reminders.spec.ts`: one two-page step tagged @storage | T7 |
| 51 | Production retained-data notice | `reset-only.production` test 2 (localStorage seed) | `journeys/settings.spec.ts` @production, seeded through IndexedDB via `harness/storage.ts` | T12 |
| 52 | Unconfirmed device-calendar delete holds a second dispatch until refresh | `calendar-delete-latch` | `journeys/calendar.spec.ts`: Calendar fake answers `removeScoped` with `unknown` | T7 |
| 53 | Midnight rollover: device rows and reminders re-read; "tomorrow" becomes "today"; timer stops with the view | `calendar-view-rules` | `journeys/calendar.spec.ts`: `page.clock` across midnight, three asserts | T7 |
| 54 | Camera session rules: no lost shutter, flip resets, failed switch restart, focus never settles, 0.556 zoom chip, agent capture queue and chat grace | `camera-preview-recovery` | `journeys/camera.spec.ts` on a gateable `harness/plugins/camera.ts` (held `capture`, failing `switch`) | T9 |
| 55 | Scan Keep retry keeps the operation id; selection-change toast policy | `camera-scan-keep` | `journeys/scan.spec.ts`: two steps | T9 |
| 56 | Calendar provider fields (all-day, other-zone, weekday repeat) and DST-gap refusal | `calendar-options.spec.ts` | `journeys/calendar.spec.ts` @production: save reads the bridge call recorder | T7 |
| 57 | Availability freshness: missing marker → "unknown" | `calendar-availability.spec.ts:216` | `journeys/calendar-agent.spec.ts` | T7 |
| 58 | Chat windowing (20 closed / 100 open / +100 on scroll); restored rows over 200,000 chars clipped not dropped | `chat-transcript-window`, `restored-history-limits` | `journeys/chat.spec.ts`: long conversation seeded through the agent fake | T3 |
| 59 | Check-in `[CHOICE]` suffix hidden only for service rows; hostile quoted/fenced input preserved | `checkin-choice-presentation` | `journeys/chat.spec.ts`: check-in step | T3 |
| 60 | Delegated authorization return across account/scope/client changes | `cloud-delegation-callback` | `journeys/agent-connection.spec.ts`: 5 cases | T5 |
| 61 | Membership-code error accessibility, "Not available" (never $0.00) balance | `cloud-membership-*` | `journeys/account-plan.spec.ts` | T5 |
| 62 | Sign-in readiness late-answer fence; controller races (late verify/email/Google after Back, no duplicate verify, failed resend keeps first code, expired code keeps address) | `cloud-sign-in-late-readiness`, `cloud-sign-in-state` | `journeys/account-sign-in.spec.ts`: 6 steps on `harness/cloud.ts` with held routes | T5 |
| 63 | Google sign-in cancel races (unconfirmed cancel keeps polling, failed cancel retryable, confirmed cancel aborts poll and closes popup; commit-vs-cancel; F01 key adoption) | `google-cancel-boundary`, `google-cancel-committed-key` | `journeys/account-sign-in.spec.ts`: 4 steps on the Cloud fake | T5 |
| 64 | Plan recheck on network return (once a minute, lift on offline→online, retirement by admissions) | `connection-presentation-state` 339-668 | `test/integration/connection-cloud.test.ts`: ~10 cases, **blocked** on the stage-F `connection-ui.tsx` split exposing the controller. Until then the source test stays (it is the only file in this plan allowed to outlive its stage) | H2 |
| 65 | Conversation restore CAS: newer manual choice wins over fallback creation | `conversation-restore-safety` 36-50 | `journeys/chat.spec.ts` | T3 |
| 66 | Cloud browser hand-off: focus without background transition never completes sign-in | `connection-browser-return` | `test/integration/connection-cloud.test.ts` on exported `openConnectionBrowser` | H2 |
| 67 | Contacts owner-data safety (version-carrying save/delete, stale editor, uncertain write needs refresh) | `contacts-adapter` (and `specs/quint/refinement/native/telephony.mjs:334` relies on it) | `journeys/telephony.spec.ts`: 3 steps; formal plan ports `telephony.mjs` first | T11 |
| 68 | Credential fences on Android (owner admission after destroy, lock order L-before-vault, shutdown reservation across dispatch failure) | three `credential-*` transplants | `test/integration/jvm/CredentialsTest.java` over the extracted class, run by `android-jvm.test.ts` | H8 |
| 69 | Deletion notice owner staleness (A→B→A) | `deletion-notice-policy` | `test/integration/calendar.test.ts`: 3 cases | H4 |
| 70 | Photo in-place rewrite refused at send time | `context-selection` 192-216 | `journeys/chat-context.spec.ts` | T3 |
| 71 | Flag-off build gating (staging, `?mode=dev`, local agent bridge, regional Maps, fixture Settings controls) | `dev-surface-gates` | `journeys/production-gating.spec.ts` @production: one step per surface | T14 |
| 72 | Voice view projection allowlist (MVP views only, exact `viewPath`, no external URL, refused on owner change or hidden document); unknown id or view makes no claim request | `agent-adapter` transplants, `voice-*` | `journeys/voice.spec.ts`: 4 steps | T4 |
| 73 | Diagnostics in-flight refresh vs "Clear problems" | settings/connection transplants | `journeys/settings.spec.ts`: one case | T12 |
| 74 | "Run now" never auto-submits without the review sheet | regex only | `journeys/digests.spec.ts` @production | T13 |
| 75 | Late native picker results after leaving Files; Files Trash expiry and late item stays in Trash | `files-picker-lifecycle`, `files-browser.test.mjs` | `journeys/files.spec.ts`: held `storageSelect`; `page.clock` 30-day expiry | T10 |
| 76 | Composer focus on native Back with unchanged viewport; voice IME handoff | `final-ui-lifecycle` | `journeys/chat.spec.ts`: two steps | T3 |
| 77 | Local-agent request deadline (timeout parsing, budget in queue/enrollment, 120 s cap) | `ResidentRequestDeadlineTest.java`, `native-resident-request-deadline` | `test/integration/jvm/ConnectionRoutesTest.java` gains the 8 deadline rows once the budget is its own class; until then `ResidentRequestDeadlineTest.java` moves unchanged into `test/integration/jvm/` | H8 |
| 78 | Update download admission bounds (size outside 1..2 GiB, digest shape, empty APK) | `UpdateDownloadTest.java` | `test/integration/jvm/AppUpdateTest.java` (the admission rows) | H8 |
| 79 | Update-manifest admission (HTTPS only, no URL credentials, signer and flavor, sha256, size, index feed bounds) | `settings-truth.test.mjs` | `test/tooling/app-update.test.ts`: table on the real `parseUpdateManifest` | H9 |
| 80 | Google Maps content policy (Google place cannot be saved or be a routing origin; provider change clears origin) | `google-maps-content` | `journeys/maps.spec.ts`: 3 cases | T11 |
| 81 | Home "verified empty" Calendar rules (partial feed, unknown source, failed reread, saved rows during refresh, negative-offset all-day) | `home-calendar-selection` | `journeys/home-overview.spec.ts`: 6-7 cases | T12 |
| 82 | Chat history restore racing an owner switch; attachment restore | `history-initial-state` | `journeys/chat.spec.ts` | T3 |
| 83 | Lock-screen camera cannot reach Maps/Notes; mode switch while recording stops recording | `home-views-model` | `journeys/camera.spec.ts` | T9 |
| 84 | Losing Contacts admission while Contacts is open returns Home | `image-contacts-admission` | `journeys/telephony.spec.ts` | T11 |
| 85 | Home: no installed-app read until drawer opens; failed launch toast once; favourites save error | `home-shell.test.mjs` | `journeys/launcher.spec.ts`: three steps on `harness/plugins/launcher.ts` call recorder | T12 |
| 86 | SMS mark-read bounded by newest shown message, only with SMS role; SIM pick/inactive; uncertain send keeps operation id | `image-sms` | `journeys/telephony.spec.ts` | T11 |
| 87 | Deferred feature registration retry rules (6 cases) | `local-agent-feature-starting` | `test/integration/local-agent.test.ts` with `mock.timers` | H2 |
| 88 | Reply speech append/settle, listener retirement; credential refusal in speech planning; Listen refuses links; Cloud→device fallback copy | `local-reply-speech`, `local-speech-text`, `local-speech-playback` | `test/integration/voice.test.ts` (first two); `journeys/voice.spec.ts` and `journeys/notes.spec.ts` (copy) | H3, T4, T8 |
| 89 | Native header authority on forwarded requests (client id kept, `Authorization` not from caller, trace id only on bound voice turns) | `native-navigation-client-header` | `test/integration/jvm/ConnectionRoutesTest.java` | H8 |
| 90 | Renderer secure slot ↔ native allow-list agreement (note-origins regression) | `native-secure-slots` | `test/integration/jvm/CredentialsTest.java` (native list) + `test/integration/inbox.test.ts` (renderer list), one shared JSON case table `test/integration/support/secure-slots.json` | H8, H5 |
| 91 | Navigation guidance while screen off; provider-restricted guidance never synthesised; account change drops owed guidance | `navigation-voice-pause` | `journeys/maps.spec.ts` | T11 |
| 92 | New blank note discarded on Back/Home, cleared note survives | `notes-empty-close` | `journeys/notes.spec.ts` | T8 |
| 93 | Recorder controls disabled while saving, Back saves, Copy text copies the whole transcript | `notes-recorder-controls` | `journeys/notes-capture.spec.ts` | T8 |
| 94 | Own provider: saved Cloud sign-in restores services without switching provider; network return signed out never calls Cloud; cancel during key validation never claims save | `own-provider-service-restore`, `own-provider-cancel-readback` | `journeys/agent-connection.spec.ts`: 4 assertions | T5 |
| 95 | Offline and signed out: zero network while speaking; phone-call interruption status | `offline-signed-out-speech` | `journeys/voice.spec.ts` @production | T4 |
| 96 | Phone voicemail (tab gating, transcript, delete confirm and once-only dispatch), MMI refusal, emergency/busy wording; Settings → Phone rows read-only while open | `phone-adapter`, `phone-info-page` | `journeys/telephony.spec.ts`; `journeys/settings.spec.ts` | T11, T12 |
| 97 | Password draft retention/expiry, hidden page reads nothing after failed lock, after-leave fences, reset confirmation | password-manager trio | `journeys/browser-reading.spec.ts` (Passwords section): ~10 steps | T10 |
| 98 | Owner-route gate parity Android vs renderer (security boundary) | `owner-route-parity` | one case table `test/integration/support/owner-routes.json` read by `connection-cloud.test.ts` and `jvm/ConnectionRoutesTest.java` | H2, H8 |
| 99 | Photo viewer keyboard zoom/pan; video refuses zoom | `photo-viewport` | `journeys/photos.spec.ts`, `journeys/video.spec.ts` | T9 |
| 100 | Recently Deleted exact-revision deletion (skip restored/changed; cancel consumes review; Empty needs all) | `recently-deleted.test.mjs` | `journeys/photos.spec.ts`: three steps | T9 |
| 101 | Resident recovery restart sequencing (fresh review then confirm; archive mismatch never starts; Try again only for `runtime-identity-unavailable`) | nothing (`recovery-restart-action.test.mjs` is already deleted in the working tree) | `test/integration/local-agent.test.ts`: 3 cases once stage F exports the recovery controller from `connection-ui.tsx`; until then an open gap listed in the PR | H2 |
| 102 | Redeemed plan end F01 (re-verify keeps the redeemed end for the same account only) | `redeemed-plan-end` | `test/integration/connection-cloud.test.ts`: 5 cases | H2 |
| 103 | Resident auto-retry 3/10/30/60 s (start-failed only); startup keeps an explicitly opened panel; pre-bind stop refusal; admission outcome mapping | `resident-*` transplants | `journeys/agent-connection.spec.ts`: 1+1+1+6 cases with `page.clock` | T5 |
| 104 | Retired send's cleanup cannot clear a newer send's typing state | `retired-shell-work` | `journeys/chat.spec.ts` | T3 |
| 105 | Saved-note windowed transcription (order, single save, no retry, stops on note change) | `saved-note-transcript` | `journeys/notes-capture.spec.ts`: 3 cases | T8 |
| 106 | Scan draft flow (Close/Keep/Discard/Resume/Delete); all-day poster → all-day event with stable identity; searchable PDF "nothing written keeps review open"; Recent eviction releases a picked document's grant | `scan-*` transplants | `journeys/scan.spec.ts` (4+1+2), `journeys/files.spec.ts` (1) | T9, T10 |
| 107 | SMS incomplete rows never mark read; SMS device-action exactly-once | `sms-incomplete-rows`, `sms-agent-flow` | `test/integration/phone-sms-contacts.test.ts` | H6 |
| 108 | Stop outcome honesty ("Outcome unknown" vs "The agent stopped this reply.") | `stopped-reply-outcome` | `journeys/chat.spec.ts`: 2 cases | T3 |
| 109 | "Sign in again" shown once after startup | `sign-in-incomplete-queue` | `journeys/account-sign-in.spec.ts`: 2 cases | T5 |
| 110 | Text-size overlap ordering (latest write wins, failed write notice) | settings text-scale trio | `journeys/settings.spec.ts` | T12 |
| 111 | Files selected-document Ask fencing (stale read, visibility retirement) | `selection-ask-readiness` | `journeys/files.spec.ts`: 3 cases; identity-change and retain-boundary races are an accepted loss (§3.2) | T10 |
| 112 | Shade fallback timeout; late telephony status after leaving Home | `system-shade-timeout`, `telephony-attention-lifecycle` | `journeys/home-shell.spec.ts` (held bridge promise + `page.clock`); `journeys/telephony.spec.ts` (held `status`) | T12, T11 |
| 113 | Voice: phone call pauses voice; `[WORKFLOW]` markup neither spoken nor shown; 429/503 quiet retry honours Retry-After (max 3) and ends calmly; on-device fallback after Cloud refusal does not resend; denied mic "Open app settings" control; unconfirmed cleanup blocks Talk/Transcribe/Back; repeated phrase shows interim text; size-limit recording saved shortened; voice-requested actions bound to the accepted final transcript | `voice-*` host tests (test-50, test-51) | `journeys/voice.spec.ts`: ~12 cases on `harness/plugins/voice.ts` + Cloud voice route fake + `page.clock` | T4 |
| 114 | View navigation: fence failure after claim settles one negative result; a positive result never followed by a second | `view-navigation-settle` | `journeys/home-shell.spec.ts` | T12 |
| 115 | Workflow draft persistence across reopen, owner change and conflict | `workflow-draft-reopen` | `journeys/workflows-authoring.spec.ts`: 3 cases | T13 |
| 116 | Notes owner switch reloads the list (`canonicalNotesKey`) | legacy Quint aliases | `journeys/notes.spec.ts` | T8 |
| 117 | Workflow run detail states (finished, pending device, outcome unknown, older version) | `workflow-execution-fixture/markup` | `journeys/workflows.spec.ts` | T13 |
| 118 | Named-embedding provenance (delayed unmarked insert refused in the publication window; vector not restamped on reload) | `quint-named-embedding-provenance` (real integration inside a Quint wrapper) | `test/integration/local-agent.test.ts`: 2 cases | H2 |
| 119 | Alpha workflow notice wiring on the required lane (step/approval notices, taps, recovery) | four `Workflow*NoticeTest.java` | `test/integration/jvm/WorkflowNoticesTest.java`: the 7 cases (TP3) | H8 |
| 120 | WebView 113 `AbortSignal.any` fallback | `abort-signal-compat` | `journeys/maps.spec.ts`: one case with `AbortSignal.any` deleted by `addInitScript` | T11 |
| 121 | Statement-order safety: MMS journaled before `sendMultimediaMessage`; resend throttle set before status check | `assert-order.mjs` callers | `test/integration/jvm/SmsJournalTest.java` (order observed through a recording fake); `test/integration/connection-cloud.test.ts` (throttle) | H8, H2 |

### 3.2 Accepted losses and upstream follow-ups (listed in the PR, no local replacement)

- Browser stand-in and dev-simulator semantics the APK never runs (P7, D19): calendar simulator alerts/guests/meeting
  rooms, clock volume/DND, `BrowserLocation` permission ownership (~16 tests), `AlphaNotifications` stand-in keys, dev
  digest scheduler (DST/window), browser photo store fences, browser video encoder fallbacks, portable photo-filter
  fallback, simulated shade empty state, dev sensors/device preferences, dev workflow simulator storage. One
  `journeys/dev-surface.spec.ts` smoke keeps the simulator booting.
- Native-only behaviour that only instrumentation or an image boot can show: WebView construction rules, native page
  withdrawal under overlays, framework overlay for power long-press, renderer lock frame before Camera, launcher portrait
  lock (`RotationInstrumentedTest`), Quick Settings tile behaviour (P-78 dormant, D7), Calendar alert timing on Android,
  notification-journal recovery on Android, OTA confirmation on a real `PackageInstaller`.
- Upstream code tested here today (D14 follow-ups, `cross-file-actions.md` §6): `plugin-files` scan algorithms
  (`scan-correction`, `scan-edges`, `scan-draft`, `scan-pdf`: the scan journey keeps their visible results; the
  module-level geometry, revision-fence and page-limit cases need upstream tests), Google browser-mode sign-in (`test/fixtures/google-browser-auth/**`),
  TelephonyPlugin/SmsTelephony ordering, Cloud speech bridge Java concurrency, `RecordingWindow`, secure-store 32 MiB
  bound, `DocumentFolderTree` retirement, `PermittedMediaCatalog` TEXT-bound args, `photos-view.ts` algorithms, Pixel
  voice fault matrices beyond the 15 carried cases, NoticeOwnerCoordinator, `workflow-source-publication`,
  `workflow-approval-poster`, calendar read-timing privacy, ClockDays, CloudSpeechTimings/Wire, FirstWriteSpeechOutput,
  StorageBrowser escape safety (kept locally in `jvm/StorageBrowserTest.java` until upstream has it).
- Low-value internals: object-URL revocation, `platform-plugins.ts` registration order, map theme token failure,
  template style cache bound, toast Undo commit-order interleaving, view-focus same-frame race, client observation
  handshake, `historyRefreshRequired` resync, wake-listener warning across remount, sign-out confirm against a changed
  account, Files Ask identity-change and retain-boundary races, OCR worker termination.
- Per-model mutation canaries (reminder ×5, system-picker, video ×2, workflow-execution-audit, scan-review,
  workflow-local-source, resident-scheduling): dropped from the PR lane; checker-level proof stays in
  `test/quint/tooling.test.mjs` (from `quint-refinement-harness`).

### 3.3 Release rules moved into build-output audits (unit H9, same change as the test deletion)

`scripts/verify-apks.ts` gains, on the merged manifest and packaged resources of both variants:
1. Quick Settings tile service: permission and non-toggle setting (from `alpha-system-entry`).
2. No upstream "Eliza agent" notification strings in packaged resources (from `alpha-system-entry`).
3. `allowBackup=false`; `${applicationId}`-scoped authorities and task affinities (from `product-identity` 87-95).
4. Power child activity disabled, unexported, permission-guarded, no intent filter (from `power-sense-entry` 25-36).
5. `ResidentScheduleReceiver` not exported and without `LOCKED_BOOT_COMPLETED` (test-28).
6. Media-permission rules (from `photo-library.test.mjs`); per-flavor telephony permissions READ_CONTACTS,
   READ_PHONE_STATE, WRITE_CONTACTS, READ_CALL_LOG, CALL_PHONE, USE_FULL_SCREEN_INTENT, RECEIVE_*, SEND/READ_SMS
   (from the AOSP telephony regex test; verify `scripts/apk.ts` lists each before deleting).
7. No NFC permission or feature (from `wallet-disabled`); Google Workspace return manifest/domain rules (from
   `google-workspace-return-native`); note-recorder manifest checks (from `notes-recorder`); own-provider APK content
   check (from `own-provider`); sense packaging rule (from `sense-packaging-ndk`); launcher `orientation` unspecified
   (from `launcher-orientation`).

`scripts/audit-production-bundle.ts` gains: `speechSynthesis` in the denylist (from `agent-always-local` 255-258);
the "MVP" copy rule (from `demo-copy`); "no other product name in user copy" (from `white-label-copy`); the
confidentiality-claims string rule (from `confidentiality-claims.spec.ts`). Each new rule gets one fixture case in
`test/tooling/apk-verify-audit.test.ts`.

Handed to the CI plan (`scripts/ci/check-workflows.ts`, not owned here): commit-pinned actions, third-party allow-list,
`write`/`id-token` only in the two signing jobs and the publication job (from `ci-emulator-evidence` 97-130 and
`qualified-app-update.test.mjs` 11-92); every name in `scripts/ci/required-checks-ruleset.json` is a workflow job name
(from `ci-required-checks` 91-100).


## 4. Shared harness design

### 4.1 The one Playwright fixture: `test/browser/harness/fixtures.ts`

Every journey file starts with `import { test, expect } from '../harness/fixtures.ts';` and imports nothing else
except other `harness/` modules. No journey imports `@playwright/test` directly, `/src/**`, `scripts/**`, `.eliza/**`
or `specs/**` (P15: today 11 specs import product or tooling code into the runner, which makes
`playwright test --list` fail without the `.eliza` projection). Types for plugin handlers are `import type` only
(erased by Playwright's TypeScript transform), taken from `apps/app/src/native/*.ts` (23 typed plugin modules from
stage B: `alpha-calendar.ts`, `alpha-connection.ts`, `alpha-notifications.ts`, `agent.ts`, `eliza-camera.ts`, …).

```ts
// test/browser/harness/fixtures.ts (shape, not final code)
type Build = 'dev' | 'production';                 // from testInfo.project.name, never set by a spec
type AppOptions = {
  shell: 'standalone' | 'launcher';                // default 'standalone'
  connection: 'offline' | 'resident' | 'cloud';    // default 'offline'; replaces 339 inline localStorage seeds
  theme: 'light' | 'dark' | 'system';
  textScale: 1 | 1.3 | 2 | 3;
  time: string | undefined;                        // ISO instant; installs page.clock before boot
  plugins: BridgeHandlers;                         // per-test overrides merged over the defaults below
};
export const test = base.extend<AppOptions & {
  app: App;            // boots the page: seed connection, install bridge, fence network, fail on pageerror, goto('/')
  bridge: Bridge;      // typed Capacitor fake; bridge.calls(plugin, method) reads window.__alphaTest.calls
  agent: AgentFake;    // resident agent + chat stream + notes/mail/calendar data (plugins/agent.ts)
  cloud: CloudFake;    // Eliza Cloud routes via page.route: sign-in, plan, speech (harness/cloud.ts)
  voice: VoiceFake;    // capture/STT/TTS ports (plugins/voice.ts)
  nav: Nav;            // openApp, goHome, back, openSettings(path), openChat (roles only)
  clock: Time;         // advance(ms), expectNothingFor(ms) on page.clock.runFor
  a11y: A11y;          // expectAccessible(page, opts), expectFits(locator)
}>({ /* option defaults with { option: true }, fixtures in dependency order */ });
export { expect } from '@playwright/test';
```

Fixture rules:
- `app` is the only thing that calls `page.goto`. Dev build boots `/?mode=dev[&shell=launcher]`; production build boots
  the flag-off bundle on the production base URL. `?mode=mock` is used only by `journeys/dev-surface.spec.ts`.
- Network fence: every request not to the app origin or a `cloud` route fails the test (replaces 69 inline fences and
  `flagOffAndroid().fenceNetwork`).
- `pageerror` fails the test (replaces 39 inline listeners).
- Window state lives on one typed global: `declare global { interface Window { __alphaTest: AlphaTestState } }` in
  `harness/bridge.ts` (replaces 3,316 `window as any`).
- No `waitForTimeout`. Waiting is on locators or `clock.advance`.
- `test.use({ connection: 'resident' })` etc. per `describe`; tags `@production` and `@storage` per test or describe.

### 4.2 Harness files and what each replaces

| Harness file | Replaces (delete after the last importer moves) |
|---|---|
| `harness/fixtures.ts` | per-spec boot boilerplate; `helpers/page-modules.ts` (after `specs/quint/refinement/native/copy-receipt.mjs` stops importing it, formal plan) |
| `harness/bridge.ts` | the ~57 inline `window.Capacitor = {…}` fakes; `flag-off-android.ts` bridge core; `telephony-fixture.ts` bridge part |
| `harness/plugins/agent.ts` | `resident-stub.ts`, `helpers/resident-agent-plugin.ts`, agent parts of `flag-off-android.ts`, `helpers/native-navigation-protocol.ts`, `helpers/delivery-fixture.ts` (agent half); adds `/api/notes/state` handlers (today 503) |
| `harness/cloud.ts` | `helpers/native-cloud-signin.ts`, `helpers/native-cloud-plan-fixture.ts`, `helpers/cloud-connection-notices.ts`, `generic-cloud-speech-fixture.ts` (Cloud TTS boundary), `cloud-voice-fixture.ts` Cloud routes |
| `harness/plugins/voice.ts` | `voice-fixture.ts`, `cloud-notes-voice-fixture.ts`, `voice-assistant-fixture.ts`, `native-speech-fixture.ts` (7 voice fixtures become 1; `voice-fixture-failure-metadata.ts` is deleted) |
| `harness/plugins/calendar.ts` | `helpers/canonical-calendar.ts`, `helpers/home-calendar.ts`, `helpers/one-calendar.ts`, calendar half of `calendar-draft-readiness.ts`; adds `removeScoped: 'unknown'` |
| `harness/plugins/notes.ts` | `helpers/canonical-notes.ts` (rewritten through the bridge), `helpers/native-notes.ts` |
| `harness/plugins/photos.ts` | `helpers/photos-bridge.ts`, seed half of `helpers/owned-photo.ts` |
| `harness/plugins/camera.ts` | `test/fixtures/camera-preview-port.mjs` (as `fakeCamera`), the scan-native page camera bridge; gateable `capture`/`switch` |
| `harness/plugins/launcher.ts` | `device-apps-stub.ts`, launcher stub in `accessibility-states.ts:357-396` |
| `harness/plugins/telephony.ts` | `telephony-fixture.ts` (with a holdable `status`) |
| `harness/plugins/notifications.ts` | notification half of `helpers/delivery-fixture.ts` |
| `harness/plugins/ocr.ts` | `helpers/ocr-stub.ts` |
| `harness/nav.ts` | `app-navigation.ts`, `workflow-navigation.ts`, `inbox-draft-navigation.ts`, `scan-review-navigation.ts`, `helpers/calendar-review.ts`, `helpers/mail-actions.ts`, `helpers/cloud-plan-settings.ts`, `helpers/connection-diagnostics.ts` (as `openConnectionHelp()`, through visible UI), `helpers/retained-digests.ts` (via Automations → Scheduled digests), `chooseCalendarEventAction` from `helpers/browser-calendar.ts`, menus from `helpers/owned-photo.ts`; `openLegacyNotes`/`openBrowserCalendar` are not carried |
| `harness/a11y.ts` | `accessibility-audit.ts` (806 lines; keep the product rules: dock overlap, reading order, clipping at 200/300 %, contrast table including the map-label pair) and `expectFits` from `content-review-layout.spec.ts`; contrast maths in `camera-overlay-contrast.spec.ts`/`map-label-contrast.spec.ts` |
| `harness/states.ts` | `accessibility-states.ts` state catalogue (minus the launcher stub; minus legacy-notes states) |
| `harness/time.ts` | `helpers/settled.ts`; adds `advance`, `expectNothingFor` |
| `harness/storage.ts` | `helpers/calendar-storage-hold.ts` / `calendar-fixture.ts` (`holdDocumentsTransaction`); adds `damageDocument(key)` |
| `harness/local-agent.ts` | `hosted-harness.ts` (live lane only) |
| `harness/global-setup.ts` | `warm-dev-server.ts` |
| `harness/media.ts` | media half of `calendar-draft-readiness.ts` |
| `harness/lanes.ts` | `productionSpec`/`liveSpec` regexes in `playwright.config.ts:10,13` and `scripts/ci/affected.ts:58-59`; exports the tag names and journey file list for the CI plan's selection map |

Not carried: `helpers/legacy-notes.ts` (gone), `helpers/note-schedule-contract.ts` (rewrites served `main.tsx`; goes
with the owner decision in §3.1 #43), `helpers/startup-frames.ts` (inlined into `journeys/startup-permissions.spec.ts`).

Formal-plan precondition: `specs/quint/refinement/application/{account-sheet,cloud-connection-notices,shell-coordinator}.mjs`,
`specs/quint/refinement/composition/{controllers,index}.mjs` and `specs/quint/refinement/native/copy-receipt.mjs`
import `test/browser/flag-off-android.ts`, `resident-stub.ts`, `helpers/{native-cloud-plan-fixture,native-navigation-protocol,resident-agent-plugin,cloud-connection-notices,page-modules}.ts`
and `browser-photo-edit.spec.ts`. The formal plan repoints them to `harness/**` in the change where T1 lands, or the
old files stay until it does (T-Z deletes them last).

### 4.3 Host-test helpers to keep (`test/support/` and `test/integration/support/`)

| Keep as | From | Replaces |
|---|---|---|
| `test/support/jvm.mjs` | `test/fixtures/jvm-tools.mjs` + `compileKotlin` from `test/fixtures/kotlin-tools.mjs` | 70 inline `execFileSync(javac)` blocks and 7 local `JAVA_HOME` resolvers; `kotlin-tools.mjs --prepare` moves to `scripts/ci/prepare-host-kotlin.ts` (scripts/CI plan; `.github/workflows/{browser,android}.yml` call it) |
| `test/support/git.mjs` | `test/fixtures/git-fixture.mjs` | per-test temp repos in tooling tests |
| `test/support/wait-for.mjs` | `test/fixtures/wait-for.mjs` without `deferred` | 18 local `deferred()` (use `Promise.withResolvers()`), 17 `flush`, 27 `tick` |
| `test/support/load-module.mjs` | `test/fixtures/browser-source.mjs` (the single esbuild loader, with a stub-map option) | `ts-source.mjs`, inline `data:text/javascript` loaders, `bundled-module.ts` in `scripts/fixtures` |
| `test/support/release-fixture.mjs` | `test/fixtures/app-update-candidate.mjs`, `mobile-uuid-build.mjs`, one `DISTRIBUTABLE` record and one sha256/scratch-dir helper | three release-record fixtures in `record-release`, `publish-update-manifest`, `pilot-units` |
| `test/support/upstream-source.mjs` | `test/fixtures/native-source.mjs` (absorbs `sharedSpeechSource` from `jvm-tools`) | |
| `test/support/strip-types.mjs` | stays only while `specs/quint/**` imports it (36 spec importers); no new test imports it | `test/fixtures/ts-source.mjs` (byte-identical twin, deleted) |
| `test/integration/support/loopback.ts` | `scripts/fixtures/loopback.ts` | |
| `test/integration/support/device-action-journal.ts` | `scripts/fixtures/device-action-journal.ts` + `test/fixtures/device-action-policy.mjs` | |
| `test/integration/support/hosted-digest-protocol.ts` | `scripts/fixtures/hosted-digest-protocol.ts` | |
| `test/integration/support/inbox-memory.ts` | `scripts/fixtures/inbox-memory.ts` (also used by `scripts/inbox-adapter-fixture.ts`; it imports the new path) | |
| `test/integration/support/local-agent-stream.ts` | `scripts/fixtures/local-agent-stream.ts` | |
| `test/integration/support/speech-bridge.ts` | `scripts/fixtures/speech-bridge.ts` | |
| `test/integration/support/browser-daily.mjs` | `test/fixtures/browser-daily-stores.mjs` + `browser-reminder-clock.mjs` | |
| `test/integration/support/managed-google-agent.mjs` | `test/support/managed-google-agent.mjs` (imports host options from `scripts/native-google-product-host.ts`) | |
| `test/integration/support/{owner-routes,secure-slots}.json` | new shared case tables | the two halves of `owner-route-parity` and `native-secure-slots` |
| `test/integration/jvm/stubs/**` | one Android stub tree: `test/fixtures/{android-stubs,note-recorder-jvm,scoped-calendar-jvm,calendar-provider-jvm}/**`, `secure-store-memory/android/util/AtomicFile.java`, `test/fixtures/SqliteCalendarProvider.java` | four duplicated `android.content.Context`/`android.net.Uri` copies |
| `test/tooling/support/fake-bun.mjs`, `fake-adb.mjs`, `fake-gradle.mjs`, `pinned-checkout.mjs` | launch helper (3 copies in `agent-*` tests), fake `adb` in `android-instrumentation-runner`, fake Gradle `run` and the temp-checkout-with-pinned-vendor fixture (3 copies in `android-*` tests) | |

Kept where they are, owned by the formal plan (imported by `specs/quint/**` and moved by it into
`specs/quint/refinement/**/fixtures/`): `test/fixtures/{android-browser-module-stage,android-gzip-assets,core-state-root,hosted-digest-refresh.jsx,lifeops-scheduled-task-route,native-google-host-builder-port,pilot-update,prepare-local-agent,prepared-worker-producer,resident-java-source-stage,scheduled-task-controls,settings-model-traces,workflow-worker-assets}.mjs`,
the PORT fixtures (`notes-recorder-media`, `observed-sms-adapter`, `product-character-host`, `reminder-open-intent`,
`retained-reminder-tap`, `shade-notice-question`, `shade-row-custody`, `use-in-email-review`, `workflow-clock-admission`,
`browser-external-handoff`, `calendar-draft-handoff`, `calendar-mounted-editor`, `camera-calendar-review`,
`modal-scrim-chromium`), `test/fixtures/app-update-jvm/**`, `reviewed-copies-jvm/**`, `UpdateFlowTest.java`,
`ScopedCalendarSnapshotTest.java`, `google-browser-auth/{chain-methods.mjs,ai/eliza/auth/cloud/CloudSignInChainTest.java.txt}`.
Where a host test of this plan also imports one of them (for example `pilot-update.mjs` from
`test/tooling/owner-tools.test.ts`), the test imports the new `specs/` path after the formal move.


## 5. Execution units

File ownership rules (they make the units non-overlapping):
- A unit owns the target files listed for it, every source row in §2 under its targets that is **not** marked
  "shared", and the support files named in its row below.
- A source row marked "shared by …; TZ deletes" is read by each listed unit (`git show HEAD:<path>` after it is gone
  from the tree) and deleted only by TZ. No unit other than TZ edits or deletes it.
- §1 rows are deleted by T2, except rows marked "carry" (deleted by the unit of the target they carry to) and the
  Quint wrappers (Q1).
- No unit edits `specs/**`, `.github/**`, `vendor/**` or product code. Product seams a rewrite needs (exported
  controllers, injectable ports) are requested from the owning product unit and listed as preconditions.
- Every unit ends with: its new files pass alone (`node --test <files>` or `npx playwright test <files>`), then
  `npm run typecheck`, then `npm test` (host units) or `npm run test:browser` + `npm run test:browser:production`
  scoped to its journey files (journey units).

| Order | Unit | Owns (targets) | Also owns | Sources absorbed (non-shared) | Preconditions |
|---|---|---|---|---:|---|
| 1 | **T0** Runner and config | `playwright.config.ts`, `scripts/run-node-tests.ts`, the `test*` entries of `package.json` `scripts`, `test/browser/harness/lanes.ts` | deletes `scripts/storage-specs.ts`, `test/playwright-projects.test.mjs`, `test/node-test-runner.test.mjs`, `test/test-helpers.test.mjs` | – | none. Transitional globs keep old files running (§6) |
| 2 | **T2** Pure deletions | every non-carry, non-Quint test and spec row of §1 (§1.1–§1.3, §1.7), and the §1.5–§1.6 helper/fixture rows marked "T2" | the `scripts/test-*` rows and `scripts/fixtures/workflow-host.ts` of §1.7 | 325 deletions (the 141 carry rows go to their target unit, 53 fixture/helper rows to TZ, 143 Quint wrappers to Q1) | rows marked "after …" in §1 wait for that precondition; everything else lands at once. Removes the `python-suites.test.mjs` lines for deleted `.py` files |
| 2 | **T1** Harness | `test/browser/harness/**` (23 files, §4.2) | – | the helper rows mapped to HARNESS in §2.4 are read, not deleted (TZ deletes them) | T0 |
| 3 | **T3** Chat | `journeys/chat.spec.ts`, `journeys/chat-context.spec.ts` | | 37 | T1 |
| 3 | **T4** Voice | `journeys/voice.spec.ts`, `journeys/voice-dictation.spec.ts`, `test/browser/live/{voice,cloud-voice,agent-playback}.local.spec.ts` | | 29 | T1 |
| 3 | **T5** Account and agent connection | `journeys/account-sign-in.spec.ts`, `journeys/account-plan.spec.ts`, `journeys/agent-connection.spec.ts` | `scripts/fixtures/cloud-delegation/` (moved to `test/browser/harness/fixtures/cloud-delegation/` if the page stays) | 37 | T1 |
| 3 | **T6** Inbox | `journeys/inbox.spec.ts`, `journeys/inbox-compose.spec.ts` | | 32 | T1; canonical Notes fixture for the share-note steps (§3.1 #35) from T1 |
| 3 | **T7** Calendar and reminders | `journeys/calendar.spec.ts`, `journeys/calendar-agent.spec.ts`, `journeys/reminders.spec.ts` | | 41 | T1 |
| 3 | **T8** Notes | `journeys/notes.spec.ts`, `journeys/notes-capture.spec.ts` | | 21 | T1; legacy Notes engine deletion (C1) lands in the same change as the J02/J05/summary ports (§3.1 #34-35) |
| 3 | **T9** Camera, photos, video, scan | `journeys/camera.spec.ts`, `journeys/photos.spec.ts`, `journeys/video.spec.ts`, `journeys/scan.spec.ts` | | 46 | T1 |
| 3 | **T10** Files and Browser | `journeys/files.spec.ts`, `journeys/storage-contract.spec.ts`, `journeys/browser.spec.ts`, `journeys/browser-reading.spec.ts` | | 37 | T1 |
| 3 | **T11** Maps, telephony, notifications | `journeys/maps.spec.ts`, `journeys/telephony.spec.ts`, `journeys/notifications.spec.ts` | | 49 | T1; formal port of `specs/quint/refinement/native/telephony.mjs` off `contacts-adapter` (§3.1 #67) |
| 3 | **T12** Home | `journeys/home-shell.spec.ts`, `journeys/home-overview.spec.ts`, `journeys/launcher.spec.ts` | | 22 | T1 |
| 3 | **T15** Settings and startup | `journeys/settings.spec.ts`, `journeys/startup-permissions.spec.ts` | | 32 | T1 |
| 3 | **T13** Workflows and digests | `journeys/workflows.spec.ts`, `journeys/workflows-authoring.spec.ts`, `journeys/digests.spec.ts` | | 28 | T1 |
| 4 | **T14** Cross-cutting | `journeys/accessibility.spec.ts`, `journeys/production-gating.spec.ts`, `journeys/dev-surface.spec.ts` | `harness/states.ts` content (state list only) | 32 | T3–T15 landed (the sweep visits their screens) |
| 2 | **H2** Connection, agent, shell | `test/integration/{connection-cloud,dev-bridge-cloud,dev-bridge-agent,local-agent,alpha-client,diagnostics-export,shell-settings,startup-permissions}.test.ts` | `test/integration/support/{loopback.ts,owner-routes.json}` | 45 | T0. Plan-recheck cases (§3.1 #64) wait for the stage-F `connection-ui.tsx` controller export |
| 2 | **H3** Voice host | `test/integration/voice.test.ts` | `test/integration/support/local-agent-stream.ts` (its sources' deletion lets TZ remove `test/fixtures/{cloud-voice-view.mjs,cloud-voice-view.d.mts,shared-batch-voice.mjs,voice-markup.mjs}`) | 11 (+ ~40 transplant deletes it unblocks) | T0; injectable ports in `app-speech.ts` and a snapshot reader for voice selection (product request) |
| 2 | **H4** Calendar host | `test/integration/{calendar,calendar-agent,calendar-google,reminders-clock}.test.ts` | `test/integration/support/browser-daily.mjs` | 23 | T0 |
| 2 | **H5** Inbox and Google host | `test/integration/{inbox,gmail-google,managed-google-broker,native-google-host}.test.ts` | `test/integration/support/{inbox-memory.ts,managed-google-agent.mjs,secure-slots.json}` | 24 | T0 |
| 2 | **H6** Device actions, notes, maps, phone host | `test/integration/{device-actions,notes,notes-recorder,phone-sms-contacts,maps,photos-library}.test.ts` | `test/integration/support/device-action-journal.ts` | 21 | T0 |
| 2 | **H7** Workflows, digests, resident, live host | `test/integration/{workflows,digests}.test.ts`, `test/resident/{digest-restart,resident-bundle}.test.ts`, `test/live/redaction.test.ts` | `test/integration/support/hosted-digest-protocol.ts`; deletes `test/digest-restart-input.test.mjs` | 26 | T0; CI plan repoints `resident-android.yml` mobile-bundle and digest-restart steps |
| 2 | **H8** Host-JVM | `test/integration/android-jvm.test.ts`, `test/integration/jvm/*.java` (14 drivers, §2.1), `test/integration/jvm/stubs/**` | `test/support/jvm.mjs` | 70 | T0; formal plan repoints `specs/quint/refinement/native/{calendar-sync-enable-platform,scoped-calendar-review-platform}.mjs` to `test/integration/jvm/stubs/` in the same change |
| 2 | **H9** Release audits | `test/tooling/{apk-verify-audit,release-signing,app-update}.test.ts`, the §3.3 rule additions in `scripts/verify-apks.ts` and `scripts/audit-production-bundle.ts` | `test/support/release-fixture.mjs` | 32 | T0; the scripts plan does not edit those two scripts in the same stage |
| 2 | **H11** Android build tooling | `test/tooling/{android-build,android-instrumentation,aosp,voice-host,embedding-host}.test.ts` | `test/tooling/support/{fake-adb,fake-gradle,pinned-checkout}.mjs` | 41 | T0 |
| 2 | **H10** Other tooling | `test/tooling/{ci,cloud-deployment,cloud-resident-host,local-agent-launcher,owner-tools,python,upstream-sources,workflow-worker}.test.ts` | `test/tooling/support/fake-bun.mjs`, `test/support/{git,wait-for,load-module,upstream-source}.mjs` | 42 | T0 |
| 4 | **Q1** Quint runner | `test/quint/refinement.test.mjs`, `test/quint/tooling.test.mjs` | deletes all 292 `test/quint-*.test.mjs` | 9 tooling + 292 wrappers | formal plan has registered every driver test-45 §Cross-file 2 lists, moved the inline replays, and ported the slicing ones (`back-dispatch`, `chat-dock`, `connection-controller`, `delegation-receiver`, `fixture-busy-latch`, `inert-hold`, `keyboard-detectors`) |
| 5 | **TZ** Final sweep | – | every "shared … TZ deletes" row of §2; every old helper in `test/browser/*.ts` and `test/browser/helpers/*.ts`; `test/fixtures/` and `test/own-provider/` directories once empty; `scripts/fixtures/*` that moved; removes the transitional globs from `playwright.config.ts` and `scripts/run-node-tests.ts`; `test/python-suites.test.mjs` | 69 shared | all of the above; formal plan repointed the six drivers in §4.2 |

Sizing: each of T3–T15 and H2–H11 is 20–50 source files feeding 1–5 target files, about one implementer-day of
reading plus writing. H8 is mostly mechanical moves of Java drivers. T2 is large but mechanical (delete, then fix
the runner lists). T14 and TZ are last because they depend on every other unit.


## 6. Runner changes

### 6.1 `scripts/run-node-tests.ts` (T0, finalised by TZ)

Today it runs `node --test --test-concurrency=4 --test-timeout=600000 … test/*.test.mjs test/*.test.ts`
(`scripts/run-node-tests.ts:13-14`), so every change runs all 971 files.

Target behaviour:
- Lanes by folder: `integration` → `test/integration/*.test.ts` (includes `android-jvm.test.ts`), `tooling` →
  `test/tooling/*.test.ts`, `quint` → `test/quint/*.test.mjs`, `resident` → `test/resident/*.test.ts`, `live` →
  `test/live/*.test.ts`.
- `npm test` with no arguments runs `integration`, `tooling` and `quint`. `resident` and `live` run only when named.
- `node scripts/run-node-tests.ts --lane=integration [--lane=tooling …]` selects lanes; any other argument that is a
  path is passed through as a file (so CI can pass the affected files). Unknown `--lane` exits 2.
- `--test-timeout` drops from 600000 to 120000; the two Quint runner tests set their own `{ timeout }` per model.
- Transitional (T0 until TZ): the default also includes `test/*.test.mjs test/*.test.ts`, so unmigrated files keep
  running. TZ removes those two globs; after that a file at `test/*.test.*` is not run, and T0's lane table is the
  only list.
- `ALPHA_TEST_CONCURRENCY` stays.

### 6.2 `playwright.config.ts` (T0, finalised by TZ)

- `testDir: './test/browser'`; `testMatch` per project, see below. `globalSetup: './test/browser/harness/global-setup.ts'`.
- Drop the `storageSpecPattern` import (and `scripts/storage-specs.ts`), the `productionSpec` and `liveSpec` regexes;
  import tag and lane names from `test/browser/harness/lanes.ts` instead (that file is also what `scripts/ci/affected.ts`
  imports in the CI plan, replacing its copies at `affected.ts:58-59`).
- Projects:

| Project | `testMatch` | `grep` / `grepInvert` | Server |
|---|---|---|---|
| `dev` (renamed from `chromium`) | `journeys/*.spec.ts` | `grepInvert: /@production/` | development server (`ELIZA_DEV_ALLOW_TEST_MOCKS=1`) |
| `production` | `journeys/*.spec.ts` | `grep: /@production/` | flag-off build + `audit-production-bundle.ts` + preview (unchanged command) |
| `firefox`, `webkit` | `journeys/*.spec.ts` | `grep: /@storage/` | development server |
| `live` (only when named) | `live/*.local.spec.ts` | – | development server with `VITE_LOCAL_AGENT=1` |

- Transitional (T0 until TZ): `dev` also matches `*.spec.ts` at the top level excluding `*.production.spec.ts`,
  `production-surface.spec.ts` and `*.local.spec.ts`; `production` also matches the top-level production files;
  `firefox`/`webkit` keep the current storage list inline until T10/T7/T8 tag their steps `@storage`. TZ removes all
  top-level patterns.
- `workers` stays 2 on CI; locally `undefined`. `timeout` stays 30 s; journeys that need more set it per test, and
  none may exceed 120 s.
- The three always-skipped chromium specs re-run by a second server today (`browser-agent-tts`, `browser-host-disclosure`,
  `host-reminder-recovery`, `browser.yml:178-182`) are gone (§1, §2); the CI plan deletes that extra step.

### 6.3 `package.json` scripts (T0)

| Script | New value |
|---|---|
| `test` | `node scripts/run-node-tests.ts` (lanes integration, tooling, quint) |
| `test:integration` | `node scripts/run-node-tests.ts --lane=integration` |
| `test:tooling` | `node scripts/run-node-tests.ts --lane=tooling` |
| `test:resident` | `node scripts/run-node-tests.ts --lane=resident` |
| `test:live` | `node scripts/run-node-tests.ts --lane=live` |
| `test:browser` | `playwright test --project=dev` |
| `test:browser:production` | `playwright test --project=production` |
| `test:browser:storage` | `playwright test --project=firefox --project=webkit` |
| `test:browser:live` | unchanged command, `--project=live` |
| `quint:conformance` | `node --test test/quint/refinement.test.mjs` with `ALPHA_QUINT_MODELS=conformance` (the four files it names today are deleted by Q1; the formal plan owns the model filter) |

`verify` keeps calling `npm test`; it gets faster without a script change. `test:android:instrumentation` is unchanged.

### 6.4 Path pins outside this plan's files (hand-off list)

| File | Pin | New value | Owner |
|---|---|---|---|
| `.github/workflows/resident-prepare.yml:43` | `node --test test/calendar-managed-rejection.test.mjs` | `node scripts/run-node-tests.ts --lane=resident` | CI plan |
| `.github/workflows/resident-android.yml:197-198` | `python3 test/embedding-artifact-inputs.test.py`, `test/hosted-native-inputs.test.py` | `python3 test/tooling/python/embedding-artifact-inputs.test.py`, `python3 -B test/tooling/python/hosted-native-inputs.test.py` (or `node --test test/tooling/python.test.ts`) | CI plan |
| `.github/workflows/resident-android.yml:245` | `test/resident-crash-diagnostic.test.py` | removed (file deleted) | CI plan |
| `.github/workflows/resident-android.yml:265-270` | five `test/*.test.mjs` | `test/tooling/embedding-host.test.ts test/tooling/upstream-sources.test.ts test/tooling/voice-host.test.ts` (the `cloud-voice-profile` and `private-preview-cartesia-route` cases moved to journeys) | CI plan |
| `.github/workflows/{browser,android}.yml` | `node test/fixtures/kotlin-tools.mjs --prepare` | `node scripts/ci/prepare-host-kotlin.ts` | CI plan |
| `.github/workflows/browser.yml:178-183` | second dev server for three always-skipped specs | removed | CI plan |
| `scripts/ci/affected.ts:7,11,58-59` | comments naming `test/docs-links.test.mjs`, `test/ci-affected.test.mjs`; `productionSpec`, `selectableSpec` | import from `test/browser/harness/lanes.ts`; select `test/browser/journeys/<name>.spec.ts` by area | CI plan |
| `scripts/audit-production-bundle.ts:80` | comment naming `test/llama-cpp-only.test.mjs` | names `test/tooling/apk-verify-audit.test.ts` | H9 |
| `scripts/android-instrumentation.ts:300` | comment naming `test/android-instrumentation-runner.test.mjs` | names `test/tooling/android-instrumentation.test.ts` | H11 (comment only) |
| `scripts/owner/emulator-campaign-check.ts` | names `test/owner-emulator-campaign-check.test.mjs` | names `test/tooling/android-instrumentation.test.ts` | H11 |
| `specs/quint/{application,native,services}/manifest.json` | paths of deleted host tests (`browser-session-persistence`, `chat-release`, `final-ui-lifecycle`, `home-views-model`, `keyboard-dictation`, `quint-contacts-session`, `quint-mms-compose`, `quint-phone-session`) | removed | formal plan, same change as T2/Q1 |
| `specs/quint/refinement/**/*.md` | prose naming deleted `test/quint-*.test.mjs` wrappers | `test/quint/refinement.test.mjs` | formal plan |
