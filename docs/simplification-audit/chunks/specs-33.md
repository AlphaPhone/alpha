# Chunk specs-33: Quint refinement core libraries, composition, legacy and native drivers (A–Ca)

23 files reviewed, 23 reports under `docs/simplification-audit/files/specs/quint/refinement/`.

| File | Kind | Verdict | Target / note |
|---|---|---|---|
| `assistant-model-traces.mjs` | ITF trace replay library (8 importers) | KEEP, SIMPLIFY | Rename `itf-replay.mjs`; parse `step`/`run` from the Quint AST, not regexes; share the Quint CLI/seed helper |
| `campaigns.mjs` | campaign aggregator | KEEP | Single aggregator once `legacy/index.mjs` goes; one adapter result shape |
| `check-traces.mjs` | core refinement checker + receipts (273 spec / 28 test importers) | KEEP core, SIMPLIFY | Stop hashing all ~380 models per receipt; drop `legacy` family; manifest lookup from `quint-lib.ts`; snapshot store optional/nightly |
| `model-state.mjs` | Quint AST state inventory | KEEP | Format; expose parser for `itf-replay.mjs` |
| `composition/README.md` | doc | KEEP (rewrite) | Remove ControllerComposition text |
| `composition/controllers.mjs` | browser refinement harness | DELETE | Drives deleted `calendar-sync-host.ts`/`google-calendar-selection.ts` (D4); carry 3 voice schedules to `composition/index.mjs` or `journeys/voice.spec.ts`; delete ControllerComposition model |
| `composition/index.mjs` | browser refinement harness (real `connectionController`) | KEEP, SIMPLIFY | Drop controllers; narrow inputs; run in one lane only |
| `composition/ports.mjs` | harness fixture | DELETE | Only importer is `controllers.mjs` |
| `legacy/calendar-navigation.md` | doc | DELETE | Historical |
| `legacy/calendar-navigation.mjs` | historical comparison harness | DELETE | Carry 3 navigation cases to `journeys/calendar.spec.ts` |
| `legacy/camera-session.md` | doc | DELETE | Historical |
| `legacy/camera-session.mjs` | historical comparison harness | DELETE | Verify `CameraPreviewRetirement` + `camera-controls.spec.ts` cover grace/late-stream |
| `legacy/index.mjs` | legacy family aggregator | DELETE | Whole legacy family (D11), after moving `deferred`/`tick`, `CoreTaskScheduler.qnt`, `formal-source-inventory` users |
| `native/ActionRecoveryTraces.java` | JVM refinement driver | KEEP | Drop 3 legacy-row scenarios if D1 confirms writer always stores `enrollmentId` |
| `native/AppInfoHandoffProbe.java` | JVM probe (used by application composition) | KEEP or MERGE | Into `AppInfoHandoffTraces.java` as `probe` mode |
| `native/AppInfoHandoffTraces.java` | JVM refinement driver | KEEP | — |
| `native/AsrPipeFailureProbe.java` | orphan probe | DELETE | No reference; covered by `AsrPipeTraces` `rejected-*` |
| `native/AsrPipeTraces.java` | JVM refinement driver (upstream `LiveSegmentPipe`) | KEEP | Share per-scenario JVM runner |
| `native/AssistantEntryTraces.java` | JVM refinement driver | KEEP (D7) | PORT the `beforeBridgeReentry` text splice; owner question on dead `launchSurface` |
| `native/BrowserUnderlayTraces.kt.txt` | Kotlin template for text-sliced upstream code | PORT | Compile real `BelowHostLayer.kt` against `android.view` stubs; no anchors |
| `native/CalendarSyncEnableTraces.java` | JVM refinement driver | KEEP (D18) | Move `CalendarSyncSnapshotTest.Provider` out of the unit-test fixture first |
| `native/CanonicalTapTraces.java` | JVM refinement driver | KEEP | Platform text rewriting lives in `canonical-tap-platform.mjs` (other chunk) |
| `native/CaptureFrameTraces.java` | JVM refinement driver (upstream `LiveVoiceCapture`) | KEEP | Delete dead `probe-cleanup` mode |

## Coverage that would be lost by the DELETEs

- **Voice retirement on identity change and visibility through the real controller** (`controllers.mjs` schedules `voice-open-signin`, `voice-pending-replacement`, `voice-hidden`). No other test drives `VoiceAssistantSession` + `connectionController` together. Needs the cases moved into the ApplicationComposition campaign (it imports `VoiceSession`) or `journeys/voice.spec.ts`.
- **Calendar editor navigation**: Back from a dirty new event offers "Resume event draft"; Back from editing returns to the same event; Back closes Month (`legacy/calendar-navigation.mjs`). `git grep "Resume event draft" test/browser` finds nothing. Needs `journeys/calendar.spec.ts` cases.
- **Camera conversation-cover grace and scan review over a ready camera** (`legacy/camera-session.mjs`): probably covered by live `CameraPreviewRetirement` and `test/browser/camera-controls.spec.ts`; verify before deleting.
- Account replacement while a client-side Calendar write is in flight: intentionally lost with the deleted stack (D4); the agent-side path has its own models.

## Shared helpers worth keeping

- `check-traces.mjs` core (`qset`, `qmap`, `literal`, `checkTraces`), `assistant-model-traces.mjs` (`plain`, `modelTraces`, `replayTraces`), `model-state.mjs`, `campaigns.mjs`.
- `native/java.mjs` `javaTraceCampaign` (one JVM per argument set) should replace the duplicated "campaign" JVM-spawn loops in `AsrPipeTraces.java` and `CaptureFrameTraces.java`.
- `legacy/camera-session.mjs` `installMediaPort` (synthetic canvas `getUserMedia`) is a useful Playwright helper if the camera journey lacks one.

## Cross-file actions

1. Delete `composition/controllers.mjs`, `composition/ports.mjs`, `specs/quint/native/ControllerComposition.qnt` + manifest entry (`native/manifest.json:1338`); update `composition/index.mjs`, `composition/README.md`, `test/quint-composition-refinement.test.mjs` (asserts 2 receipts / 9 traces / 44 checkpoints). Check whether `services/CalendarLinkedSync.qnt` has other importers before retiring it.
2. Retire the legacy family: move `deferred`/`tick` from `specs/quint/legacy/core/source-support.mjs` to `specs/quint/refinement/support.mjs`; move or delete `CoreTaskScheduler.qnt` (read by `services/task-scheduler/index.mjs:7`); resolve `native/{mms,sms}-dispatch.mjs` use of `legacy/core/formal-source-inventory.mjs`; then delete `refinement/legacy/**`, `specs/quint/legacy/**`, `test/quint-historical-*.test.mjs`, `test/quint-legacy-campaign-report.test.mjs`, the `legacy` entry in `scripts/check-quint-refinement.ts:67`, and `'legacy'` in `check-traces.mjs` (3 loops) and `scripts/quint-lib.ts`.
3. `check-traces.mjs`: hash only the checked model + declared sources; if the receipt-staleness report is dropped, delete `retainGeneratedSource`/`verifyRefinementReceiptInputs` and their assertions in ~20 tests plus `check-quint-refinement.ts:177`.
4. One Quint CLI helper + seed constant shared by `check-traces.mjs` and `assistant-model-traces.mjs`; rename the latter `itf-replay.mjs` (8 importers).
5. Before deleting `test/fixtures/CalendarSyncSnapshotTest.java` as a unit test, move its `Provider` into the native refinement fixtures (`CalendarSyncEnableTraces.java:29`).
6. Delete `native/AsrPipeFailureProbe.java`; delete `probe-cleanup` in `CaptureFrameTraces.java`.
7. PORT `BrowserUnderlayTraces.kt.txt` + `browser-underlay.mjs` to compile the real upstream `BelowHostLayer.kt` (possible upstream follow-up, D14); PORT the `MainActivity` text splice in `assistant-entry-platform.mjs:125`.
8. Run the composition campaign in one CI lane only (now in both `npm test` and `browser.yml` production job).

## Owner questions

- `ActionRecoveryTraces` replays journal rows without `enrollmentId`/attempt id (`legacy-missing-binding-*`, `reminder-legacy-no-attempt`). Can the current native writer still produce such rows on the renamed package? If not (D1), delete the scenarios and the model's `initWithMetadata`.
- `AlphaLocalAgentPlugin.launchSurface`/`takeInvocation` have no renderer caller (only `AssistantInstrumentedTest`); invocations go through `Sense.takeInvocation`. Are they dead (delete with the `readSurface` steps of `AssistantEntryTraces`), or does an upstream client call `Agent.launchSurface`?
- Should the three ControllerComposition voice schedules stay as formal refinement (moved into ApplicationComposition) or become plain Playwright voice-journey cases?
- Keep the receipt input-hash / snapshot provenance (nightly report) or drop it entirely?
