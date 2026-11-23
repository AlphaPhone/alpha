# test/verify-apks.test.mjs
- Lines: 413 | Kind: tooling (integration of packaging CLIs: spawns `scripts/verify-apks.ts`, `scripts/stage-aosp.ts`, `scripts/build-archive.ts`, `scripts/verify-packaged-runtime.py`; imports `scripts/apk.ts`, `scripts/render-assetlinks.ts`, `scripts/voice-host.ts`) | Verdict: KEEP (move into the release-tooling suite, trim duplicates)
- Covers: release gates that decide whether an APK may be archived or staged into an AOSP image: test-mocks refusal, distributable/blocker rows, signer match, descriptor identity, owner-route-table byte equality, web payload archiving, voice-bundle admission, launcher-only manifest entries, allowed web VIEW filters. Duplicates: removed-profile refusals (lines 14-29 rows 21-23, 296-304) are also asserted by `test/one-runtime-profile.test.mjs:17-35`; `stage-aosp --production` lock refusal also in `test/aosp-product-lock.test.mjs:86`; the packaged-runtime NOT_PACKAGED path also in `test/packaged-runtime.test.py`. Callers/importers: `npm test` glob only.
- Research correction: `research/tests-host.md:1399` calls this "runs a Python unittest". It is a Node integration test of the CLIs; only one test spawns the Python verifier.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 14-29, 296-304 | T4 | `--runtime-profile` / `--local-embeddings` refusals duplicate `one-runtime-profile.test.mjs`, which already spawns `verify-apks.ts` and `build-archive.ts` with the same flags. | Keep the refusals in one place (this file, since it owns the CLIs); delete the copy in `one-runtime-profile.test.mjs`. Keep the `--cloud-voice-evidence` rows here. | Low |
| 2 | 41-43, 200, 243 | C3 | Two ZIP writers: a `python3 -c zipfile` helper and the `zip` CLI. | One helper (Python `zipfile` or a Node zip writer) in `test/support/zip.mjs`; drop the `zip` CLI dependency. | Low |
| 3 | 30-40, 75-76, 145-146 | C3 | `completeAospLock` + `stage()` spawner are repeated per test and duplicated by `aosp-product-lock.test.mjs`. | Share one `stageAosp(dir,args)` + `completeAospLock` support helper across the AOSP staging tests. | Low |
| 4 | 215-294 | runtime | Six `build-archive.ts` runs, each with a generated fake `npm`; whole file takes about 90 s (largest share). | Keep `native`, `test-mocks`, `inherited`, `wrong-channel`; fold `wrong-profile` and `private` into table rows that share one fixture dir, or run them in parallel subtests. | Low |
| 5 | 289 | B5 | `Object.keys(manifest).length === 6` exact-count assertion breaks on any new archived file. | Assert the named files and that each hash matches; drop the count. | Low |
| 6 | 352-370 | keep | Launcher-only permission/component checks use a stub of `aapt` output: real `validateApk`, synthetic input. Correct altitude for a release rule. | Keep. | — |
| 7 | 372-413 | keep | Web VIEW filter allow-list with xmltree stand-ins. | Keep. | — |

## Proposed end state
Moves to `test/release/apk-verify-audit.test.ts` (the research's proposed release-tooling suite) together with the
build-output audit tests. Keeps every staging/admission/manifest case; loses the duplicated runtime-profile rows, the
exact manifest count and the second zip helper. Shares `completeAospLock`/`stageAosp`/`zip` helpers with
`aosp-product-lock.test.mjs`. Release-gating: this is the class of test the brief says to keep.
