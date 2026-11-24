# android/app/src/androidTest/java/ai/alphacompute/alphaphone/TrustedPackagedWorker.java
- Lines: 46 (7.3 KB) | Role: test-APK fixture that lays out a trusted Smithers workflow worker (module, symlinked `smthrs`/`zod`, lease JSON, socket root) and launches it under the packaged Bun/loader with a scrubbed environment; `finish()`, `replay()`, `close()`. | Verdict: SIMPLIFY
- Importers: 1 — `ResidentWorkflowCrashInstrumentedTest:341-363` (`trustedPackagedWorkerSurvivesResidentRestart`). Reads `androidTest/assets/trusted-worker.mjs` via the caller. Text/path pins: none (the file names `trusted-worker.mjs`, `trusted-payload.json`, `trusted-replay-payload.json` are matched by `ResidentWorkflowCrashInstrumentedTest.workerDiagnostic:266`).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 17, 19, 20 | C3 | `readUtf8`, `sha` (`String.format("%02x",b)`, no Locale; correct for a `Byte` but inconsistent with the other copies), `write` duplicate `ResidentWorkflowCrashInstrumentedTest:21,175` and `ResidentTestFixture.hash`. | Use `ResidentTestFixture` helpers / `Files.readString`. | None. |
| 2 | 23, 36 | B4 | ABI check `Arrays.asList("arm64-v8a","x86_64").contains(Build.SUPPORTED_ABIS[0])` in the constructor and again in `launch()`; the caller already asserted it (`ResidentWorkflowCrash:336`). | Keep one (constructor). | None. |
| 3 | 30, 38, 44 | D8 | 600-1,000-char lines (socket-root validation, environment build, result validation). | Formatter; extract `ownedPrivateDir(File)` and `expectCanonical(result, replay)`. | None. |
| 4 | 38 | C6 / D11 | Bun feature flags and `LD_LIBRARY_PATH` duplicate the resident launch environment that the generated `ElizaAgentService` builds; drift makes the "trusted packaged" worker differ from a real one. | Owner question: expose the launch environment from upstream and reuse it. | Medium (fidelity, not correctness). |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `readUtf8` | helper | 17 | ResidentWorkflowCrash:21 | `Files.readString` |
| `sha` | helper | 19 | ResidentTestFixture.hash and ~28 more | shared digest |
| `write` | helper | 20 | ResidentWorkflowCrash.write:175 | `ResidentTestFixture.writePrivate` |

## Proposed end state
~40 lines (pre-formatter) using shared helpers; same on-disk layout and file names (`workerDiagnostic` and `trusted-worker.mjs` depend on them).

## Verification
`scripts/ci/resident-native.py` phase `trusted`.
