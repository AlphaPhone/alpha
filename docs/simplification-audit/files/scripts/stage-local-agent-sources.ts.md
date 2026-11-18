# scripts/stage-local-agent-sources.ts
- Lines: 75 | Kind: Gradle build step (Java source generation) | Verdict: KEEP, SIMPLIFY
- Covers: generates the resident-host Java sources from the pinned upstream into `android/app/build/generated/local-agent` with a source manifest, publishing atomically. Duplicates: none. Callers: `android/consumer-host.json:101` (Gradle `stageLocalAgentSources` task), `scripts/build-archive.ts:49`; `scripts/ci/resident_native_source.py:11-13` hashes this file (T10/B5); listed in `quint-lib.ts:26`, `source-snapshot.ts:39`, `specs/quint/services/manifest.json:2781`; tests `test/fixtures/resident-java-source-stage.mjs` (runs it), `android-host.test.mjs:95`, `resident-native-ci-admission.test.mjs` (copies and hashes it), `alpha-system-entry.test.mjs:100` (T1 text read), `verify-apks.test.mjs:221` (stubs it).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9, 15 | B3 | Checks `git rev-parse HEAD` of `vendor/eliza` against the lock, then `verifySource(runtimeSource, pin)` verifies the prepared tree against the same pin; the first check is about the vendor checkout that is not read here. | Drop line 9 unless `stageResidentHostSources` reads from `vendor/eliza` (it reads `runtimeSource`). | Low |
| 2 | 11 | B3 | Re-validates `app.config.json` appId with a regex (our own committed file). | Delete. | — |
| 3 | 23-74 | D9 | Nested try/catch/finally with an `AggregateError` restore path for a directory swap under `build/generated`, a Gradle output directory. | `rmSync(published)` then `renameSync(candidate, published)`; Gradle re-runs the task on failure. Keep the "unexpected contents" refusal. | Low |
| 4 | 42-48 | B5 | Manifest records `sourceSha256` twice (`sha256` and `sourceSha256`) and `patches: []`. | Check readers (`verify-apks`, `resident_native_source.py`) and drop the duplicate field if only one is read. | Low (manifest is read by scripts in this repo only). |
| 5 | — | B5 | `resident_native_source.py` asserts this file's hash as part of CI admission. | Belongs to the CI review; replace with a git-tree identity of `scripts/`. | — |

## Proposed end state
~40 lines: verify prepared source, stage, write manifest, replace output directory. No regex on own
config, no restore choreography for a build directory.
