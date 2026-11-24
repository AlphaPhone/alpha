# test/android-consumer-build.test.mjs
- Lines: 134 | Kind: tooling integration (Alpha's `parseBuildArgs`/`buildEnv`/`consumerBuildOptions` from `scripts/build-android.ts` driving the pinned upstream `buildAndroidConsumer`, with a fake Gradle/verifier `run`) | Verdict: KEEP, trimmed; MERGE into `test/tooling/android-build.test.mjs`
- Covers: a distribution build assembles four APKs plus instrumentation and lint flag-off, then runs `verify-apks` once; test-mocks builds are recorded and verified as such; signing names (never values) reach Gradle; low-disk mode builds one variant at a time. Duplicates: `test/android-build-path.test.mjs` (removed-flag refusal), `test/one-runtime-profile.test.mjs`. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 53-92, 117-126 | - | Real Alpha options through the real orchestrator; the "flag-off by default, verify once, secrets never in args" rules gate releases. | Keep. | High if dropped |
| 2 | 94-115 | A8, T4 | Removed-option refusal and scrubbing of `VITE_ELIZA_RUNTIME_PROFILE`/`ELIZA_LOCAL_EMBEDDINGS` from the environment: tombstones of the one-profile migration. | Delete the refusal assertions with `removed-profile-flags.ts`; keep the unpackaged/skip-instrumentation case (109-114). | Low |
| 3 | 128-134 | - | Low-disk mode: keep only if `ALPHA_ANDROID_LOW_DISK` is still used (it is read by the build; owner-local convenience). | Keep (cheap). | - |
| 4 | 10 | T5-adjacent | Exercises upstream code, but through Alpha's options: acceptable as an integration seam. | - | - |

## Proposed end state
Four cases in `test/tooling/android-build.test.mjs`: distribution build, test-mocks build, developer (unpackaged, skip
instrumentation) build, signing names only. The fake-Gradle `run` helper is shared with the preflight cases.
