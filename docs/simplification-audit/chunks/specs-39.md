# Chunk specs-39: native Quint refinement drivers and fixtures (credential … maps-location)

35 files under `specs/quint/refinement/native/`: JS drivers that compile real product/upstream Java with `javac` (via
`java.mjs`) or bundle real TS with esbuild, fixture builders that emit Android/Capacitor stubs, shared engines, the
native aggregate, and one doc. Every model they feed is live (`specs/quint/native/manifest.json`, plus
`NativeCredentialMutation` in the services manifest). No file covers only a deleted feature. All product files they
compile still exist in the worktree (checked by name).

| File | Kind | Model(s) | Verdict | Target / note |
|---|---|---|---|---|
| credential-coordinator-platform.mjs | fixture (stubs + 13 unchecked `.replace` seams on resident stubs) | NativeCredentialMutation, ResidentRuntime | KEEP (SIMPLIFY) | stub files; asserting seams; drop unused imports |
| credential-coordinator.mjs | driver, whole real plugins | NativeCredentialMutation, ResidentRuntime | KEEP | **needs own test** (aggregate-only) |
| credential-leases.mjs | driver, upstream-only | NativeCredentialMutation | KEEP | upstream-lock path filter |
| current-sources.mjs | support (source resolver) | – | KEEP (SIMPLIFY) | delete dead aliases; lazy staging; one resolver |
| deletion-coordinator.mjs | driver, whole app + patched upstream | DeletionJournal | KEEP | compile once (now 23×); **needs own test** |
| deletion-platform.mjs | fixture | DeletionJournal | KEEP | stub files |
| deletion-review-admission.mjs | driver, exhaustive | NativeDeletionReviewAdmission | KEEP | – |
| forward-replays.mjs | aggregate adapter | 9 replays | DELETE | each has its own test already |
| gmail-background-platform.mjs | fixture + **slice** of upstream `NativeProviderAdmission` | NativeGmailBackground | PORT | compile the upstream class whole |
| gmail-background.mjs | driver | NativeGmailBackground | KEEP | delete Capacitor/config text asserts (T1) and pin re-verification |
| google-browser-return-claim.md | doc | – | MERGE | into native `README.md` |
| google-browser-return-claim.mjs | driver over text-injected upstream `CloudSignInPlugin` | GoogleBrowserReturnClaim | PORT (upstream follow-up) | executor seams upstream |
| home-instance-handoff.mjs | ITF replay on real MainActivity | HomeInstanceHandoff | KEEP | – |
| hosted-inbox.mjs | driver | NativeHostedInbox | KEEP | drop `HostedTransport` with C4 |
| hosted-result-notices.mjs | driver **slicing** `AlphaHostedResultsPlugin.java` | NativeHostedResultNotices | PORT | compile whole plugin with Capacitor stubs |
| index.mjs | aggregate (20-40 min) | all native | DELETE after extraction | per-model tests for aggregate-only campaigns |
| indicator-provider-platform.mjs | fixture | NativeIndicatorProvider | KEEP | stub files |
| indicator-provider.mjs | driver, upstream+patches | NativeIndicatorProvider | KEEP | – |
| itf-replay.mjs | ITF→JVM replay engine | – | KEEP | becomes shared `refinement/itf.mjs` |
| java.mjs | JVM support | – | KEEP (MERGE lookup) | one JDK/jar locator with `test/fixtures/jvm-tools.mjs` |
| keyboard-dictation-cloud-ports.mjs | fixture | KeyboardDictationCloud | KEEP | stub files |
| keyboard-dictation-cloud.mjs | driver | KeyboardDictationCloud | KEEP | – |
| keyboard-dictation.mjs | driver | KeyboardDictation | KEEP | **needs own test** |
| listener-admission-probe.mjs | regression probe | – | MERGE | into `listener-service.mjs` |
| listener-input-platform.mjs | fixture patching fixture | NativeListenerInput | KEEP (SIMPLIFY) | one sense stub folder |
| listener-input.mjs | driver | NativeListenerInput | KEEP | shared source list |
| listener-service-platform.mjs | fixture | NativeListenerService | KEEP | one sense stub folder |
| listener-service.mjs | driver + probe | NativeListenerService | KEEP | absorbs admission probe |
| listener-store-platform.mjs | fixture | NativeListenerStore | KEEP | one sense stub folder |
| listener-store.mjs | driver | NativeListenerStore | KEEP | – |
| live-capture-platform.mjs | fixture patching fixture | NativeLiveCapture (+piped, frames) | KEEP (SIMPLIFY) | – |
| live-capture.mjs | driver | NativeLiveCapture | KEEP | delete unused `probeLiveCapture` + `LiveCaptureProbe.java` |
| local-agent.mjs | driver importing real `local-agent.ts` | ResidentRuntime | KEEP | build once; **needs own test** |
| main-activity-platform.mjs | fixture (550 lines of stubs; regex reads of two product files) | MainActivity campaigns | KEEP | shared Android stub folder; move `ACTION_SHOW_MAPS` |
| maps-location.mjs | ITF replay importing real `native-location.ts` | NativeMapsLocation | KEEP | match error codes, not copy |

Counts: KEEP 28 (several with SIMPLIFY), PORT 3, MERGE 2, DELETE 2.

## Coverage that would be lost if the DELETEs happen without replacements
Deleting `index.mjs` (with `test/quint-native-refinement.test.mjs`) removes the **only** runner of: `KeyboardDictation`,
`checkCredentialCoordinator` (NativeCredentialMutation + ResidentRuntime native side), `checkDeletionCoordinator`
(DeletionJournal orchestration), `checkResetOrchestration`, `residentLifecycleTraces` (`local-agent.mjs`), `voiceTraces`
(VoiceSession), `checkBrowserUnderlay`, the five `checkTelephony*`, `checkAlwaysOnListenerIndicatorReadback`, and the inline
groups `FinitePolicyTraces`, `ComponentTraces`, `JournalTraces`, `PlaybackTraces`, `ResidentTraces`, `ProducerTraces`.
It also removes the one check that every native manifest model has a passing receipt. Each needs a
`test/quint-<model>.test.mjs` (inline groups moved to driver modules first), and `check-quint.ts` should check that every live
model names a runner. Deleting `forward-replays.mjs` loses nothing: all nine replays have their own tests.

## Shared helpers worth keeping / creating
- `java.mjs` `javaTraceCampaign` (compile once, run N) and `itf-replay.mjs` `replayJava`: keep. Add `writeStubTree`; memoise JDK lookup.
- One JDK/org.json locator (today `java.mjs` and `test/fixtures/jvm-tools.mjs` disagree).
- One ITF module (`plain`/`simulate`/`modelTraces`); ~10 copies of the decoder exist across families.
- `refinement/support.mjs`: `replaceOnce` that asserts one hit, `deferred`, `between`.
- One `currentNativeSource` (delete the `shared-recording.mjs` twin).

## Cross-file actions
1. Move the Java stub strings (credential, deletion, gmail, hosted-inbox, hosted-results, indicator, keyboard-cloud, listener ×3,
   live-capture, main-activity) into committed `stubs/<area>/*.java`, starting with a shared Android base set. Fixtures that
   text-patch other fixtures (`credential-coordinator-platform`, `listener-input-platform`, `live-capture-platform`) take
   behaviour flags from port classes instead.
2. T10 ports: `hosted-result-notices.mjs` (whole plugin), `gmail-background-platform.mjs` (whole upstream class),
   `main-activity-platform.mjs` (`ACTION_SHOW_MAPS` into `NavigationOpenRequest`), `google-browser-return-claim.mjs`
   (upstream executor seams, D14 follow-up). `maps-location.mjs` should match error codes, which needs typed errors exported
   from `apps/app/src/maps/native-location.ts`.
3. Follow product deletions: drop `HostedTransport`/`CloudDeployment` from compile lists when C4 lands (hosted-inbox,
   keyboard-dictation-cloud, gmail); drop `NativeReadEpoch` from `ComponentTraces`; rename the legacy message in the
   `CalendarDeletionIdentity` stub with C2.
4. Delete T1/B5 checks inside drivers: Capacitor `Bridge.java` regexes and `consumer-host.json` deepEqual
   (gmail-background), pin-hash re-verification (gmail, hosted-inbox, hosted-result-notices), aggregate obligation prose.
5. Path filters: upstream-only campaigns (credential-leases, indicator-provider, listener-*, live-capture, most inline groups)
   run only when `upstream.lock.json`, `android/upstream-native-sources.json`, `patches/eliza/**`, the model or this folder change.

## Owner questions
- Does anything consume the receipts under `test-results/quint-refinement` (driver hashes, assumptions, obligations)? I found
  no consumer in `scripts/` or `.github/`. If nothing does, `captureInputs`, assumption prose and obligations can be deleted from every driver.
- Should "unexecuted model transitions / unobserved fields" (computed in `index.mjs` and only reported) become a failing
  check, or be deleted?
- Should the upstream-only native models (leases, sense listener, VAD, playback, journals, producer) move upstream with
  `vendor/eliza` (D14), or stay here behind an upstream-pin path filter?
