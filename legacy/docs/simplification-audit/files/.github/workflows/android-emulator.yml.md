# .github/workflows/android-emulator.yml
- Lines: 336 | Kind: dispatch-only workflow (developer APK build + emulator instrumentation) | Verdict: KEEP, SIMPLIFY (delete the unreachable `fused-speech` job and `all` option; share the emulator block)
- Covers: on manual dispatch builds flag-off developer APKs (+ test-mocks APKs for `browser-reading`) and runs `scripts/ci/emulator-suite.ts` on an API 35 x86_64 emulator for default instrumentation (both variants) or WebView-157 browser reading. Emulator-class evidence only (AGENTS.md: not an image or device result). Duplicates: emulator boot/KVM block also in `resident-android.yml:501-519,589-606`. Callers/importers: dispatch only; selected-as-noop by `scripts/ci/affected.ts:38`; documented in `scripts/ci/emulator-suite.ts`, `scripts/owner/emulator-campaign-check.ts:223`; text-asserted by `test/ci-emulator-evidence.test.mjs:16` (411 lines, 35 workflow reads) and `test/owner-emulator-campaign-check.test.mjs:57`.
- Health: 6 runs, 0 green (research §1).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 17-19, 72-76, 265-336 | A4/P4 | The build job fails on purpose for `fused-speech` and `all` (":error:: fused-speech needs staged Paradee voice outputs"), so the `fused-speech` job can never start and `all` always fails. | Delete the `fused-speech` and `all` options, the refusal step, the `fused-speech` job, the build-evidence download it needs, and `scripts/ci/speech-candidate.ts` (only callers: this job and `test/ci-emulator-evidence.test.mjs:10,196-198`). Remove the `fused-speech` suite from `emulator-suite.ts`. Restore from git when hosted voice staging exists. | Low; owner confirm hosted voice staging is not imminent (research §3). |
| 2 | 160-178, 223-247, 301-322 | P5/C5 | KVM udev + capacity check + `android-emulator-runner` with identical options repeated 3× here and 2× in `resident-android.yml`. | Composite action `.github/actions/android-emulator` with inputs `script`, `extra-emulator-options`, `min-free-gib`. | Low. |
| 3 | 138-159, 202-222 | P5 | Per-job checkout/node/java/setup-android/download repeated; the two remaining emulator jobs differ only in suite name, extra emulator options and the test-mocks manifest check. | One `emulator` job with `matrix.suite` filtered by `inputs.suite` (or a job-level `if` on `contains`), parameterising options and uploads. | Low. |
| 4 | 85-90 | B5 | Builds test-mocks APKs and asserts the flag-off APK hashes did not change (`before=$(sha256sum ...)`). | Keep only if `android:build --test-mocks` can overwrite `artifacts/*.apk`; otherwise delete the before/after hashing. Check `scripts/build-android.ts` output dirs. | Low. |
| 5 | 91-99, 160-164, 223-228 | B5 | Manifest SHA-256 is anchored in build and re-checked in each emulator job, plus `git rev-parse HEAD = SOURCE_SHA`; the download is by `artifact-ids` of this same run, so the bytes cannot differ. | Delete the freeze outputs and the re-checks; `artifact-ids` already pins the exact upload. | None. |
| 6 | 2-6 | A8 | Header comment is accurate; keep as one line ("Dispatch only; emulator-class evidence, never a device result"). | Shorten. | None. |
| 7 | whole | T1/T5 | `test/ci-emulator-evidence.test.mjs` asserts this file's text (step order, action pins, refusal). | Delete it (T1) in the same change; actionlint replaces syntax coverage. | Low. |

Path filter: n/a (dispatch only); `affected.ts` should treat this file as `static`-only (actionlint), not `verify`.

## Proposed end state
- `on: workflow_dispatch` with `suite: instrumentation | browser-reading`.
- `build` job (android-toolchain composite, `android:build --allow-unpackaged-runtime`, `--test-mocks` when reading), then one matrix `emulator` job using the shared emulator composite and `node scripts/ci/emulator-suite.ts <suite>`.
- No fused-speech code path, no manifest re-hashing; roughly 120 lines.
