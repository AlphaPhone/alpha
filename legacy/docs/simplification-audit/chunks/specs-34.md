# Chunk specs-34: native Quint refinement Java harnesses (Clock … GoogleBrowserReturnClaim)

All 13 files are Java trace drivers or port classes under `specs/quint/refinement/native/`. They are compiled by
`java.mjs` (`javac` into package `ai.alphacompute.alphaphone`, run with org.json) together with real product or
upstream Java and generated Android/Capacitor stubs. Every model they feed is listed in `specs/quint/native/manifest.json`
(live). None covers only a deleted feature, so there is no DELETE at file level.

| File | Kind | Model(s) | Verdict | Target / note |
|---|---|---|---|---|
| ClockReviewTraces.java | harness, real app classes + **sliced** `AlphaActionJournalPlugin` | NativeClockReview | PORT | Extract Clock bridge members into a whole class (or compile full plugin); rename `legacy` scenario |
| ComponentTraces.java | harness, direct calls | ResetRecovery, SpeechResources, MediaLifecycle, ListenerLeaseRecovery, AlwaysOnListener | KEEP (delete `media()`) | `media()` drives `NativeReadEpoch` (product DELETE, no caller); rest upstream-only → upstream-lock lane |
| CrashJournalTraces.java | harness, **sliced** `AlphaDevicePlugin` + sliced Capacitor `PluginCall` | NativeCrashJournal | PORT | Compile extracted diagnostics class after `AlphaDevicePlugin` SPLIT; shared `PluginCall` stub |
| CredentialCoordinatorPorts.java | port support | – | KEEP | fold duplicate stop body |
| CredentialCoordinatorTraces.java | harness, whole real plugins | NativeCredentialMutation | KEEP | reflection on `AlphaLocalAgentPlugin` privates must move with its split |
| CredentialLeaseTraces.java | harness, upstream-only | NativeCredentialMutation (leases) | KEEP | upstream-lock lane; upstream follow-up |
| CredentialResidentTraces.java | harness, real plugin | ResidentRuntime | KEEP | reformat (mixed indent) |
| DeletionCoordinatorTraces.java | harness, whole real + patched upstream | DeletionJournal | KEEP | driver compiles 24× → use `javaTraceCampaign` |
| DeletionReviewAdmissionTraces.java | harness, exhaustive 81 sequences | NativeDeletionReviewAdmission | KEEP | host test keeps only its race loop |
| DeletionTestPorts.java | port support | – | KEEP | fold reminder reply helpers |
| FinitePolicyTraces.java | harness, finite tables | VadSegmentation, RendererRecovery, ResidentScheduling | KEEP/SIMPLIFY | scheduling table also run by `ResidentScheduleAdmissionTraces` (T4); VAD upstream-only |
| GmailBackgroundTraces.java | harness, whole real Gmail classes; driver slices upstream + regexes Capacitor | NativeGmailBackground | KEEP (PORT driver) | delete Capacitor source regexes; compile `NativeProviderAdmission` whole |
| GoogleBrowserReturnClaimTraces.java | harness over injected slices of patched upstream `CloudSignInPlugin` | GoogleBrowserReturnClaim | PORT (upstream follow-up) | needs observation seams upstream |

## Text pins these harnesses depend on (for the T10 port)
- `clock-review-platform.mjs`: `AlphaActionJournalPlugin.java` regex `^ private static JSONObject read\(`, anchor `' private final android.os.Handler clockMain'` → last `}`, sanity `ClockAgentReview.abandon(this)`.
- `crash-journal-platform.mjs`: `AlphaDevicePlugin.java` `' private final java.util.concurrent.ExecutorService diagnosticsWorker='` → `' /** Non-secret build identity'`; regex `^ @Override protected void handleOnDestroy\(\)\{`; `node_modules/@capacitor/.../PluginCall.java` `'    public String getString(String name)'` → `'    @Nullable\n    public Integer getInt'`.
- `gmail-background-platform.mjs`: upstream `NativeProviderAdmission.java` `' private static String cloudId(Object value)'` → `' private static JSONObject cloudIdentity(JSONObject selected)'`; `gmail-background.mjs` regexes on Capacitor `Bridge.java`/`BridgeActivity.java` (T1).
- `google-browser-return-claim.mjs` + `test/fixtures/google-browser-auth/chain-methods.mjs`: seven method spans of patched upstream `CloudSignInPlugin.java` and five whitespace-exact `replaceOnce` seams.
- Not in this chunk but adjacent: `resident-scheduling-service-admission.mjs` rewrites `ResidentScheduleRearm.java` at the literal `Decision decision=decide(...)` seam.
- Reflection on private field names (rename-sensitive): `ClockAgentReview.open`, `AlphaActionJournalPlugin.worker`, `AlphaDevicePlugin.diagnosticsWorker`, `AlphaLocalAgentPlugin.{accepting,stopping,lifecycleEpoch,credentialMutationEpoch,credentialShutdownRequest,lifecycleLock,ownerToken,startOwnsLaunch,workers,streams}`, `AlphaGmailPlugin.io`, `GmailBackground.{delivery,poster}`, `NativeDeletionCoordinator.instance`, `RendererRecoveryBudget.*`, `DeletionReviewAdmission.state`.

## Behaviours that would lose all coverage if the DELETEs happen
- Only `ComponentTraces.media()` is proposed for deletion. It covers `NativeReadEpoch`, which no product code calls, so
  no product behaviour loses coverage. The MediaLifecycle model's native side would have no Java refinement; if the
  owner wants one, it should target the upstream media plugin's own read epoch.
- Nothing else in this chunk is deleted. These harnesses are the **only** executable coverage of: Clock hand-off review
  and token consumption, problem-log journal faults, credential-mutation shutdown ordering across two plugins, deferred
  deletion exactly-once dispatch, Gmail background delivery/tap custody, and Google browser return claims. Do not let
  host-test deletions elsewhere assume otherwise.

## Shared helpers worth keeping
- `java.mjs` (`javaTraceCampaign` compile-once runner) and `Trace.java`.
- One hand-written `PluginCall`/`Plugin`/`JSObject` stub set and one "port + fault flags + event log" pattern
  (`CredentialCoordinatorPorts`, `DeletionTestPorts`, `ResidentTestPorts`, `ClockReviewSupport`, Gmail `ClosedConnection`):
  consolidate the HTTPS fixture and Capacitor stubs into `refinement/native/support/` when the platform files are
  reviewed.

## Cross-file actions
1. `deletion-coordinator.mjs`: replace per-scenario `javaTraces` with one `javaTraceCampaign` (24 javac runs → 1).
2. Move `FinitePolicyTraces.schedulingTraces()` into the resident scheduling campaign; stop compiling `LiveVadGate`/`RendererRecoveryBudget` there.
3. With the `AlphaDevicePlugin` SPLIT: compile the extracted diagnostics class in the crash campaign; drop slicing.
4. With `AlphaActionJournalPlugin` SIMPLIFY: extract Clock bridge members to a class; drop `clockJournalBridge`.
5. With `NativeReadEpoch` DELETE: remove `media()`, `index.mjs:117` entry, manifest `sources` entry, `test/native-read-epoch.test.mjs`, `test/fixtures/NativeReadEpochTest.java`.
6. With `HostedStorageFault` MERGE: drop it from `deletionProductSources`.
7. Delete Capacitor `Bridge.java` regex checks in `gmail-background.mjs`.
8. One runner per campaign: per-model `test/quint-native-{clock-review,crash-journal,deletion-review-admission,gmail-background}.test.mjs`, `test/quint-credential-leases.test.mjs` duplicate the aggregate `test/quint-native-refinement.test.mjs` (T4).
9. Lane scoping: upstream-only campaigns (`CredentialLeaseTraces`, most of `ComponentTraces`, VAD) run only when `upstream.lock.json`, `patches/eliza/**` or their `.qnt` change; Java harnesses run on `android/app/src/main/java/**` + their own files.
10. Upstream follow-ups (D14): `CloudSignInPlugin` observation seams; `NativeProviderAdmission` Cloud identity helper as its own class; read-only snapshots for `CredentialShutdownLease`/`CredentialRequestFence`.

## Owner questions
- Rename the `legacy-exact-replay` (Clock) and `legacy-bridge` (crash journal) scenarios? They test current-code inputs (unmarked terminal rows, malformed file rows), not migration, so they stay under D1; renaming touches the `.qnt` scenario labels.
- `ResidentScheduling` vs `ResidentSchedulingServiceAdmission`: should both models replay the same 120-case table, or only the service model?
- MediaLifecycle: accept losing its (dead-code) native refinement when `NativeReadEpoch` is deleted?
