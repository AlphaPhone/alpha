# Chunk specs-38: Quint native refinement harnesses (Update* to crash-journal)

All paths are under `specs/quint/refinement/native/`. Every model here is live: it is registered in
`refinement/native/index.mjs` and its product code still exists after DECISIONS (verified with `test -f` on every
compiled product path). None models deleted code. The three Calendar-sync files stay under D18.

| File | Kind | Verdict | Target / note |
|---|---|---|---|
| UpdateCompositionHarness.java | JVM driver (marker-sliced updater + reflection) | KEEP; PORT | whole extracted `AppUpdater.java`; snapshot accessor |
| UpdateCompositionResidentPort.java | port stub | MERGE | into `test/fixtures/app-update-jvm/.../AlphaLocalAgentPlugin.java` |
| UpdateStagingHarness.java | JVM driver (marker-sliced updater) | KEEP; PORT | `AppUpdater.java`; TS-import manifest parser |
| VoiceDraftTraces.java | JVM driver (whole upstream class) | KEEP | use `javaTraceCampaign` instead of self-spawn |
| WorkflowNoticeTraces.java | JVM driver (whole product classes, assembled bridge) | KEEP; PORT bridge | shared Capacitor/host stubs |
| action-recovery-platform.mjs | platform (head slice of AlphaActionJournalPlugin, ReminderStore slices) | PORT | split plugin into `ActionRecovery.java` |
| action-recovery.mjs | driver | KEEP; SIMPLIFY | drop 3 legacy cases if D1 confirms |
| app-info-handoff-platform.mjs | platform (upstream + Capacitor slices) | KEEP; PORT slices | shared `PluginCall` stub |
| app-info-handoff.mjs | driver + `withAppInfoSource` | KEEP; SIMPLIFY | shared pin helper |
| asr-pipe.mjs | driver (whole upstream class) | KEEP | path-gate on upstream inputs |
| assistant-entry-platform.mjs | platform (AlphaLocalAgentPlugin slices, stub text edits) | PORT | `PowerLaunch.java` from the agent-plugin split |
| assistant-entry.mjs | driver + regex on Capacitor source | KEEP; SIMPLIFY | drop BridgeActivity regexes (T1) |
| batch-capture-completion.mjs | renderer transplant (voice-adapter slice) | PORT + MOVE | export capture factory; application family |
| browser-underlay.mjs | driver (upstream Kotlin slice) | KEEP (path-gated) | upstream follow-up (P6/D14) |
| calendar-sync-enable-platform.mjs | platform (edited stubs, host-test fixtures) | KEEP; SIMPLIFY | checked-in shared ports |
| calendar-sync-enable.mjs | driver + unused CLI | KEEP; SIMPLIFY | delete `--observe` CLI |
| canonical-notification-tap.md | doc | MERGE | into `CanonicalNotificationTap.qnt` header |
| canonical-notification-tap.mjs | driver | KEEP; PORT via platform | |
| canonical-tap-platform.mjs | platform (12 field regexes + region slices) | PORT | `CanonicalTapCustody.java` |
| capture-frames.mjs | driver (whole classes) | KEEP | platform hook for Base64 port |
| clock-review-platform.mjs | platform (tail slice of AlphaActionJournalPlugin) | PORT | `ClockJournalReview.java` |
| clock-review.mjs | driver | KEEP; SIMPLIFY | resolve `legacy-exact-replay` per D1 |
| copy-receipt.mjs | Vite+Chromium driver over real module | KEEP; MOVE; SIMPLIFY | application family; snapshot export; path gate |
| crash-journal-platform.mjs | platform (AlphaDevicePlugin slice + fake update fields) | PORT | `AlphaDiagnostics.java` |
| crash-journal.mjs | driver | KEEP; SIMPLIFY | rename `legacy-bridge` to `foreign-rows` |

## Behaviours that would lose coverage
No file in this chunk is a DELETE, so these campaigns lose no coverage. Ordering risks:
- **App self-update** (download/staging, barrier, durable pause, resident lease, session handoff). These three harnesses
  depend on `test/fixtures/UpdateFlowTest.java`. The `test/app-update.test.mjs` report wrongly calls that fixture
  "used only here". If the fixture is deleted with the host test, update composition and staging lose all coverage.
- **Calendar sync enable consent** depends on `test/fixtures/CalendarSyncSnapshotTest.java` and
  `SqliteCalendarProvider.java`. If those move to a Gradle suite, update `calendar-sync-enable-platform.mjs:211-213`
  in the same change.
- Per-model `test/quint-native-*.test.mjs` wrappers are DELETE (T4). The family aggregate
  `test/quint-native-refinement.test.mjs` must keep running every driver here, including `copy-receipt`,
  `batch-capture-completion` and `browser-underlay` (or their new application-family home).

## Shared helpers worth keeping or creating
- `java.mjs` `javaTraceCampaign` (one JVM per scenario). Replace the self-spawning `campaign` modes in
  `VoiceDraftTraces`, `AsrPipeTraces` and `CaptureFrameTraces` with it.
- New `refinement/native/ports/` (checked-in Java), holding one Capacitor `PluginCall`/`Plugin`/`JSObject` stub set,
  the `AlphaCredentialStore` slot-store port, and the journal-result stubs. Today about 5 variants are spread over
  action-recovery, clock-review, app-info, crash-journal, canonical-tap, workflow-notice and calendar-sync-enable.
- One `assertPinnedUpstream(paths, modules)` helper. It replaces the consumer-host deep-equal, patch-receipt and
  lock-hash blocks repeated in about 8 drivers. Drop the consumer-host assertion (build config, B5).
- One `UpdateHarnessSupport.java` (`Gate`, `require`, `erase`, `staticField`) for the three update harnesses.

## Cross-file actions
1. Split `AlphaActionJournalPlugin.java` at the `clockMain` field into `ActionRecovery` and `ClockJournalReview`.
   `action-recovery-platform` takes the head and `clock-review-platform` takes the tail, so both ports land together.
2. Extract `AppUpdater.java` from `AlphaDevicePlugin.java` and delete `exactUpdateMembers` and the
   `// End of updater methods for host replay.` marker. This touches `update-barrier.mjs`, `update-staging.mjs`,
   `update-composition.mjs`, `UpdateFlowTest.java` and `test/app-update.test.mjs`.
3. Extract `AlphaDiagnostics.java` from `AlphaDevicePlugin.java` (crash journal). Do it together with 2, because
   `handleOnDestroy` couples them.
4. Extract `CanonicalTapCustody.java` from `AlphaCanonicalNotifications.java`. Prettier (D9) blocks on this file
   until then, because the harness regexes need one-line, one-space-indented fields.
5. `PowerLaunch.java` from the `AlphaLocalAgentPlugin` split (D7 keeps it), and `ACTION_SHOW_MAPS` moves to a
   compiled class.
6. Export a capture factory from `voice-adapter.ts` (batch capture) and a session snapshot from `browser-camera.ts`
   (copy receipt). Move both drivers to the application family.
7. A63 merges `WorkflowNoticeTapsFactory`. Update `WorkflowNoticeTraces.java:155`, `workflow-notice-delivery.mjs:21`
   and `hosted-result-notices.mjs:85-89` in the same change.
8. CI path filters. Gate upstream-only models (`browser-underlay`, `asr-pipe`, `voice-draft`, `capture-frames`) on
   `upstream.lock.json`, `patches/eliza/**`, `android/upstream-native-sources.json` and the driver directory. Gate
   `copy-receipt` on Photos renderer files instead of all of `apps/app/src`.

## Owner questions
- `action-recovery.mjs` covers rows without `enrollmentId` or an attempt id (3 cases), and `clock-review.mjs`
  covers `legacy-exact-replay`. Can the current writers still produce these rows? If not, should they be deleted
  under D1, together with their model branches?
- Should `copy-receipt` and `batch-capture-completion` (renderer code) move from the native family to the
  application family, and should `copy-receipt` keep its two mutation canaries (each a full Vite and Chromium run)?
- Should the upstream-only models (`browser-underlay`, and `asr-pipe`/`voice-draft`/`capture-frames` once patches are
  gone) move upstream (D14), or stay here gated on the pin?
