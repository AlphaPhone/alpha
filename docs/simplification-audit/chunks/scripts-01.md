# Chunk scripts-01: GitHub Actions workflows

18 files, 2,645 lines, all read in full. Per-file reports are under `files/.github/workflows/`. No workflow
file was modified.

| File | Lines | Kind | Verdict | Target / note |
|---|---|---|---|---|
| `.github/workflows/browser.yml` | 308 | PR gate (verify monolith, formal, browser, production, storage) | KEEP, SPLIT | Becomes the single PR workflow with parallel lanes `static/host/quint/lemma/browser/production` (+ android, prepare) |
| `.github/workflows/changes.yml` | 51 | reusable selector | KEEP, SIMPLIFY | One `plan` JSON output; called once per event |
| `.github/workflows/android.yml` | 171 | PR gate (APK build) | KEEP, SIMPLIFY | Delete dispatch-only verify, duplicate `setup-bun`, vendor test, Kotlin prep; inline manifest check → `verify-apks.ts`; later a job of the PR workflow |
| `.github/workflows/resident-prepare.yml` | 70 | PR (prepared runtime) | KEEP, SIMPLIFY | Explicit `prepare` path list; job of the PR workflow; only runner of digest restart |
| `.github/workflows/lemma-check.yml` | 55 | PR/push Dafny proofs | DELETE | Broken (DAFNY on env, not PATH; 0/40 green) and duplicated by verify; path filter moves to the `lemma` lane |
| `.github/workflows/quint-model-check.yml` | 59 | PR/nightly Apalache | REWRITE | Sharded nightly `quint-verify` lane; no PR trigger; legacy compare/temporal go with `specs/quint/legacy` |
| `.github/workflows/digest-restart.yml` | 65 | dispatch/var-gated | DELETE | Duplicate of `resident-prepare.yml` digest step |
| `.github/workflows/bun-spawn-seccomp.yml` | 60 | dispatch one-off repro | DELETE | With `scripts/ci/reproduce-bun-spawn-seccomp.py` |
| `.github/workflows/reproduce-paradee-model.yml` | 31 | dispatch, never run | DELETE | With `scripts/ci/reproduce-paradee-model.py` and its case in `test/ci-pin-bound-scripts.test.mjs` |
| `.github/workflows/android-emulator.yml` | 336 | dispatch emulator evidence | KEEP, SIMPLIFY | Delete unreachable `fused-speech` job/`all` option (+ `scripts/ci/speech-candidate.ts`); matrix job + emulator composite |
| `.github/workflows/resident-android.yml` | 615 | push/dispatch/nightly packaged build + emulator suites | KEEP, SPLIT/SIMPLIFY | Main push builds candidate only; emulator suites dispatch/nightly; host tests to host lane; heredocs to scripts; ≈250 lines |
| `.github/workflows/embedding-qualification-carrier.yml` | 66 | reusable (one caller) | KEEP, SIMPLIFY | Standalone `workflow_dispatch`; remove `operation` multiplexing from resident-android |
| `.github/workflows/verify-cloud-signing-input.yml` | 37 | reusable (one caller) | MERGE | Into `release-cloud-app-signing.yml` as `admit` job |
| `.github/workflows/release-cloud-app-signing.yml` | 243 | protected release | KEEP, SIMPLIFY | Inline Node → scripts; keystore helper; drop `.mjs` fallback (owner) |
| `.github/workflows/release-app-signing.yml` | 124 | protected one-off proof | DELETE (owner confirm) | With `scripts/ci/build-app-signing-fixtures.py`; real signing + custody proof cover it |
| `.github/workflows/release-custody-proof.yml` | 71 | protected release | KEEP | Self-test also in host lane |
| `.github/workflows/release-os-ota-signing.yml` | 124 | protected release | KEEP, SIMPLIFY | Shared GCP auth composite |
| `.github/workflows/publish-qualified-app-update.yml` | 159 | protected release, never run | KEEP, SIMPLIFY | Inline Python → `qualified-app-update.py`; resolve `runtimeProfile` mismatch first |

Counts: KEEP (incl. simplify/split) 12, DELETE 5 (`lemma-check`, `digest-restart`, `bun-spawn-seccomp`,
`reproduce-paradee-model`, `release-app-signing`), MERGE/REWRITE 2 (`verify-cloud-signing-input`, `quint-model-check`).

## Behaviours that would lose coverage if the DELETEs happen

- **None of the deletions removes the only runner of a check**, with these caveats:
  - `lemma-check.yml`: Lemma/Dafny still runs in `browser.yml` verify (`prepare-dafny.sh` + `LEMMA_REQUIRE_BACKEND=1`). When verify is split, the new `lemma` lane must exist in the same change.
  - `quint-model-check.yml`: full-model Apalache `verify` and the legacy TLC `compare`/`temporal` checks have no other runner (only changed-model `verify` runs on PRs, in `browser.yml` `formal`). They have never completed, so nothing is lost in practice, but a nightly sharded lane is needed to claim symbolic checking at all.
  - `release-app-signing.yml`: the fixture signing proof itself disappears; keystore ↔ signer is still checked on every real signing (`release-cloud-app-signing.yml:186-195`) and custody by `release-custody-proof.yml`.
  - `android-emulator.yml` fused-speech: x86_64 on-device speech instrumentation has no runner after the cut, but it has none today either (the build job refuses it).
  - `reproduce-paradee-model.yml`: model-conversion reproducibility (never exercised).

## Shared helpers worth creating (composite actions / scripts)

- `.github/actions/node-setup` — checkout (+submodules), setup-node from `.nvmrc` with npm cache, `npm ci`, optional `upstream:prepare-client`. Replaces 11 copies.
- `.github/actions/android-toolchain` — Java 21, setup-gradle, setup-android, Python 3.12, `sdkmanager` platforms/build-tools/NDK 28.2, CMake 4.0.3, `ANDROID_NDK_HOME`. Replaces 3 copies.
- `.github/actions/android-emulator` — KVM udev rule, capacity floor, `android-emulator-runner` pixel_7/API 35 with `script` and extra options inputs. Replaces 5 copies.
- `.github/actions/free-disk` — fixed directory list, free-GiB assertion. Replaces 4 copies.
- `.github/actions/gcp-release-storage` — the workload-identity auth values. Replaces 4 copies.
- `scripts/ci/prepare-sdk.sh` (or `prepare-local-agent.ts --print-source`) — replaces the inline `verifySource` one-liner in `browser.yml` and `android.yml`.
- `scripts/ci/with-app-keystore.sh` — only if `release-app-signing.yml` is kept.

## Cross-file actions

1. `scripts/ci/affected.ts`: replace the four-boolean model with the lane matrix (`ci-and-formal.md` §7); give `prepare` and `lemma` positive path lists (carried over from `digest-restart.yml` and `lemma-check.yml` filters); drop `bun-spawn-seccomp|digest-restart` from the line-38 regex; workflow edits select only `static` (actionlint) plus the lane they configure; remove `browser_speech` once the local-agent profile is a Playwright project.
2. Delete workflow-text tests in the same change as any workflow edit: `test/ci-required-checks.test.mjs`, `test/ci-emulator-evidence.test.mjs`, `test/embedding-workflow-forwarding.test.mjs`, the workflow parts of `test/qualified-app-update.test.mjs`, `test/app-update-candidate.test.mjs:210`, `test/cloud-sdk-routing.test.mjs`, `test/cloud-resident-*.test.mjs`, `test/pilot-units.test.mjs`; replace with `actionlint` in the static lane.
3. Quint (T10): `specs/quint/refinement/services/protected-app-update-promotion.mjs` and `app-update-candidate.mjs` parse `resident-android.yml`, `release-cloud-app-signing.yml`, `verify-cloud-signing-input.yml`, `publish-qualified-app-update.yml` and assert step order; `specs/quint/services/manifest.json:2878,2924-2927` lists them as `sources`. Port these harnesses to the scripts that implement the steps before restructuring the workflows, or update them in the same change, so the formal suite stays at 100 %.
4. Move CI-embedded host tests to `test/python-suites.test.mjs`: `test-resident-phase.py`, `test-acquire-resident-bun.py`, `embedding-artifact-inputs.test.py`, `hosted-native-inputs.test.py`, `release-custody-proof.test.py`, `sign-os-ota.test.py`; remove duplicated runs in `resident-android.yml` and `resident-prepare.yml`.
5. Delete the upstream `stage-launcher-overlay.node.test.ts` runs (`android.yml:83`, `resident-android.yml:272`); list under upstream follow-ups (D14).
6. Update `scripts/owner/emulator-campaign-check.ts:66,204,223` and `test/owner-emulator-campaign-check.test.mjs:57` when `digest-restart.yml` and the fused-speech suite go.
7. `scripts/ci/required-checks-ruleset.json`: drop `Repository verification` (already folded into `Browser MVP result`); rename checks only together with the owner's ruleset change (D12).
8. Renaming any release workflow changes its identity in `scripts/ci/private-artifact-identity.json` and `scripts/ci/qualified-app-update.py`; keep release file names stable.

## Owner questions

1. Cloud signing/publication `runtimeProfile`: `scripts/ci/admit-cloud-signing-input.py:29` and `publish-qualified-app-update.yml:132` require `"cloud"`, but `build-android.ts:279,307` / `build-archive.ts:22` always write `"native"` ("one profile now"). Is the protected release chain currently unable to admit any producer, and should both checks become `native`?
2. Should `resident-android.yml` build on every main push (3 h build + two emulator jobs, 0/40 green), or only on dispatch/nightly, with main push limited to the unsigned candidate?
3. Is `release-app-signing.yml` (closed fixture signing proof, 2 runs) a one-off that can be deleted?
4. Keep per-PR Apalache (`quint:changed`), or run symbolic checking only nightly with `quint:check` (scenarios + simulation) as the PR gate?
5. Is the `develop` branch and the push-to-main/develop triggering still wanted (each change is verified up to four times)?
6. May the `.mjs`/`.ts` suffix fallbacks in `release-cloud-app-signing.yml:115-117` and `publish-qualified-app-update.yml:146-150` go (oldest producer commit that may still be signed)?
7. Is the dispatch-only SDK offline re-install and graph-diff ceremony in `resident-android.yml:283-304,342-344` a release-provenance requirement?
