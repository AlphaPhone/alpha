# Chunk specs-40: Quint native refinement harnesses (mms … reviewed-copies)

32 files under `specs/quint/refinement/native/`. Every model these harnesses drive is live (registered in
`specs/quint/native/manifest.json` and run by `native/index.mjs` or `native/forward-replays.mjs`), and all of the
product code they execute still exists after DECISIONS. The one exception is the historical MMS/SMS inventory,
which pins superseded upstream source.

| File | Kind | Verdict | Target / note |
|---|---|---|---|
| mms-dispatch-platform.mjs | platform, slices upstream TelephonyPlugin/MmsStore + rewrites SMS stubs | PORT | compile whole staged classes; shared messages stub set with SMS |
| mms-dispatch.mjs | JVM driver (NativeMmsDispatch) | KEEP, simplify | delete historical probe, manifest regexes, pin re-checks |
| mms-historical-sources.json | historical inventory | DELETE | with SMS/MMS historical probes, tests, `prepare-quint-history.ts` entry |
| native-digest-platform.mjs | platform, slices `HostedDelivery.java` | PORT | extract `NativeSourceWork`/`nativeSource` into its own class |
| native-digest.mjs | JVM driver (NativeDigestConsent) | KEEP | drop pin assertions |
| native-stream-bridge.mjs | MBT replay, real module import | KEEP | reference shape for the others |
| navigation-progress.mjs | esbuild-bundled real Maps modules | KEEP, simplify | shared bundle helper; drop unused hashed files, manifest re-auth, `--observe` |
| navigation-service-platform.mjs | stub set | KEEP → MERGE | shared Android stub library |
| navigation-service.mjs | JVM driver, whole classes | KEEP | — |
| note-bridge-platform.mjs | stub set, unchecked text rewrites of sibling stubs | KEEP, simplify | port hooks; drop Paired* stubs with D5 deletion |
| note-bridge.mjs | JVM driver (NativeNotePermission) | KEEP | delete unused `probeNoteBridge` + `NoteBridgeSourceProbe.java` |
| note-recording-platform.mjs | stub set | KEEP → MERGE | shared Android stub library |
| note-recording-service.mjs | JVM driver | MERGE | into `note-recording.mjs` |
| note-recording.mjs | JVM driver (NativeNoteRecording) | KEEP | `legacy-binding` scenario: owner question |
| on-device-recognizer.mjs | JVM driver, upstream code | KEEP | absorb `recognizerPlatformSources` |
| piped-capture.mjs | JVM driver | KEEP | trim sources |
| recognizer-availability.mjs | JVM driver, upstream code | KEEP | — |
| recognizer-retirement.mjs | upstream unit probe | DELETE | constant moves to on-device-recognizer; delete probe Java + test 2 |
| reminder-delivery-platform.mjs | stub set | KEEP → MERGE | shared Android stub library |
| reminder-delivery.mjs | JVM driver, own javac pipeline | KEEP, simplify | use `javaTraceCampaign`; delete unused env knobs, manifest regex |
| renderer-background-rebuild.mjs | ITF replay on MainActivity | KEEP | — |
| renderer-coordinator.mjs | JVM driver (RendererRecovery) | KEEP, simplify | double `extraSources`; inline export |
| renderer-speech-chunk.mjs | transplant (regex-strip TS + vm) | PORT | `loadBrowserModule('apps/app/src/local-speech-playback.ts')`, timers via globals |
| renderer.mjs | esbuild-bundled VoiceAssistantSession | KEEP, simplify | shared bundle helper; rename `voice-session.mjs` |
| request-withdrawal-platform.mjs | slices `AlphaLocalAgentPlugin.java` (7 anchors) | PORT | extract `LocalAgentRequests` class with ports |
| request-withdrawal.mjs | Java + bundled renderer replay | KEEP, simplify | drop `.qnt` text parsing, canaries, double build |
| reset-orchestration.mjs | JVM driver, ports scraped from `test/reset-startup.test.mjs` | REWRITE port source | own `reset-platform.mjs`; drop summary files |
| resident-coordinator.mjs | JVM driver (ResidentRuntime) | KEEP | compile once; inline export |
| resident-platform.mjs | stub set (38 files) | KEEP → MERGE | port hooks instead of text rewrites |
| resident-scheduling-service-admission.mjs | audit-twin driver, patches product text, mutation canaries | MERGE + PORT | into canonical `ResidentScheduling` campaign; expose `Decision` |
| resident-start-cancel.mjs | ITF replay on AlphaLocalAgentPlugin | KEEP | port hooks |
| reviewed-copies.md | narrative doc | MERGE | into `native/README.md` |

## Behaviours that would lose coverage
- None of the DELETEs removes product-behaviour coverage. `mms-historical-sources.json` and the MMS/SMS
  historical probes only show that the harness catches bugs in old upstream code. `recognizer-retirement.mjs`'s
  three cases are already model-checked scenarios in `on-device-recognizer.mjs`.
- Two things are at risk from moves elsewhere, not from deletions here:
  - `reset-orchestration.mjs` reads its Android ports from the text of `test/reset-startup.test.mjs`. That test's
    report says MERGE into Gradle. If it moves first, the `ResetRecovery` refinement breaks. The ports have to move
    into a harness-owned file before that test changes, or in the same change.
  - `NativeRequestWithdrawal`, `NativeDigestConsent`, `NativeMmsDispatch`/`NativeSmsDispatch` and
    `RendererSpeechChunk` break as soon as `AlphaLocalAgentPlugin`, `HostedDelivery`, upstream `TelephonyPlugin`
    or `local-speech-playback.ts` is reformatted, split or moved. Port them before stage F (Prettier and splits).

## Shared helpers worth keeping or creating
- Keep: `java.mjs` (`javaTraceCampaign`), `itf-replay.mjs` (`modelTraces`, `replayJava`), `current-sources.mjs`
  (`currentNativeSource`, `nativePatchInputs`), `test/fixtures/browser-source.mjs` `loadBrowserModule`. Move the
  last one into `specs/quint/refinement/support/` so formal code stops depending on test fixtures.
- Create:
  - one esbuild `bundleModules(entries)` helper (it replaces the copies in `navigation-progress`, `renderer` and
    `request-withdrawal`)
  - one `writeStubs(files)` temp-dir helper
  - one shared Android/Capacitor stub library, with per-harness static port hooks in place of text rewrites (in
    `note-bridge-platform`, `resident-*`, `mms-dispatch-platform` and `renderer-background-rebuild`)
  - one JVM-tools module that merges `java.mjs` `executable`/`jsonJar` with `test/fixtures/jvm-tools.mjs`
  - shared `flush`/`deferred`.

## Cross-file actions
1. Product extractions needed for the PORTs (Android chunk owners):
   - `AlphaLocalAgentPlugin` → `LocalAgentRequests` (request admission, deadlines, worker, withdrawal, invalidation).
   - `HostedDelivery` → its own class for `NativeSourceWork`/`nativeSource`.
   - `ResidentScheduleRearm` exposes its `Decision`.
   - Upstream `TelephonyPlugin` may need the reviewed-MMS dispatcher split out (D14 follow-up).
2. Delete together:
   - `mms-historical-sources.json`
   - `historicalProbe`/`mmsSourceProbe` in `mms-dispatch.mjs` and `historicalSmsSourceTraces` in `sms-dispatch.mjs`
   - the historical tests in `test/quint-native-mms-dispatch.test.mjs` and `test/quint-native-sms-dispatch.test.mjs`
   - the inventory entry in `scripts/prepare-quint-history.ts`.
3. Delete:
   - `probeNoteBridge` and `NoteBridgeSourceProbe.java`
   - `recognizer-retirement.mjs`, `RecognizerRetirementProbe.java` and test 2 of `test/quint-on-device-recognizer.test.mjs`
   - the mutation canaries in `test/quint-resident-scheduling-admission.test.mjs`
   - the negative-oracle canaries in `request-withdrawal.mjs`.
4. Merge `ResidentSchedulingServiceAdmission.qnt` into `ResidentScheduling.qnt` (§2.11 audit twin). Update
   `manifest.json` and the `test/quint-checker.test.mjs` floors.
5. Delete the in-harness release rules (manifest receiver `exported=false` regexes in `mms-dispatch.mjs` and
   `reminder-delivery.mjs`, and the `consumer-host.json` shape) only after `verify-apks`/the manifest audit enforces them.
6. Follow product deletions:
   - remove the `PairedAgentCredential`/`PairedSpeechContract` stubs (note-bridge) and the cloud/pairing stubs (resident-platform) with D5/C4
   - update `residentSources` and the `renderer-*` source lists when `HostedStorageFault`, `VoiceEventAdmission` and `NavigationOpenRequest` merge (A63).
7. CI: the recognizer, piped-capture and reminder harnesses run upstream code. Path-filter them to
   `upstream.lock.json`, `patches/eliza/**` and `android/upstream-native-sources.json` plus their few product files.

## Owner questions
- `note-recording.mjs` `legacy-binding` / model action `legacyRestart`: should a recording journal without an owner
  binding be treated as legacy data (delete under D1, together with `AlphaNoteRecorder.java:107-110`) or as a
  malformed-journal guard (keep, rename)?
- Should formal harnesses keep checking release properties (unexported receivers, consumer-host module shape), or
  should those checks move only to build-output audits?
