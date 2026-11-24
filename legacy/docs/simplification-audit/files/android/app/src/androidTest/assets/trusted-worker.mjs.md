# android/app/src/androidTest/assets/trusted-worker.mjs
- Lines: 399 (41 KB) | Role: the worker script that `ResidentWorkflowCrashInstrumentedTest` / `TrustedPackagedWorker` run under the packaged Bun. Lines 1-361 are a verbatim, minified copy of upstream `workerLeasePrelude` (`vendor/eliza/plugins/plugin-workflow/src/services/workflow-worker-lease-prelude.ts`), which also includes a Windows PowerShell/C# lease backend. Lines 363-399 are the Alpha harness that runs one synthetic workflow under the lease and writes `trusted-result.json`. | Verdict: SPLIT (generate the prelude part)
- Importers: `TrustedPackagedWorker.java:32,38` (writes it to disk and runs it), `ResidentWorkflowCrashInstrumentedTest.java:266-269,348` (reads the asset and checks its SHA-256 against a frozen fixture). Text/path pins:
  - `test/trusted-worker-prelude.test.mjs:6-15` cuts the file at the literal marker `'\n// Instrumentation-only trusted harness.'` and asserts that the prefix equals `workerLeasePrelude` (T1/T10).
  - `scripts/ci/resident-native.py:39-42` freezes `trustedWorkerSha256` and asserts that it equals the digest of this file and of the copy inside the test APK (B5).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-361 | D6 / C7 | 41 KB of generated upstream output are checked in by hand ("Regenerate the prelude from vendor workerLeasePrelude when this fails", per the test comment). Every upstream bump that changes the prelude needs a manual copy, a test update and a re-freeze of the digest. | Check in only the harness, as `trusted-worker-harness.mjs` (about 37 lines). Have the step that prepares instrumentation (`scripts/android-instrumentation.ts`, or `agent:stage-android` for the test-mocks build) write `assets/trusted-worker.mjs = workerLeasePrelude + harness` into a generated androidTest asset dir. Then delete `test/trusted-worker-prelude.test.mjs` and derive the frozen digest instead of storing it. | Medium: the generated asset must stay byte-stable for `resident-native.py`, and the Gradle androidTest assets must point at the generated dir. |
| 2 | 2-352 | A7 (upstream) | The Windows backend (`WindowsLeaseNative`, PowerShell helper) can never run on Android. It is upstream's code, so do not edit the copy. | Goes away from the repo with #1; the bytes stay in the generated asset. | — |
| 3 | 363 | D7 | The comment `// Instrumentation-only trusted harness.` doubles as the marker a test slices on. | After #1 the marker is unnecessary. | — |
| 4 | 370 | B3 | The harness re-validates `payload.endpoint`, which `TrustedPackagedWorker.java:32` itself wrote as `http://127.0.0.1:<port>/synthetic-survivor`. | Delete line 370 (low value), or keep it as a guard against misuse of the test. | Low |
| 5 | 364-365 | — | A second import of `createHash`/`fs` after the prelude's aliased imports. This is necessary because the prelude names are minified. | None. | — |

## Local types and helpers
None in the harness. The prelude's minified helpers (`U` sha256-hex, `v` fsync, etc.) are upstream's.

## Proposed end state
A 37-line `trusted-worker-harness.mjs` is checked in, and the 399-line asset is generated at instrumentation build time. `test/trusted-worker-prelude.test.mjs` is deleted and `scripts/ci/resident-native.py` computes the expected digest from the generated asset. About 362 lines are removed from source control.

## Verification
`ResidentWorkflowCrashInstrumentedTest` (resident-android workflow, `scripts/ci/resident-native.py`), `node --test test/trusted-worker-prelude.test.mjs` until it is deleted.
