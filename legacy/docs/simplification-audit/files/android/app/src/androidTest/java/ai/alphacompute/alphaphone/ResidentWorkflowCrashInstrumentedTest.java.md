# android/app/src/androidTest/java/ai/alphacompute/alphaphone/ResidentWorkflowCrashInstrumentedTest.java
- Lines: 367 (47 KB; many 500-2,800-char lines) | Role: disposable-user resident crash campaign: SIGKILL the resident during a held model RPC (lost-rpc stays `outcome-unknown`, no replay) and prove a trusted packaged workflow worker survives resident restarts. Writes `files/resident-recovery-complete.json` / `resident-recovery-identity.json` for the CI supervisor. | Verdict: SIMPLIFY
- Importers: none. Run by `scripts/ci/resident-native.py:59` phases `trusted` and `lost-rpc` (args `residentCrash`, `residentRunId`), workflow `resident-android.yml:519`. Proof JSON read by `resident-native.py:85-100` and `scripts/ci/resident_crash_diagnostic.py:87` (`missingModelRequest`), tested by `test/resident-crash-diagnostic.test.py`. Uses `ResidentTestFixture`, `TrustedPackagedWorker`, `WorkerCrashDiagnostic`, generated `WorkflowSurvivorInventory`/`ElizaAgentService`. `android/app/src/androidTest/assets/trusted-worker.mjs:377` names `HeldModel` in a comment. Text/path pins: class/method names in `resident-native.py:59`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 28-40, 109-145 | C5 | `nativeCall`, `request`, `startAndEnroll` are a copy of `ResidentServiceInstrumentedTest:24-65` (same pair-code flow, same "readiness deadline" text); this copy adds RAM report, failure categories and `awaitWorkflowRoutes`. | Move one `ResidentSession` into `ResidentTestFixture` with an optional `onApiFailure` hook and `afterReady` callback; both tests use it. | Low; behaviour diff (`authenticated` handling at :121 vs ResidentService:41) must be reconciled — keep this file's stricter rule. |
| 2 | 147-150 | D4 | `ownedChild()`, `stopped()`, `owner()`, `agent()` are one-line renames of `ResidentTestFixture` functions (also duplicated in ResidentService:67-70). | Call the fixture (or `ResidentSession`) directly. | None. |
| 3 | 289-295 vs 335-340 | C3 | The admission prologue (DEBUG, disposable UID, ABI, unlocked user, run-id, read+delete `resident-recovery-input.json`, verify bun/bundle/source SHA, no provider slot, socket closed) is pasted verbatim in both tests. | Extract `admitFixture(String label)` returning `run`. | None. |
| 4 | 298, 342, 300, 344, 329, 363 | D7 / P12 | Both tests reflect into `AlphaLocalAgentPlugin.instrumentationRecoveryEndpoint` (`getDeclaredField(...).setAccessible(true)`) to redirect the provider to the loopback `HeldModel`. The field is a test hook in **main** (`AlphaLocalAgentPlugin.java:44-45, 680-689`). | Cross-file: move the hook to the `testMocks` source set or an explicit debug-only setter; then drop reflection here. See chunk cross-file action. | Medium: changing the hook changes main code; resident-native lane must pass. |
| 5 | 283-284 | B4 | `crash()` asserts `processStart(pid)` and `st_uid` twice in a row (`assertEquals(resident.getString("start"),processStart(pid));assertEquals(Process.myUid(),Os.stat(...).st_uid)` on both lines). | Delete the duplicates on line 284. | None. |
| 6 | 21 | C3 | `readUtf8(Path)` duplicates `TrustedPackagedWorker.readUtf8:17`. | Use `Files.readString(path)` (API 26+) in both; delete both helpers. | None. |
| 7 | 157 | D4 | `HeldModel()` overload just calls `this(false)`. | Single constructor with the boolean. | None. |
| 8 | 41-54 | C6 / B5 | `safeIpcRefusal` hard-codes ~80 upstream refusal labels (copied from the generated resident host) to whitelist a diagnostic; `safeBootReason` copies 15 boot states. Drift from upstream silently degrades the label to `"unrecognized"`. Output only reaches a human-read CI artifact. | Owner question: export the label set from the generated host (or a JSON in `.eliza/generated-android`) and read it; or drop `ipcRefusal` and keep only `state`/`reason`. | Low; diagnostic only. |
| 9 | 81-99, 55-80, 208-237 | B1 | `reportRamAdmission` (`catch(Exception unavailable)`), `captureReadinessTimeout` and `captureMissingModelRequest` (`catch(Throwable)`) swallow by design so diagnostics never replace the primary failure; each has a comment. | Keep (documented diagnostic fallback). `reportRamAdmission` could be deleted if nobody reads the `sendStatus(2,…)` line (grep: no consumer of "Resident RAM admission" in scripts/test). | Low. |
| 10 | 180-207, 252-270 | D9 / D8 | `safeExecutionDiagnostic` and `workerDiagnostic` are 30-line sanitisers with 400-char conditions (`(pid instanceof Integer||pid instanceof Long)&&…8640000000000000L`). | Extract `boundedLong(Object,min,max)`; formatter. `safeExecutionDiagnostic` is static and package-visible but has no other caller (grep) — make private. | None. |
| 11 | 239-243 | B3 | `findOwner` walks `.eliza/smthrs` recursively twice (first level, then recursive) for one known path `<agent>/<workflow>/.worker-owners/<sha(run)>/owner.json`; `control` already holds that directory at :306. | Use `new File(control,".worker-owners/"+hash(run)+"/owner.json")` (as `captureMissingModelRequest` already does at :214). | Low. |
| 12 | 177 | NEW | Workflow TSX source literal duplicated conceptually with `trusted-worker.mjs` fixture asset. | Move to `androidTest/assets/` next to `trusted-worker.mjs`. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `nativeCall` / `request` / `startAndEnroll` | helper | 28-40, 109-145 | `ResidentServiceInstrumentedTest:24-65`, `ResidentTestFixture.nativeGet:26` | `ResidentTestFixture.ResidentSession` |
| `readUtf8` | helper | 21 | `TrustedPackagedWorker:17` | `Files.readString` |
| `write(File,String)` (sync+chmod 600) | helper | 175 | `TrustedPackagedWorker.write:20` (adds exists check) | `ResidentTestFixture.writePrivate` |
| `HeldModel` (loopback HTTP server) | class | 151-173 | `ScopedVoicePlaybackInstrumentedTest.Fixture:48-105` (same header/Content-Length parse), many loopback fixtures in androidTest | shared `LoopbackHttp` test helper |
| `safeBootReason`, `safeIpcRefusal` | helper | 41-54 | upstream refusal strings in generated `ElizaAgentService` | read from upstream or delete |
| `safeExecutionDiagnostic` | helper | 180-207 | `scripts/ci/resident_crash_diagnostic.py` consumes its output | keep, make private |
| `untilFile` | helper | 176 | 71 androidTest files define an `until` poller | shared `Poll.until` |

## Proposed end state
Shared session/admission code moved to `ResidentTestFixture` (−~70 lines), duplicate asserts and wrappers removed, `findOwner`
replaced by the known path, reflection replaced by a test-mocks hook (cross-file), formatter applied. Proof JSON keys written
today (`passed`, `cleanupComplete`, `runId`, `case`, `missingModelRequest`, `readinessTimeoutDiagnostic`, `apiFailureDiagnostic`,
…) stay byte-compatible for `resident-native.py` and `resident_crash_diagnostic.py`. Estimated ~280 lines (content).

## Verification
`resident-android.yml` → `scripts/ci/resident-native.py` phases `trusted`, `lost-rpc`; `python3 test/resident-crash-diagnostic.test.py`
(proof shape). Emulator/disposable-user evidence only.
