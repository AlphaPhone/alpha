# Chunk specs-35: native refinement harnesses (Java), HomeInstanceHandoff … MmsDispatch

20 files under `specs/quint/refinement/native/`. All compile real product or vendored-upstream Java with `javac`
against Android/Capacitor stubs and compare observations with a live Quint model (binding style 5 in
`research/ci-and-formal.md` §8). No model here covers a deleted feature; hosted results are driven only in
`resident` mode, which D5 keeps; the listener/sense harnesses cover always-on listening, which D7 keeps.

| File | Kind | Verdict | Target / note |
|---|---|---|---|
| HomeInstanceHandoffReplay.java | ITF replay, `MainActivity` | KEEP, PORT later | read a package-private view of the extracted `HomeInstanceHandoff` instead of private statics |
| HostedInboxTraces.java | refinement, hosted inbox (resident) | KEEP | drop `HostedTransport` from compiled list when C4 lands; follow `HostedDeliveryCancelled` merge |
| HostedResultNoticeTraces.java | refinement, notice ledger + bridge | KEEP; driver PORT | compile the whole `AlphaHostedResultsPlugin.java` against Capacitor stubs, no 11-anchor slicing |
| IndicatorProviderProbe.java | race regression (upstream) | KEEP | share generation helper; upstream candidate with its patch |
| IndicatorProviderTraces.java | refinement (upstream sense) | KEEP | `javaTraceCampaign` instead of self-spawn; gate on upstream |
| JournalTraces.java | refinement, 3 upstream components | KEEP, SIMPLIFY | split per model; observe instead of fabricated steps; fix manifest sources |
| KeyboardDictationCloudTraces.java | refinement | KEEP | — |
| KeyboardDictationTraces.java | refinement | KEEP | delete the javac unit twin in `test/` |
| ListenerAdmissionProbe.java | probe | DELETE | covered by `ListenerServiceTraces` `marker-write-failure` |
| ListenerInputPorts.java | support port | KEEP | hook instead of stub string edits |
| ListenerInputTraces.java | refinement (upstream sense) | KEEP | — |
| ListenerServiceProbe.java | probe | DELETE | covered by `ListenerServiceTraces` `release-failure`/`both-failure` |
| ListenerServiceTraces.java | refinement (upstream sense) | KEEP | `javaTraceCampaign` |
| ListenerStoreTraces.java | refinement (upstream sense) | KEEP | `javaTraceCampaign` for scenarios; keep restart child JVM |
| LiveCapturePorts.java | support port | KEEP | — |
| LiveCaptureProbe.java | probe | DELETE | unused (`probeLiveCapture` has no caller) |
| LiveCaptureTraces.java | refinement (upstream voice) | KEEP | remove JDK-internal `Executors` field read |
| MainActivityPorts.java | shared support port | KEEP | 6 driver importers |
| MainActivityRecoveryTraces.java | refinement, `MainActivity` recovery | KEEP, PORT with the split | private-name reflection blocks the MainActivity split |
| MmsDispatchTraces.java | refinement, product + upstream telephony | KEEP; driver PORT | stop member slicing; delete the historical probe (legacy dependency) |

Totals: 17 KEEP (4 with PORT/SIMPLIFY), 3 DELETE, 0 MERGE/REWRITE.

## Behaviours that would lose all coverage if the DELETEs happen
None. All three probes are subsets of campaigns that refine the same fields against the model
(`NativeListenerService.qnt` `markerWriteFailed`/`destroy`; `NativeLiveCapture` `permission-call`/`opening-call`).
`LiveCaptureProbe` is not run by anything today. Deleting the MMS `historicalProbe` (MmsDispatchTraces #2) only removes
the demonstration that an old upstream revision had the bug, which is not product behaviour.

## Shared helpers worth keeping or adding
- `java.mjs` `javaTraceCampaign`: should be the only campaign launcher. Five harnesses here
  (`IndicatorProviderTraces`, `ListenerServiceTraces`, `ListenerStoreTraces`, `LiveCaptureTraces`,
  `MainActivityRecoveryTraces`) re-spawn themselves with `ProcessBuilder` in a `campaign` branch. Add a `jvmOptions`
  argument (needed for `--add-opens`) and delete those branches.
- `Trace.java`: add `readStatic(Class,String)` and `captured(Object,Class)` and delete the local copies
  (`staticField`/`field`/`activityField`, `generation`/`capturedGeneration`, `captured` in three files).
- `MainActivityPorts.java`, `LiveCapturePorts.java`, `ListenerInputPorts.java`: keep.
- Stub sources written as JS strings inside drivers (`hosted-inbox.mjs`, `hosted-result-notices.mjs`,
  `*-platform.mjs`) would be easier to maintain as `.java` files under one `stubs/` tree, with one Capacitor stub set
  shared by the hosted-results and SMS/MMS harnesses.

## Cross-file actions
1. Delete `ListenerAdmissionProbe.java`, `listener-admission-probe.mjs`, `ListenerServiceProbe.java`,
   `probeListenerService` (in `listener-service.mjs`) and tests 2–3 of `test/quint-listener-service.test.mjs`.
2. Delete `LiveCaptureProbe.java` and `probeLiveCapture` (in `live-capture.mjs`).
3. MMS: delete `historicalProbe`/`mmsSourceProbe`, `mms-historical-sources.json` and test 2 of
   `test/quint-native-mms-dispatch.test.mjs`. This removes one of the live imports of
   `specs/quint/legacy/core/formal-source-inventory.mjs` (with `sms-dispatch.mjs`, which another chunk reviews). Move
   the launcher-manifest receiver rule to `scripts/verify-apks.ts`.
4. `hosted-result-notices.mjs`: replace `bridgeSource` slicing with full-plugin compilation (T10 port).
5. MainActivity split (product D1): change `HomeInstanceHandoffReplay`, `MainActivityRecoveryTraces`,
   `RendererBackgroundRebuildReplay` (another chunk) and `main-activity-platform.mjs` in the same commit. Expose
   package-private read views and the escape-button label constants.
6. C4 (hosted/paired deletion): remove `HostedTransport.java` from `hosted-inbox.mjs`'s compiled list. The
   `HostedDeliveryCancelled`/`HostedStorageFault` merge renames the catch clauses in `HostedInboxTraces`.
7. Manifest: `VoiceIpcAssembly` and `DeviceActions` entries should list the upstream files `JournalTraces` actually
   executes (`BufferedStreamExchange.java`, `SmsSendJournal.java`). Without them, change detection misses those files.
8. Host tests duplicated by these harnesses (owned by the tests-host chunks): `test/keyboard-dictation.test.mjs` +
   `test/fixtures/KeyboardDictationPolicyTest.java`, `test/hosted-result-notices.test.mjs` + `HostedResultNoticesTest.java`,
   `test/hosted-notice-withdraw.test.mjs` + `HostedNoticeWithdrawTest.java`. Test 3 of
   `test/quint-indicator-provider.test.mjs` is source text (T1).
9. CI (P1/P6): the listener, indicator, live-capture and journal harnesses run only vendored upstream code. Their lane
   should trigger on `upstream.lock.json`, `android/upstream-native-sources.json`, `patches/eliza/**`, `android/sense/**`,
   their model and this directory, not on every PR. Each per-model harness also runs twice, once from
   `test/quint-<x>.test.mjs` and again from `test/quint-native-refinement.test.mjs`. Keep one of the two (T4).

## Owner questions
- `JournalTraces` `DeviceActions` projection re-runs `SmsSendJournal`, which `NativeSmsDispatch` already executes end to
  end. Should the `DeviceActions-native` refinement be retired?
- `MainActivityRecoveryTraces` hand-off scenarios refine `RendererRecovery`'s hand-off fields, and
  `HomeInstanceHandoffReplay` refines the same code. Can `RendererRecovery.qnt` drop its hand-off projection?
- The sense/listener/indicator/live-capture models describe vendored upstream code plus local patches
  (`indicator-provider-generation.patch`). AGENTS.md puts shared behaviour upstream. Should these models and harnesses
  move to `vendor/eliza` upstream, rather than only being gated on pin bumps here?
