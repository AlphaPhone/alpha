# Chunk test-40: native-*, navigation-voice*, node-test-runner, note*/notes* host tests

43 files reviewed, 43 reports in `files/test/`. Abbreviations: android-jvm = `test/integration/android-jvm.test.mjs`
(one host-JVM suite running committed fixture mains via `test/fixtures/jvm-tools.mjs`); campaigns =
`test/tooling/native-campaigns.test.ts`.

| File | Kind | Verdict | Target |
|---|---|---|---|
| native-google-agent-host | integration (product Google host, real HTTP) | KEEP, MERGE | `test/integration/native-google-host.test.mjs` |
| native-google-fetch-input | unit of upstream port via test-support config copy | MERGE 1 case, DELETE rest | native-google-host |
| native-google-port-capability | transplant | DELETE | - |
| native-live-pcm | JVM (2 upstream, 1 Alpha) | DELETE 2, MERGE 1 | android-jvm |
| native-live-start-cancellation | unit of upstream voice module | DELETE | - |
| native-navigation-client-header | JVM transplant | REWRITE after extracting header copy | android-jvm |
| native-network-lifecycle | transplant of connection-ui | DELETE | journey connection-cloud |
| native-network | unit, real import | MERGE | `test/integration/connection-cloud.test.ts` |
| native-notification-device-slot | JVM integration | KEEP, MERGE | android-jvm |
| native-notification-diagnostics | JVM real class + sliced method | MERGE half, DELETE half | android-jvm |
| native-notification-session | JVM integration | KEEP, MERGE | android-jvm |
| native-patch-admission | tooling of dormant patch engine | DELETE most, MERGE 3 cases | `test/tooling/android-build.test.mjs` |
| native-permission-runner | tooling (fake device) | MERGE | campaigns |
| native-plugin-teardown | source-text scanner (376 lines) | DELETE (keep last JVM case) | android-jvm |
| native-popover-back | transplant | DELETE | `journeys/home-shell.spec.ts` |
| native-read-epoch | JVM of dead class + upstream transplant | DELETE | - |
| native-reading-voice-profile | transplant + source-text | DELETE | - |
| native-recovery-admission-order | transplant, legacy saved sign-in (U-A8) | DELETE | - |
| native-reminder-recovery-runner | tooling | MERGE | campaigns |
| native-reminder-runner | tooling | MERGE | campaigns |
| native-request-cancel | renderer integration + JVM transplant | MERGE 2, DELETE 2 | `test/integration/resident-runtime.test.ts` |
| native-resident-capture | unit of upstream voice module | DELETE | - |
| native-resident-request-deadline | JVM transplant | DELETE now, REWRITE after plugin split | android-jvm |
| native-restart-runner | tooling | MERGE, drop `notes-secure-migration` | campaigns |
| native-runtime-identity-boot | JVM transplant of mostly upstream code | DELETE | - |
| native-secure-slots | source-text slot scanner | REWRITE (JVM with imported slot names); MERGE journal case | android-jvm; `test/integration/inbox.test.ts` |
| native-start-cancel | renderer integration (bundled local-agent.ts) | MERGE | resident-runtime |
| native-stream-admission | JVM transplant | DELETE now, REWRITE after plugin split | android-jvm |
| native-view-fallback-installation | transplant of upstream | DELETE | - |
| native-view-host-integration | upstream-only integration | DELETE | - |
| native-voice-event-worker | transplant + real JVM class | DELETE 1, MERGE 1 | android-jvm |
| native-voice-latency | tooling (release evidence aggregator) | KEEP trimmed, MOVE | `test/tooling/voice-latency.test.ts` |
| native-voice-listener-rules | source-text | DELETE | - |
| native-webview-admission | tooling | MERGE | campaigns |
| navigation-voice-pause | transplant of 5 files | REWRITE | `journeys/maps.spec.ts` |
| navigation-voice | transplant (subset of above) | DELETE | - |
| node-test-runner | tests the test runner | DELETE | - |
| note-origin | unit, real imports (+1 legacy transplant) | MERGE most, DELETE legacy and Maps cases | `test/integration/notes.test.ts`, `test/integration/calendar.test.ts` |
| note-recorder-permission-recovery | transplant | DELETE | - |
| note-source-references | source-text | DELETE | - |
| notes-capacity-fixture | tests a test fixture | DELETE | - |
| notes-deletion-lease | JVM real class + source-text | MERGE 1, DELETE 2 | android-jvm |
| notes-empty-close | transplant of model.js + 1 real import | DELETE 5, MERGE 1 | `journeys/notes.spec.ts`, notes integration |

Counts: KEEP/MERGE/MOVE (whole or partial survival) 22, DELETE 21 (whole file); of the survivors 5 are REWRITE.

## Corrections to `research/tests-host.md`
- `native-plugin-teardown`: listed as "D+A, keep". It is almost entirely source text (self-described "Source-shape
  guard"); only its last case runs the JVM.
- `native-start-cancel`, `native-request-cancel` renderer half: listed as C (transplant). They bundle the real
  `local-agent.ts` with only Capacitor stubbed; that is a reasonable integration and is kept.
- `native-read-epoch`: the Alpha class `NativeReadEpoch.java` has no product caller (A7); only Quint references it.
- `native-recovery-admission-order`: covers U-A8 (legacy Cloud sign-in restore), which is being deleted.
- `native-restart-runner`: the `notes-secure-migration` kind is a legacy-layout migration (D1).
- `native-live-start-cancellation`, `native-resident-capture`, `native-view-*`: test upstream code only (T5), not
  Alpha "resident-runtime".

## Behaviours that lose all host coverage if the DELETEs land without replacements
1. Native header authority on forwarded requests (client id kept, `Authorization` not taken from the caller, trace id
   only on bound voice turns): `native-navigation-client-header`. Needs the REWRITE.
2. Request deadline budget across queue/enrollment and chat-stream reserved-id/two-slot cap:
   `native-resident-request-deadline`, `native-stream-admission`. Stream cap partly in Quint bridge model; deadline nowhere.
3. Renderer secure slot ↔ native allow-list agreement (the note-origins regression): `native-secure-slots`. Rewrite must
   land in the same change as the delete.
4. Late Capacitor call after activity destroy does not crash (executor / launcher): `native-plugin-teardown`. Only
   structural fix or a release lint keeps it.
5. Navigation guidance while screen is off, provider-restricted guidance never synthesised, account change drops owed
   guidance: `navigation-voice-pause` until `journeys/maps.spec.ts` exists.
6. New blank note discarded on Back/Home, cleared note survives: `notes-empty-close` until `journeys/notes.spec.ts`.
7. Busy speaker refuses browser reading before consuming its approval: `native-voice-listener-rules` (no replacement
   proposed unless the owner wants the journey case).
8. Native notification retry vs stop on authority failure (`fail` slice in `native-notification-diagnostics`).
9. Native Google sign-in never exposes a browser commit receipt method (`native-google-port-capability`); goes away by
   construction with the B2 typed-port fix.
10. Renderer/native Notes deletion lease length agreement (`notes-deletion-lease` test 3).

## Shared helpers worth keeping
- `test/fixtures/jvm-tools.mjs` (`runJvm`, `nativeSource`, `fixture`, `jsonJar`): the base of android-jvm.
- `test/fixtures/isolated-native-campaign.mjs`: fake SDK/device for every campaign runner test; survives in campaigns.
- `test/fixtures/native-source.mjs`: 10 importers; survives.
- `test/support/managed-google-agent.mjs`: keep only `startNativeGoogleAgentHost`; its `createNativeGoogleCloudPort`
  re-declares product config (C6) and should go once fetch-input/agent-host merge.
- One esbuild "bundle `local-agent.ts` with a Capacitor stub" loader for resident-runtime (now duplicated in two files).
- Java fixtures that survive: `NativeVoiceBindingTest`, `NativeNotificationSessionTest`, `NotesDeletionLeaseTest`,
  `ReviewedCopiesTest`. Delete: `NativeReadEpochTest`, `NotesCapacityFixtureTest`, `ResidentRequestDeadlineTest`.

## Cross-file actions
- Extract from `AlphaLocalAgentPlugin.java` (plugin split, Stage F): `NativeForwardHeaders.copy(...)` (dedupes the
  raw/stream loops) and a `LocalAgentRequests` class (deadline, admission, withdrawal, stream cap). Then rewrite
  client-header, request-deadline and stream-admission as android-jvm cases.
- Delete `NativeReadEpoch.java` with `specs/quint/native/manifest.json:442`, `specs/quint/refinement/native/index.mjs:116`
  and `ComponentTraces.java` usage updated so Quint stays green.
- Delete `scripts/test-android-notification-device-slot.ts` (no caller) and the `ALPHA_NOTIFICATION_HOST_SOURCE` knob.
- Remove `notes-secure-migration` from `scripts/test-native-restart.ts`, `scripts/android-instrumentation.ts:248` and
  `NotesSecureStorageInstrumentedTest.secureMigrationProcessRestartPhase` (D1).
- Delete `native-recovery-admission-order` in the U-A8 change.
- Delete the dormant patch engine in `scripts/prepare-patched-native.ts` together with `native-patch-admission` and
  `resident-native-patch-admission` patch cases.
- `note-origin.ts`: remove the older-link title drop and whole-record revision fallback (D1) with their assertions.
- `run-node-tests.ts`: register `tsx` once so tests stop re-spawning themselves under `--import tsx`.
- Upstream follow-ups (D14): live PCM pipe/IPC exchange, native live voice abort, view installation registry, view
  interaction host, boot-state projection, photo publication fences, voice latency probe, speech bridge busy rule,
  managed Google host/port unit cases.

## Owner questions
1. Keep a small release lint for "plugin executor hand-offs only via `PluginWorkers.submit`, launches only via
   `LateLaunch.ask`", or rely on review and emulator destroy/recreate runs?
2. May `scripts/native-voice-latency.ts` drop parsing of the legacy v2 timing export?
3. Should the busy-speaker/browser-reading rule get a journey case, or is its loss acceptable?
4. Is renderer/native deletion lease length drift worth one cross-language check, given "no tests of constants"?
