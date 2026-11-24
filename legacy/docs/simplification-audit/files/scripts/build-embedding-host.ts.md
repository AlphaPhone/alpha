# scripts/build-embedding-host.ts
- Lines: 231 | Kind: build pipeline step (`npm run agent:build-embedding-host`: reproduce/stage the ARM64 embedding host libraries) | Verdict: KEEP + SIMPLIFY
- Covers: the APK only ever packages embedding-host `.so` files whose bytes equal `android/embedding-host/qualified-host.json` (reproduced from the pinned engine with the pinned NDK/CMake, or supplied by a CI producer via `--from`). Duplicates: `resolveSdk` re-derives `ANDROID_HOME` although `toolchain.ts androidEnv()` exists (research 2.3, 27 copies); local `sha256`/`readJson` (C3); git wrapper (C3). Callers/importers: `package.json` `agent:build-embedding-host` (part of `android:build:local`); `.github/workflows/resident-android.yml:239` (`--from`); `scripts/android-build-preflight.ts:20` (`stagedLibraries`, `embeddingHostState`, paths); tests `embedding-host-admission`, `strict-build-inputs` (imports + T1 read at :118), `android-build-path` (T1 on package.json), `upstream-pin-guard`; Quint `services/android-build-input-readiness.mjs:13`, `services/manifest.json:2692`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 87-90 | D10, A7 | `embeddingHostState(_manifest, _toolchain, staged)` ignores two parameters and always returns `suppliedBy:'script', reason:null`. Its only caller is the preflight. | Replace with `staged.every(row => row.state === 'staged')` at the call site; delete the function. | None. |
| 2 | 97-102 | C3 | `resolveSdk` re-implements SDK discovery. | Use `androidEnv().ANDROID_HOME` from `toolchain.ts`. | Low. |
| 3 | 28-29, 127 | C3 | Local `sha256`, `readJson`, `git`. | `scripts/lib`. | None. |
| 4 | 211 | D9 | Rewrites COMPARISON.json by string-replacing `"staged": false`. | Write the object once after staging (`staged: true`). | None. |
| 5 | 66 | B5 | Re-hash of the just-copied file "changed while copying". | Drop; `stagedLibraries` already verifies bytes and the Gradle `:app:verifyEmbeddingHost` task re-verifies at build. | None. |
| 6 | 158-161, 170 | B5 | `PREPARATION.json`/`COMPARISON.json` receipts: `PREPARATION.json` is the real hand-off from `prepare-embedding-host.ts` (read for library paths); `COMPARISON.json` has no reader (`git grep COMPARISON.json`: only this file and a log hint). | Keep PREPARATION; print the comparison instead of writing COMPARISON.json. | Low. |
| 7 | 174-177 | D7 | `build = compile` injection exists only for tests ("tests replace it"). | Acceptable seam for an integration test that cannot run a 10-minute NDK build; keep. | - |
| 8 | 92-95, 216-231 | - | `Stop` exit-code class: real CLI contract (2 = missing input, 3 = not reproduced), used by the preflight messages. Keep. | - | - |

## Proposed end state
~190 lines: status/candidate/stage/`--from` modes, shared SDK/hash/git helpers, no dead state function, one
comparison print. Coverage stays with `test/strict-build-inputs.test.mjs` (stage/compare on fixture libraries with the
injected `build`) and `test/embedding-host-admission.test.mjs`; drop their source-text assertions.
