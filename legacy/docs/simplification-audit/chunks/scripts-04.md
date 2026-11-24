# Chunk scripts-04: `scripts/ci` (acquire-resident-bun … export-browser-proof)

| File | Lines | Kind | Verdict | Target / note |
|---|---|---|---|---|
| `scripts/ci/acquire-resident-bun.py` | 127 | CI download script | KEEP, SIMPLIFY | share download helper with `embedding-artifacts.py`; move `test-acquire-resident-bun.py` to `test/` |
| `scripts/ci/admit-cloud-signing-input.py` | 168 | release admission gate | KEEP (owner decision) | requires `runtimeProfile == "cloud"` while `verify-apks.ts` now writes `"native"`: align or delete the whole Cloud-signing family |
| `scripts/ci/affected.ts` | 112 | CI change selection | KEEP, REWRITE table | path -> lane matrix; removes "everything selects verify" and the catch-all |
| `scripts/ci/build-app-signing-fixtures.py` | 53 | release fixture builder | KEEP | none beyond shared build-tools constant |
| `scripts/ci/build-private-peer.py` | 33 | resident fixture builder | KEEP, SIMPLIFY | reformat, drop self-hashing and exact-count assert |
| `scripts/ci/calendar-bridge.init.gradle` | 271 | Gradle init script | SIMPLIFY | ~40-line `Exec` task running the upstream bridge driver against the compiled plugin |
| `scripts/ci/calendar-bridge.py` | 471 | process supervisor | DELETE | replaced by a plain `gradlew` step with `timeout-minutes` |
| `scripts/ci/check-changed-models.ts` | 115 | Quint selection + runner | SIMPLIFY -> MERGE into `scripts/check-quint.ts --changed-since` | drop receipts/re-hash, drop `package-lock.json` from checker inputs |
| `scripts/ci/embedding-artifacts.py` | 343 | CI library + CLI | SIMPLIFY | delete retired `ALPHA_LOCAL_EMBEDDINGS` opt-in path; keep library + carrier modes |
| `scripts/ci/emulator-suite.ts` | 221 | CI emulator runner | KEEP, small SIMPLIFY | shared `Adb` type, flat step type |
| `scripts/ci/export-browser-proof.ts` | 139 | CI artifact export | KEEP, SIMPLIFY (or DELETE if no consumer) | owner question: nobody in the repo downloads `browser-proof-*` |

## Behaviours that would lose coverage
- None from the DELETE of `calendar-bridge.py`, as long as the simplified Gradle task stays in `android.yml`: the upstream `bridge-check.mjs` run against the real compiled `AlphaCalendarPlugin` is the only host-side behavioural check of the Android Calendar bridge (kept under D18). Do not drop the init script together with the Python file.
- If the owner deletes the Cloud-signing family (finding #1 of `admit-cloud-signing-input.py`), signer-custody admission of producer archives goes with it, together with the Quint model `protected-app-update-promotion`. That is a release-path decision, not a test gap.
- Deleting `export-browser-proof.ts` loses nothing the repo checks: `audit-production-bundle.ts` already gates the same renderer build.

## Shared helpers worth creating
- `scripts/ci/github_download.py`: redirect-safe authenticated GitHub download (token only on the first request, host allow-list, size cap, streaming SHA-256). Twins today: `acquire-resident-bun.py:16-77`, `embedding-artifacts.py:45-119` (reused by `hosted-native-inputs.py`).
- `scripts/ci/cilib.py`: `require`, `sha256_file`/`sha256_bytes`, the `build-tools/36.0.0` constant, a bounded zip-member reader. `require` alone has 8 copies in `scripts/ci`.
- TS: `scripts/lib/git.ts`, `scripts/lib/hash.ts`, `Adb` in `scripts/lib/toolchain.ts` (used by `affected.ts`, `check-changed-models.ts`, `export-browser-proof.ts`, `emulator-suite.ts`).
- `quint-lib.ts` should export `modelFamilies` and `readModelFamily()` and absorb `selectChangedModels`/`importedModelPaths`/`proofPhases`.

## Cross-file actions
1. `android.yml`: replace the two `calendar-bridge.py` steps and the six-file receipt upload with one `gradlew --init-script … :app:qualifyCalendarBridge` step. Remove the HOST case from `test/ci-pin-bound-scripts.test.mjs:12-22` and the `runpy`/text reads in `test/resident-native-ci-admission.test.mjs:100,113`. Until this lands, every edit to `AlphaCalendarPlugin.java` (stage C, the formatter) breaks the required Android check through the `HOST` hash pin.
2. `browser.yml` formal job + `quint-model-check.yml`: one job using `check-quint.ts --changed-since`; drop the `test-results/quint/changed-models/` upload once receipts are gone; `check-quint.ts` can stop writing receipts.
3. `changes.yml`/`affected.ts`: lane split (needs `browser.yml` verify split into host / quint / lemma / build-audit jobs). Remove `digest-restart` and `bun-spawn-seccomp` from the regex if those workflows are deleted (ci chunk).
4. `resident-android.yml:199`: stop calling `embedding-artifacts.py --check-inputs` (retired opt-in), or switch it to a `hosted-native-inputs.py` check.
5. Move `scripts/ci/test-acquire-resident-bun.py` to `test/` (T9).

## Owner questions
- Is the Cloud signing / qualified-update path (`release-cloud-app-signing.yml`, `verify-cloud-signing-input.yml`, `publish-qualified-app-update.yml`) still live? `admit-cloud-signing-input.py` admits only `runtimeProfile == "cloud"` records, while `verify-apks.ts` now writes `"native"`. As written, it would refuse every current producer archive, and its Python test still passes because it uses `"cloud"` fixtures.
- Who consumes the `browser-proof-renderer-*` / `browser-proof-worker-*` artifacts? Nothing in the repo downloads them.
- Does any resident dispatch still set `ALPHA_LOCAL_EMBEDDINGS=1`? README says every build packages local embeddings and the option is gone.
- Should the private-runner identity in `admit-cloud-signing-input.py:84-85` (`project`, `instanceId`) move into the reviewed pin file?
