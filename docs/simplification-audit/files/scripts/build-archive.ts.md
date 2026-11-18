# scripts/build-archive.ts
- Lines: 107 | Kind: CI build pipeline step (qualified build archive: verify + android:build + retain APKs with frozen-input proof) | Verdict: KEEP + SIMPLIFY
- Covers: produces the immutable `test-results/<archive>` that the resident Android lanes and the update-candidate flow consume: retained APKs/test APKs/mappings with hashes, `inputs-before/after.json` equality, `configuration.json`, `apk-verification.json`, archived web payload. Duplicates: `scripts/developer-archive.ts` (unqualified twin, copies from an existing build). Callers/importers: `.github/workflows/resident-android.yml:333,336`; `scripts/android-workflow-native.ts`, `scripts/developer-archive.ts` (mention); tests `verify-apks.test.mjs:267,300` (spawn), `embedding-workflow-forwarding.test.mjs` (T1 on workflow text), `gradle-verification.test.mjs:44` (T1), `one-runtime-profile.test.mjs` (tombstone test). Consumers of its output: `app-update-candidate.ts` (reads `configuration.json`, `apk-verification.json`, `inputs-*.json`, `apk-manifest.json`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 19-20, 22, 78 | A8 | Forwards `--runtime-profile*`/`--local-embeddings` only so `parseBuildArgs` can refuse them; constant `runtimeProfile='native'` written and compared. | Accept only `--test-mocks`; drop the profile field (coordinated with `app-update-candidate.ts:171` and `build-android.ts:279`). | Low. |
| 2 | 61-69 | P3 | Runs the whole `npm run verify` (2 h budget, line 65-66) inside the archive step. In `resident-android.yml` the same commit is already verified by `browser.yml`. | Owner/CI decision: archive should run `android:build` only and rely on the PR's verify lane; keep the input-freeze equality. Saves up to 2 h per resident run. | Medium: changes what the archive proves (re-states a release-qualification policy). |
| 3 | 28-29 | B2 | `sqlite3 --version` precheck exists only because `verify` (finding 2) compiles Calendar host tests. | Goes with finding 2. | None. |
| 4 | 74, 98 | C3 | Inline sha256 twice. | `scripts/lib/hash.ts`. | None. |
| 5 | 18-40 | D9 | Top-level script with no `main`; tests must spawn it. | Wrap in `main(argv, {root, env})`, keep CLI. | None. |
| 6 | 39, 45, 55, 62, 101-102 | B5 | `wx`/`COPYFILE_EXCL` everywhere ("preserve earlier evidence"). Destination is a fresh CI directory. | Keep the single "archive already exists" check (39); the per-file exclusive flags are redundant. | None. |
| 7 | whole | C5 | `developer-archive.ts` duplicates retention/hashing for the unqualified path. | Share a `retainApks(sourceDir, destination)` helper. | Low. |

## Proposed end state
~80 lines with a `main`: build-only (or verify+build if the owner keeps the policy), freeze/compare source snapshot,
retain APKs + test APKs + mappings with one hash helper, archive web payload. No profile tombstones.
Coverage: `test/verify-apks.test.mjs` archive cases (spawn the CLI on fixtures) - move them to a
`test/build-archive.test.mjs` integration file; delete the workflow-text and tombstone assertions.
