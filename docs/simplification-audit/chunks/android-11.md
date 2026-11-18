# Chunk android-11 — androidTest Video…Workflow* (17 files, 1,768 lines)

Per-file reports: `docs/simplification-audit/files/android/app/src/androidTest/java/ai/alphacompute/alphaphone/<Class>.java.md`.

## Files
| file | verdict | lines now | est. lines after |
|---|---|---|---|
| VideoInstrumentedTest.java | SIMPLIFY | 126 | 92 |
| VoiceFloatPathDiagnosticInstrumentedTest.java | DELETE (in `NOT_RUN_BY_A_RUNNER`) | 77 | 0 |
| VoiceNoteReadAloudInstrumentedTest.java | SIMPLIFY | 53 | 40 |
| VoicePermissionDeniedInstrumentedTest.java | SIMPLIFY | 131 | 88 |
| VoicePermissionRevokeInstrumentedTest.java | SIMPLIFY (small) | 147 | 125 |
| VoiceWorkerSettlementInstrumentedTest.java | MOVE upstream, then DELETE | 61 | 0 |
| WebViewTestDriver.java | SIMPLIFY + grow into the one shared driver | 98 | 110 |
| WorkerCrashDiagnostic.java | SIMPLIFY (owner: DELETE) | 63 | 20 |
| WorkflowApprovalNoticeInstrumentedTest.java | SIMPLIFY | 183 | 130 |
| WorkflowApprovalNoticeProcessDeathInstrumentedTest.java | SIMPLIFY + absorb overlapping approval test | 155 | 120 |
| WorkflowDraftNativeInstrumentedTest.java | SIMPLIFY | 33 | 22 |
| WorkflowLegacyReminderUpgradeInstrumentedTest.java | DELETE (A1, owner decision) | 53 | 0 |
| WorkflowNoticeOwnerFixture.java | SIMPLIFY | 100 | 85 |
| WorkflowNoticeProcessDeathInstrumentedTest.java | SPLIT (toolkit → new `MainProcessControl.java`, ~60) + SIMPLIFY | 198 | 55 (+60 moved) |
| WorkflowNoticeProcessRunner.java | KEEP | 4 | 4 |
| WorkflowNoticeTapInstrumentedTest.java | SIMPLIFY | 187 | 120 |
| WorkflowPhoneNativeInstrumentedTest.java | SIMPLIFY | 99 | 75 |
| **Total** | | **1,768** | **~1,146 (incl. new support classes)** — ~620 removable |

## Local types and helpers
| name | kind | file:line | twins | proposed home |
|---|---|---|---|---|
| `until` / `ready` poll | helper | VideoInstrumentedTest:26, VoiceNoteReadAloud:24, VoicePermissionDenied:29, VoicePermissionRevoke:49 (`ready`), WorkflowDraftNative:15, WorkflowPhoneNative:23 | 88 private copies in androidTest (`git grep 'private .*void until(\|private void ready('`) | `WebViewTestDriver.until(js, ms)` |
| `call(expr)` promise→window-global bridge | helper | VoicePermissionRevoke:39, WorkflowApprovalNotice:41, WorkflowDraftNative:16, WorkflowPhoneNative:24, WorkflowNoticeTap:16, WorkflowNoticeOwnerFixture:32 (inline) | 12 files (`git grep 'Promise.resolve().then(()=>"'`) | `WebViewTestDriver.call(expr, ms)` → JSONObject |
| `eval`/`js` wrappers | helper | Video:25, VoicePermissionDenied:38, WorkflowDraftNative:14, WorkflowPhoneNative:22 | 62 files (research P20) | delete; `WebViewTestDriver.evaluate` |
| `click(label)` / `button(label)` | helper | Video:31, VoicePermissionDenied:30-31 | others in androidTest | `WebViewTestDriver.click` |
| live-Activity stage scan | helper | WebViewTestDriver:21-28 & 83-90, VoicePermissionDenied:33-37, WorkflowNoticeTap:27-31,51,137 | 27 files use `getActivitiesInStage` | `WebViewTestDriver.liveActivity(Class)` |
| navigate-to-view triple | helper | Video:35, VoicePermissionDenied:65/77/78/111, WorkflowPhoneNative:63/77 | many | `AppNavigation.go(view)` |
| sign-in form drivers | const | Video:72,74 | `InboxFixtureSignIn.DRIVE_EMAIL/DRIVE_CODE` | `InboxFixtureSignIn.driveEmail(email)` |
| `sha` SHA-256→hex | helper | WorkflowDraftNative:17, WorkflowPhoneNative:25 | 35 `MessageDigest.getInstance("SHA-256")` sites in androidTest | `TestHashes.sha256Hex` (androidTest) |
| notice row lookup by `"alpha-workflow-"+id` | helper | WorkflowApprovalNotice:52,158,160; WorkflowApprovalNoticeProcessDeath:23-33; WorkflowNoticeProcessDeath:85,142; WorkflowNoticeTap:64,151; WorkflowNoticeOwnerFixture:38 | — | new `WorkflowNoticeTestSupport` |
| `"alpha-workflow-"` tag prefix | const | 18 occurrences in 5 test files | `WorkflowNoticePoster.java:13` (main) | `WorkflowNoticePoster.TAG_PREFIX` |
| `OWNER_SLOT="workflow-notice-owner:v1"` | const | WorkflowNoticeOwnerFixture:16 | `WorkflowNoticeTaps.java:9` (main) | delete; use production |
| `APP="ai.alphacompute.alphaphone"` | const | WorkflowApprovalNoticeProcessDeath:22, WorkflowNoticeProcessDeath:23, WorkflowLegacyReminderUpgrade:26 | `scripts/android-instrumentation.ts:46` PACKAGE | `BuildConfig.APPLICATION_ID` |
| fixture `route(owner, run)` | helper | WorkflowApprovalNotice:157, WorkflowNoticeTap:62, inline WorkflowNoticeOwnerFixture:25, WorkflowNoticeProcessDeath:104,168, WorkflowApprovalNotice:59, WorkflowApprovalNoticeProcessDeath:142 | — | `WorkflowNoticeOwnerFixture.route` |
| publish-then-poll-receipt loop | helper | WorkflowNoticeProcessDeath:106-114, WorkflowNoticeTap:81-88,162-164 | — | `WorkflowNoticeTestSupport.awaitPublished` |
| pending-tap poll | helper | WorkflowNoticeTap:38-47, WorkflowApprovalNotice:72,81,89,179 | — | `WorkflowNoticeTestSupport.awaitPendingTap` |
| `Identity`, `mainPids`, `awaitMain`, `killMainWithoutTasks`, `sendOriginalTap` | class/helper | WorkflowNoticeProcessDeath:25-84 | used by WorkflowApprovalNoticeProcessDeath, ReminderTapProcessDeath | new `MainProcessControl.java` |
| helper-process/owned-user preamble | helper | WorkflowApprovalNoticeProcessDeath:52,112,134; WorkflowNoticeProcessDeath:94,159 | — | `WorkflowNoticeTestSupport` |
| anonymous `WorkflowNoticeDelivery.Storage` over credential store | class | WorkflowNoticeProcessDeath:99 | main `WorkflowNoticeTapsFactory.storage` | delete; use factory |
| anonymous `NativeDigestSources.Storage` (HashMap) / `Reader` | class | WorkflowLegacyReminderUpgrade:34,38; WorkflowPhoneNative:81,87 | — | `MapStorage` (androidTest) if both survive |
| primary/suppressed cleanup idiom | helper | WorkflowDraftNative:30, WorkflowPhoneNative:43-47,68,97 | other androidTest classes | `TestCleanup.run` |
| calendar fixture create/delete via sync-adapter URI | helper | WorkflowPhoneNative:57-58,68,97 | 12 `Calendar*` tests | `TestCalendars` |
| `"alpha-cloud-voice-"` capture prefix | const | VoicePermissionRevoke:57-59, VoicePermissionDenied:108, VoiceWorkerSettlement:53 | main `AlphaVoiceCloudPlugin` | production constant |
| `"cloud:production"` / `"remote:"+origin` slot names | const | VoicePermissionDenied:124-125; WorkflowNoticeOwnerFixture:59,69,97; WorkflowNoticeTap:63; WorkflowApprovalNoticeProcessDeath:122 | `"cloud:production"` 32× Java (PATTERNS C6) | production constants |
| `Call extends PluginCall` fake | class | VoiceWorkerSettlement:25 | other PluginCall fakes (research P20) | upstream test |

## Delete candidates
| item | evidence | confidence |
|---|---|---|
| `VoiceFloatPathDiagnosticInstrumentedTest.java` + `NOT_RUN_BY_A_RUNNER.VoiceFloatPathDiagnostic` (`scripts/android-instrumentation.ts:342`) | Listed as never run; asserts only that diagnostic evidence was written; `float-path-diagnostic.json` has no reader (grep 0). | High |
| `VoiceWorkerSettlementInstrumentedTest.java` + registry key `VoiceWorkerSettlement` | Reflection into upstream `LocalSpeechBridgePlugin` privates; Alpha owns none of the code; upstream has `speech-bridge/test/failure-settlement.test.mjs`. Move upstream first. | Medium (needs upstream PR) |
| `WorkflowLegacyReminderUpgradeInstrumentedTest.java` + `legacy-digest` companion in `scripts/test-installed-upgrade.ts:38,117` + `test/installed-upgrade-runner.test.mjs:77` + registry entry | A1: seeds come from the old package's data; package renamed 2026-11-10 with empty private data; `NativeDigestSources` has no `legacyAlarm` branch. | Medium (owner: confirm no install base) |
| `WorkflowNoticeProcessDeathInstrumentedTest#approvalNoticeOpensOnlyItsApprovalAfterProcessDeath` + `pending-recovery-ui.py` phase `workflow-approval-process-death` + its result parser (line 33) + `test-pending-recovery-phases.py` cases | T4 overlap with `WorkflowApprovalNoticeProcessDeathInstrumentedTest#pendingApprovalNoticeSurvivesProcessDeathAndOpensItsExactApprovalOnce`; fold the "other approval untouched" check first. | Medium |
| `WorkflowNoticeTapInstrumentedTest` main-looper hold harness (lines 15, 35, 93-127) | Tests `TestUiDispatch` timeout ("exceeds the obsolete 1 s cap"); `UiDispatchInstrumentedTest` covers TestUiDispatch. | High |
| `WorkerCrashDiagnostic` tombstone protobuf parser (lines 30-62) — or whole file | Only consumer stores it in a failure-diagnostic snapshot (`ResidentWorkflowCrashInstrumentedTest:235`); no assertion, no script reads `workerCrash`/`seccompSyscall`. | Medium |
| Unread instrumentation result bundles: `workflowApprovalNoticeProcessDeath` (WorkflowApprovalNoticeProcessDeath:103), `workflowNoticeProcessDeath` (WorkflowNoticeProcessDeath:136), `workflowOwnerPreparedIntentSender` (WorkflowNoticeOwnerFixture:43-47), `workflowReturnedTapDiagnostic_*` (WorkflowApprovalNotice:15-22) | Only `INSTRUMENTATION_RESULT: workflowApprovalProcessDeath` is parsed (`scripts/ci/pending-recovery-ui.py:33`); grep for the others in scripts/test: 0. | High |
| `VoiceNoteReadAloud` evidence file `note-read-aloud.json` (lines 36, 42, 50-51) | No reader (grep 0). | High |
| `VideoInstrumentedTest.playbackDiagnostics()` (36-43) | Reflection into upstream `PhotosPlugin.playback`; used only in one failure message. | High |
| Unused imports `Handler`, `Looper`, `TimeUnit` in `WebViewTestDriver.java:4-5,9` | Each appears only on its import line. | High |
| Unused locals `delivery` (`WorkflowApprovalNoticeProcessDeath:56,114`) | Declared, never read. | High |
| `WorkflowNoticeOwnerFixture.OWNER_SLOT` | Duplicate of `WorkflowNoticeTaps.OWNER_SLOT`. | High |

## Cross-file actions
1. **Shared WebView driver API** — add `until`, `call`, `click`, `liveActivity` to `WebViewTestDriver.java`, then delete local copies in: VideoInstrumentedTest, VoiceNoteReadAloudInstrumentedTest, VoicePermissionDeniedInstrumentedTest, VoicePermissionRevokeInstrumentedTest, WorkflowApprovalNoticeInstrumentedTest, WorkflowDraftNativeInstrumentedTest, WorkflowPhoneNativeInstrumentedTest, WorkflowNoticeTapInstrumentedTest, WorkflowNoticeOwnerFixture (and ~80 more androidTest classes outside this chunk). Add `AppNavigation.go(view)` and `setComposer(text)` (`AppNavigation.java`).
2. **Workflow notice test support** — create `androidTest/.../WorkflowNoticeTestSupport.java` (row/present/awaitGone/awaitPublished/awaitPendingTap/approvalId/helper-process preamble) and `WorkflowNoticeOwnerFixture.route()`/`forgetOwner()`; edit WorkflowApprovalNoticeInstrumentedTest, WorkflowApprovalNoticeProcessDeathInstrumentedTest, WorkflowNoticeProcessDeathInstrumentedTest, WorkflowNoticeTapInstrumentedTest, WorkflowNoticeOwnerFixture. Expose `WorkflowNoticePoster.TAG_PREFIX` in `android/app/src/main/.../WorkflowNoticePoster.java`.
3. **Process-death toolkit move** — new `androidTest/.../MainProcessControl.java` from `WorkflowNoticeProcessDeathInstrumentedTest:23-84`; update `WorkflowApprovalNoticeProcessDeathInstrumentedTest`, `ReminderTapProcessDeathInstrumentedTest` (outside chunk).
4. **Approval process-death merge** — `WorkflowApprovalNoticeProcessDeathInstrumentedTest` (absorb check), `WorkflowNoticeProcessDeathInstrumentedTest` (delete method), `scripts/ci/pending-recovery-ui.py` (PHASES, OWNER_PREPARED, result regex line 33, runner selection line 96), `scripts/ci/test-pending-recovery-phases.py` (lines 79-121).
5. **Legacy upgrade removal** — delete `WorkflowLegacyReminderUpgradeInstrumentedTest.java`; edit `scripts/test-installed-upgrade.ts` (38, 117), `test/installed-upgrade-runner.test.mjs` (77 and fake runner), `scripts/android-instrumentation.ts` registry; drop `legacyAlarm` fixture key in `WorkflowPhoneNativeInstrumentedTest:90,95` and the comment at `NativeDigestSources.java:79`. Coordinate with the wider A1 upgrade-suite deletion (ReminderUpgrade, CalendarUpgrade, KeptCaptureLegacyPath, StorageLegacyAccess — other chunks).
6. **Registry hygiene** — deleting VoiceFloatPathDiagnostic / VoiceWorkerSettlement / WorkflowLegacyReminderUpgrade requires removing their keys from `scripts/android-instrumentation.ts` (`NOT_RUN_BY_A_RUNNER`, registry) in the same commit or `test/android-instrumentation-runner.test.mjs` fails.
7. **VoiceWorkerSettlement upstream move** — PR to `vendor/eliza` speech-bridge tests, advance submodule + `upstream.lock.json`, then delete here.
8. **Shared constants** — `AlphaVoiceCloudPlugin` capture prefix, `"cloud:production"`/`"remote:"` slot names (C6, cross-chunk with main sources), `BuildConfig.APPLICATION_ID` for `APP`.

## Text/path pins
- `scripts/android-instrumentation.ts`: registry keys `Video` (287), `VoiceWorkerSettlement` (288), `VoiceNoteReadAloud` (260), campaign strings for `VoicePermissionDenied`, `VoicePermissionRevoke`, `WorkflowNoticeProcessDeath` (291), `WorkflowApprovalNoticeProcessDeath` (292, names `WorkflowNoticeProcessRunner`), `WorkflowLegacyReminderUpgrade`; `NOT_RUN_BY_A_RUNNER.VoiceFloatPathDiagnostic` (342). Cross-checked by `test/android-instrumentation-runner.test.mjs` (also pins class names at 217).
- `scripts/test-native-permissions.ts:69,77` (VoicePermissionDenied/Revoke class names); `test/native-permission-runner.test.mjs:91,99`; `test/fixtures/isolated-native-campaign.mjs:18,53`.
- `scripts/android-workflow-native.ts:16,88-106` (class + method names for WorkflowPhoneNative, WorkflowDraftNative, WorkflowApprovalNotice, WorkflowApprovalNoticeProcessDeath; runner pair); `test/native-campaign-evidence.test.mjs:5,38,48-49,70-71,93,123,158`.
- `scripts/ci/pending-recovery-ui.py:24-25,33,80,96` (WorkflowNoticeTap/WorkflowNoticeProcessDeath phases, method names, result key `workflowApprovalProcessDeath`, runner); `scripts/ci/test-pending-recovery-phases.py:28,36,59,64,76,79,85,121`.
- `scripts/test-installed-upgrade.ts:38,64,117`; `test/installed-upgrade-runner.test.mjs:35,61,77`.
- `WorkflowNoticeProcessRunner`: `android/app/src/androidTest/AndroidManifest.xml:4-6` (`:workflowNoticeTest` process), `scripts/native-test-fixture.ts:154`, `scripts/test-calendar-regression.ts:107`.
- Runtime args pinned by runners: `voicePermissionDenied`, `voiceRevokePhase`, `voiceRevokeRunId`, `workflowApprovalNotice`, `workflowApprovalNoticeProcessDeath`, `workflowNoticeProcessDeath` (`1`/`approval`), `workflowOwnerPhase=prepare`, `workflowNoticeTap`, `workflowDraftNative`, `workflowPhoneNative`, `workflowPhoneDenied`, `reminderUpgrade=verify`, `localSpeech`.
- Files pinned on disk by runners: `voice-revoke/recording.json` marker and its keys; SharedPreferences `workflow-owner-restore-fixture` keys across prepare/run processes.
- No specs/quint manifest, `test/support/feature-parity.mjs` or `LemmaScript-files.txt` references to any file in this chunk.

## New patterns
- **NEW-a: Dual-build fork inside each test** — the same "test-mocks → `AppNavigation.liveMode()`; flag-off → intercept activity / inject account fixture / drive production sign-in, then clean the fixture credential" branch is re-implemented per class (VideoInstrumentedTest:60-77, VoicePermissionDeniedInstrumentedTest:53-61,120-129). Treatment: one `SignedInScope` AutoCloseable in androidTest that picks the mechanism per build and owns cleanup.
- **NEW-b: Instrumentation result bundles with no reader** (subtype of B5 specific to `InstrumentationRegistry.addResults`) — 4 of the 5 result keys written in this chunk are never parsed. Treatment: delete unless a runner parses the key; grep `INSTRUMENTATION_RESULT: <key>` to verify.

## Owner questions
1. Is there any install base of the pre-rename package whose reminders could reach this APK? If not, delete `WorkflowLegacyReminderUpgradeInstrumentedTest` and its `legacy-digest` companion with the rest of the A1 upgrade suite.
2. May `VoiceWorkerSettlementInstrumentedTest` move upstream (speech-bridge tests) and be deleted here, accepting a short coverage gap until the submodule advances?
3. Merge the two approval-process-death tests (keep `WorkflowApprovalNoticeProcessDeathInstrumentedTest`, drop the `pending-recovery-ui.py` `workflow-approval-process-death` phase)?
4. Is the `WorkerCrashDiagnostic` tombstone/seccomp parser still used to investigate resident worker crashes, or can it shrink to `ApplicationExitInfo` reason/status (or go entirely)?
5. The workflow owner fixture restores a `remote:<origin>` paired session; if research P15 (remove paired/hosted agents) proceeds, which connection kind should these notice-owner tests restore instead?
6. Are `note-read-aloud.json` / local-speech evidence files collected by any manual device campaign? If not, drop the evidence writes.
