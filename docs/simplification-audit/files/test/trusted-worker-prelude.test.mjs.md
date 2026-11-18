# test/trusted-worker-prelude.test.mjs
- Lines: 16 | Kind: drift check of a checked-in androidTest asset against upstream source (T1-like) | Verdict: DELETE once the prelude is generated (owner of androidTest staging)
- Covers: `android/app/src/androidTest/assets/trusted-worker.mjs` begins with exactly the pinned upstream `workerLeasePrelude` (`vendor/eliza/plugins/plugin-workflow/src/services/workflow-worker-lease-prelude.ts`) before the `// Instrumentation-only trusted harness.` marker. Duplicates: `scripts/ci/resident-native.py:39-42` hashes the same asset against a frozen digest. Callers/importers: `npm test`; asset users `ResidentWorkflowCrashInstrumentedTest.java`, `TrustedPackagedWorker.java`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-15 | T10, C7 | A copy of upstream code is committed inside an asset and kept equal by a test; a pin bump fails until someone hand-pastes the new prelude. | Generate: keep only the harness half in the repo and prepend `workerLeasePrelude` when instrumentation assets are staged (`scripts/android-instrumentation.ts` or a Gradle `androidTest` asset task). Then delete this test. | low |
| 2 | 15 | B3 | Asserts upstream's prelude mentions `__elizaAcquireWorkerLease`. | Delete. | none |
| 3 | — | P3 | `resident-native.py` pins the asset hash too; after generation that frozen hash must be computed from the generated file. | Note for the CI/scripts chunk. | low |

## Proposed end state
Asset split into a harness-only file; the staging step writes `prelude + harness`. This test is deleted. Until the
generation exists, keep the test (it is cheap and catches a real instrumentation mismatch).
