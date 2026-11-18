# CI plan: `.github/workflows` and `scripts/ci`

Inputs: chunk summaries `chunks/scripts-01,04,05,06,07,08.md` (the chunks that hold `.github/` and `scripts/ci/`),
CI mentions in `chunks/test-04,06,14,17,20,25,28,34,37,44,47,49.md` and `chunks/specs-01,10,16,42,49,53,54.md`,
the per-file reports in `files/.github/workflows/` and `files/scripts/ci/`, `research/ci-and-formal.md` §1, §2, §7–§10,
`research/scripts.md` §2.13, `PATTERNS.md` P1–P6, `DECISIONS.md` (D10–D12, D14, D16) and `cross-file-actions.md` §2.
Facts were checked in the worktree on 2026-11-11 with `ls`, `git grep` and read-only `gh run list` / `gh api`. This is a
plan only. No workflow or script was changed.

Rules this plan follows:
- **D12:** repository settings stay as they are. That covers rulesets, branch protection, repository variables and
  environments. Only files under `.github/` and `scripts/` change.
- The three check names in `scripts/ci/required-checks-ruleset.json` stay as job names: `Repository verification`,
  `Browser MVP result` and `Android foundation result`.
- `resident-android.yml` and every release workflow keep their file names. `scripts/app-update-candidate.ts:40`, the
  Quint harness `specs/quint/refinement/services/protected-app-update-promotion.mjs:14-17`,
  `specs/quint/services/manifest.json:2871,2917-2920`, `scripts/ci/private-artifact-identity.json` and
  `scripts/ci/qualified-app-update.py` all depend on those names.
- `npm run verify` stays the local command that AGENTS.md requires. CI runs its parts as separate lanes.

---

## 1. Workflows today

### 1.1 Inventory

Health covers the last 40 runs (`gh run list --workflow <file> --limit 40`, 2026-11-11). "Pending" means no
conclusion yet: queued or running. Costs come from `research/ci-and-formal.md` §1 unless a step is named.

| Workflow | Triggers | Jobs | Cost per run | Health (last 40) | Produces required-check name |
|---|---|---|---|---|---|
| `browser.yml` "Browser MVP" | push `main`,`develop`; `pull_request`; cron `23 7 * * *`; dispatch (`cross_browser`) | `changes` (reusable) → `verify` "Repository verification" (whole `npm run verify`: Quint check 25 min, Lemma, typecheck, ~1,000-file `npm test` at `ALPHA_TEST_CONCURRENCY=1`, build, audit, plus the proof renderer and the reachability report), `formal` "Changed-model proofs" (`quint:prepare-history` + `quint:changed`), `browser` (1 or 6 Chromium shards), `production`, `result` "Browser MVP result", `storage` (dispatch only, Firefox/WebKit ×2) | verify 113 min before being killed at 120; formal 1–118 min; each shard 22–25 min; timeouts 180/180/60/25 | 0 success, 18 cancelled, 22 pending | `Repository verification`, `Browser MVP result` |
| `android.yml` "Android foundation" | push `main`,`develop`; `pull_request`; dispatch | `changes` → `build` (toolchain, `npm ci`, json jar, Kotlin, the whole `npm run verify` again on dispatch, the upstream `stage-launcher-overlay.node.test.ts`, `calendar-bridge.py` ×2, `android:build --allow-unpackaged-runtime --skip-instrumentation`, bundle audit, inline manifest check, `aosp:stage --development`), `result` "Android foundation result" | ~10 min; timeout 120 | 1 success, 20 cancelled, 19 pending | `Android foundation result` |
| `resident-prepare.yml` | `pull_request`; dispatch | `changes` → `prepare` (`test-resident-phase.py`, `agent:prepare`, Cloud recording signature, `npm ci`, prepare-client, `calendar-managed-rejection.test.mjs`, `agent:test-digest-restart`, worker proof + `export-browser-proof.ts worker`) | ~6 min; timeout 70 | 1 success, 22 cancelled, 17 pending | none |
| `changes.yml` | `workflow_call` | `changes`: `node scripts/ci/affected.ts` → 10 outputs | 1 min, called three times per event | n/a | none |
| `lemma-check.yml` | PR `paths:` (`apps/app/src/**`, `specs/lemma/**`, `scripts/check-lemma.ts`, `LemmaScript-files.txt`, `lemmascript.json`, `package-lock.json`); push `main`,`develop`; dispatch | `proofs`: inline Dafny install that writes `DAFNY` to `$GITHUB_ENV` rather than `PATH`, then `lemma:check` | 2–23 min; timeout 30 | 4 success, 1 failure, 30 cancelled, 5 pending | none |
| `quint-model-check.yml` | PR `paths:` (`specs/quint/**`, `check-quint.ts`, `quint-lib.ts`); cron `17 6 * * *`; dispatch (`models`) | `verify`: `quint:verify --steps=6` over all 379 models, then `quint:compare` (4 legacy models) and `quint:temporal` (3 legacy models) | timeout 240; never completed | 37 cancelled, 3 pending | none |
| `resident-android.yml` | **every push to `main`**; push `develop` and cron `23 6 * * *` only when `vars.ELIZA_RESIDENT_QUALIFICATION` is set; dispatch (`build` / `publish-qualification`) | `publish-qualification` (calls the carrier), `build` (~60 steps, timeout 180), `native` (emulator, 100), `recovery-ui` (emulator, 55) | 3 h build plus two emulator jobs | 8 failure, 22 cancelled, 10 skipped | none |
| `android-emulator.yml` | dispatch (`suite`) | `build` (150), `instrumentation` (90), `browser-reading` (90), `fused-speech` (60, cannot run: `build` refuses `fused-speech`/`all` at :72-76) | emulator jobs | 6 runs, 0 success (research) | none |
| `digest-restart.yml` | dispatch; weekly cron and main-push `paths:`, both gated on `vars.DIGEST_RESTART_AUTOMATIC` | `digest-restart` (`agent:prepare` + `agent:test-digest-restart`) | 7 min | duplicate of a `resident-prepare.yml` step | none |
| `bun-spawn-seccomp.yml` | dispatch | one-off glibc/musl reproduction | 10 min; 2 runs on 2026-10-03 | n/a | none |
| `reproduce-paradee-model.yml` | dispatch | macOS model-conversion reproduction | never run | n/a | none |
| `embedding-qualification-carrier.yml` | `workflow_call` (one caller: `resident-android.yml:53-62`) | `publish` | 10 min | n/a | none |
| `verify-cloud-signing-input.yml` | `workflow_call` (one caller: `release-cloud-app-signing.yml:23-28`) | `admit` | 10 min | n/a | none |
| `release-app-signing.yml` | dispatch, `main` only, environment `release` | fixture APK signing proof | 30 min; 2 runs | n/a | none |
| `release-cloud-app-signing.yml` | dispatch, environment `release` | `admit` → `sign` | 30 min; 3 runs | n/a | none |
| `release-custody-proof.yml` | dispatch, environment `release` | `verify` | 5 min; 2 runs | n/a | none |
| `release-os-ota-signing.yml` | dispatch, environment `release` | `sign` | 120 min; 6 runs | n/a | none |
| `publish-qualified-app-update.yml` | dispatch, environment `release` | `admit` → `publish` | 60 min; never run | n/a | none |

### 1.2 What a typical change costs today

- **One change runs up to four times.** It runs on the PR to `main`, on the `main` push, on the `main`→`develop`
  sync PR and on the `develop` push. `browser.yml`, `android.yml` and `lemma-check.yml` trigger on all four.
  `resident-android.yml` also builds for 3 h on every `main` push.
- **`scripts/ci/affected.ts:25`** sets `verify = true` for every path that is not reference-only. A docs-free PR
  therefore always pays for the roughly 2 h verify job and the `formal` job.
- **The catch-all at `affected.ts:48-49`** treats any unmatched path as a change to everything. That includes every
  `scripts/**` file except `check-quint.ts`, `quint-lib.ts` and `storage-specs.ts`, every `specs/lemma/**` file,
  `LemmaScript-files.txt`, `lemmascript.json`, `package.json` and every workflow other than three. Each such change
  selects browser, android and prepare, which means six browser shards and an APK build.
- **`npm ci` runs about 10 times** on an `apps/app` PR (verify, formal, 6 shards, production, android), plus once more
  in `lemma-check`. There is no `node_modules` cache.
- **Work is duplicated across jobs:**
  - Lemma runs in verify and in `lemma-check.yml`.
  - Composition refinement runs in `npm test` and in `production` (`browser.yml:211-214`).
  - Apalache runs in `formal` and in `quint-model-check.yml`.
  - Digest restart runs in `resident-prepare.yml` and in `digest-restart.yml`.
  - `test-resident-phase.py` runs in `resident-prepare.yml:31` and `resident-android.yml:244`.
  - The recovery-guard Python tests run in `npm test` and `resident-android.yml:569-570`.
  - The upstream overlay test runs in `android.yml:83` and `resident-android.yml:272`.
  - `setup-bun` appears twice in one job (`android.yml:31,64`).

### 1.3 Required checks today

- `scripts/ci/required-checks-ruleset.json:19-21` names the intended checks: `Repository verification`,
  `Browser MVP result` and `Android foundation result`, each with `integration_id 15368` and
  `strict_required_status_checks_policy: false`.
- None of them is enforced. `gh api repos/<repo>/rulesets` returns `[]`, and the `main` branch protection has no
  `required_status_checks` block. `browser.yml:237` says the same ("No ruleset is installed (P-57)").
- `scripts/ci/read-required-checks.ts` is an owner tool that compares the JSON with GitHub. CI never runs it.
- The plan below keeps all three names producible on every PR, so an owner who installs the ruleset later needs no
  workflow change. This holds whatever the owner decides (D12).

---

## 2. Target: the minimal set of workflows

**18 files become 9.**

| File after the change | Comes from | Triggers |
|---|---|---|
| `.github/workflows/ci.yml` (new) | merges `browser.yml`, `android.yml`, `resident-prepare.yml`, `changes.yml`, `lemma-check.yml`, `quint-model-check.yml` | `pull_request` (no `paths:` filter); cron `23 7 * * *`; `workflow_dispatch` (inputs `cross_browser: boolean`, `quint_models: string`). **No `push` trigger.** |
| `.github/workflows/resident-android.yml` | itself, simplified | unchanged: `main` push builds the unsigned candidate; dispatch; var-gated `develop` push and cron. Emulator jobs leave the push path (§6, CI-7). |
| `.github/workflows/android-emulator.yml` | itself, minus `fused-speech` | dispatch only |
| `.github/workflows/embedding-qualification-carrier.yml` | itself, made a standalone dispatch | `workflow_dispatch` (its three inputs move here from `resident-android.yml`) |
| `.github/workflows/release-cloud-app-signing.yml` | absorbs `verify-cloud-signing-input.yml` as its `admit` job | dispatch |
| `.github/workflows/release-custody-proof.yml` | unchanged | dispatch |
| `.github/workflows/release-os-ota-signing.yml` | unchanged | dispatch |
| `.github/workflows/publish-qualified-app-update.yml` | unchanged | dispatch |
| `.github/workflows/release-app-signing.yml` | unchanged; **deletion is held for the owner** (scripts-01 owner Q3) | dispatch |

**Deleted:**
- `browser.yml`, `android.yml`, `resident-prepare.yml` and `changes.yml` (merged into `ci.yml`).
- `lemma-check.yml`. It is broken (see §1.1) and duplicates the verify job.
- `quint-model-check.yml`. Its sharded Apalache run becomes the nightly `quint-verify` job in `ci.yml`.
- `digest-restart.yml`. It duplicates the `prepare` step.
- `bun-spawn-seccomp.yml`, deleted together with `scripts/ci/reproduce-bun-spawn-seccomp.py`.
- `reproduce-paradee-model.yml`, deleted together with `scripts/ci/reproduce-paradee-model.py` and its block at
  `test/ci-pin-bound-scripts.test.mjs:25-35`.
- `verify-cloud-signing-input.yml` (merged into `release-cloud-app-signing.yml`).

**New composite actions.** None exist today; `.github/actions/` is absent.

| Action | What it does | Replaces |
|---|---|---|
| `.github/actions/node-setup/action.yml` | Checkout (input `submodules`, default `true`; input `fetch-depth`), `setup-node` from `.nvmrc` with npm cache, `node_modules` cache (§5), `npm ci` on a cache miss, and `npm run upstream:prepare-client` when input `prepare-client: true` | 11 copies |
| `.github/actions/android-toolchain/action.yml` | Java 21, `setup-gradle`, `setup-android`, Python 3.12, `sdkmanager 'platforms;android-36' 'build-tools;36.0.0' 'ndk;28.2.13676358'`, CMake 4.0.3, `ANDROID_NDK_HOME` | 3 copies: `android.yml:34-56`, `resident-android.yml`, `android-emulator.yml` |
| `.github/actions/android-emulator/action.yml` | KVM udev rule, capacity floor, `android-emulator-runner` (pixel_7, API 35), inputs `script` and `emulator-options` | 5 copies |
| `.github/actions/free-disk/action.yml` | Fixed directory list, then a free-GiB assertion (input `min-gib`) | 4 copies: `browser.yml:155-161`, `resident-android.yml:123-187,461-481,545-565` |
| `.github/actions/prepared-sdk/action.yml` | `setup-bun` 1.4.2, then `node scripts/prepare-local-agent.ts`, then export `ALPHA_BUN`, `ALPHA_CLOUD_COLLECTOR_SOURCE` and `ALPHA_ELIZA_SOURCE` | the inline `verifySource` one-liner in `browser.yml:60-68` and `android.yml:68-77`. The one-liner becomes `node scripts/prepare-local-agent.ts --print-source`, a new flag. |

The GCP release-storage composite (scripts-01) is **not** part of this plan. The release workflows are parsed step by
step by `protected-app-update-promotion.mjs:37-77`, including the `secretSteps` check at :56. They change only as
CI-8 describes.

---

## 3. Path → lane matrix

### 3.1 Lanes, jobs and commands (`ci.yml`)

| Lane | `ci.yml` job(s) | Command(s) | Shards / timeout |
|---|---|---|---|
| **renderer** (typecheck, build, audit) | `renderer` | `npm run typecheck` (includes `typecheck:scripts`); `node scripts/cloud-deployment.ts --check`; `npm run build`; `npm run audit:bundle`; `npm run build:test-mocks -- --outDir ../../test-results/test-mocks-web` followed by `node scripts/audit-production-bundle.ts test-results/test-mocks-web --expect-test-mocks` (moved from `production`); the proof-renderer build, audit and `export-browser-proof.ts renderer`, moved unchanged from `browser.yml:86-104` until the owner answers scripts-04 Q2 | 1 / 20 min |
| **host** (integration tests) | `host` | `node scripts/run-node-tests.ts --suite=host --shard=${{ matrix.shard }}/4`, or `--files=<json>` in narrow mode. Setup: `node-setup` with `prepare-client`, Java 21, `scripts/ci/prepare-host-test-json.sh`, Playwright Chromium (22 host harnesses launch it), Python 3.12 | 4 (1 in narrow mode) / 30 min |
| **quint** | `quint-models` | `npm run quint:prepare-history` (until `specs/quint/legacy` is retired, D11), then `node scripts/ci/check-changed-models.ts --phases=check,verify`. The new `check` phase runs scenarios and simulation for the selected models. | 1 / 90 min |
| | `quint-refinement` | `node scripts/run-node-tests.ts --suite=quint --shard=${{ matrix.shard }}/4`, or `--files=<json>` in narrow mode. Setup: Java 21, json jar, `node test/fixtures/kotlin-tools.mjs --prepare`, Chromium | 4 (1 in narrow mode) / 40 min |
| | `quint-verify` (schedule and dispatch only) | `node scripts/check-quint.ts verify --steps=6 --shard=${{ matrix.shard }}/8 ${MODELS:+--models=$MODELS}`; shard 1 also runs the two legacy `compare`/`temporal` steps from `quint-model-check.yml:46-54` until `specs/quint/legacy` is retired | 8 / 120 min |
| **lemma** | `lemma` | `bash scripts/ci/prepare-dafny.sh`, then `npm run lemma:check` with `LEMMA_REQUIRE_BACKEND=1` | 1 / 10 min |
| **browser** (Playwright journeys) | `browser` | `node scripts/ci/run-browser.ts --shard=n/N` with `ELIZA_DEV_ALLOW_TEST_MOCKS=1`. Shard 1 keeps the local-agent profile step (`browser.yml:178-183`) until the tests plan adds a `local-agent` Playwright project. | the existing `browserPlan`: 1 or 6 / 60 min |
| | `browser-production` | `npm run test:browser:production` | 1 / 25 min |
| | `storage` (dispatch with `cross_browser` only) | unchanged from `browser.yml:259-308` | 4 / 30 min |
| **android build** (with **AOSP** staging) | `android` | `android-toolchain`; `prepare-local-agent.ts --source-only`; `npm run android:build -- --allow-unpackaged-runtime --skip-instrumentation`; Calendar bridge (CI-9); `node scripts/audit-production-bundle.ts web-dist`; manifest check moved into `scripts/verify-apks.ts --require-distribution`; `npm run aosp:stage -- --apk artifacts/launcher-debug.apk --development` (the AOSP lane) | 1 / 45 min |
| **prepare** (resident source, prepared-SDK host tests) | `prepare` | the `resident-prepare.yml:31-58` steps without `test-resident-phase.py`; then the prepared-SDK test files (§3.3) via `node --test` with `ALPHA_REQUIRE_PREPARED_SDK=1` | 1 / 30 min |
| **android emulator** | not in `ci.yml` | `android-emulator.yml` (dispatch); `resident-android.yml` `native` and `recovery-ui` (dispatch, plus the var-gated schedule) | n/a |
| **AOSP image boot** | none | No CI lane exists, and none is added. Cuttlefish/Pixel image boot stays an owner/device step. An `aosp:stage` pass in the `android` job is staging evidence only (AGENTS.md: never claim one proves another). | n/a |
| **release** | no PR job | Release workflows stay dispatch-only. On PRs, release inputs are covered by the host lane (`python-suites.test.mjs`, which gains `release-custody-proof.test.py`, `sign-os-ota.test.py`, `qualified-app-update.test.py`) and by the quint lane through the manifest `sources` of `AppUpdateCandidate` and `ProtectedAppUpdatePromotion`. | n/a |

The `changes` job runs on every event. It does three things:
1. Runs a pinned `actionlint` binary over `.github/workflows/*.yml`. This replaces the workflow-text tests (T1).
2. Runs `node scripts/ci/affected.ts`.
3. Writes one output, `plan`, a JSON object holding a boolean per lane plus the narrow-mode lists and the browser
   plan.

### 3.2 Matrix

A changed path collects the lanes of **every** row it matches (union). A path that matches no row selects **all**
lanes. `schedule` and `workflow_dispatch` select all lanes. Abbreviations: R = renderer, H = host, Q = quint
(`quint-models` + `quint-refinement`), L = lemma, B = browser (`browser` + `browser-production`), A = android (+ AOSP
staging), P = prepare.

| # | Path glob | R | H | Q | L | B | A | P | Notes |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `docs/**` except `docs/prd.md`; `design/**`; `AGENTS.md`; `LICENSE`; `LICENSE.md`; `specs/**/*.md`; `.github/**/*.md`; `.gitignore` | | | | | | | | nothing runs |
| 2 | `README.md`, `docs/prd.md` | | narrow | | | | | | H runs only `test/docs-links.test.mjs` |
| 3 | `apps/app/src/**` | ✓ | ✓ | ✓ | `*.ts` only | ✓ | | | Lemma: `check-lemma.ts:55-59` refuses `//@` in unlisted files, so any `.ts` can change its result. No A on PR (nightly covers it). |
| 4 | `apps/app/public/**`, `apps/app/index.html` | ✓ | ✓ | ✓ | | ✓ | ✓ | | packaged assets (`android-gzip-assets.ts`) |
| 5 | `vite.config.ts`, `app.config.json` | ✓ | ✓ | | | ✓ | ✓ | | |
| 6 | `capacitor.config.ts` | ✓ | | | | | ✓ | | in `tsconfig.json` `include` |
| 7 | `android/**` | | ✓ | ✓ | | | ✓ | | Q: composition hashes `sourcePaths()` (`quint-lib.ts:9-39`) and native harnesses `javac` the plugins |
| 8 | the paths of `browserReadAndroid` (`affected.ts:12-15`), derived at run time (CI-4) | | | | | ✓ | | | added to row 7 |
| 9 | `android/aosp/**`, `scripts/aosp-*.ts`, `scripts/aosp-unsigned-debug.init.gradle`, `scripts/stage-aosp.ts`, `scripts/stage-aosp-native.py`, `scripts/prepare-aosp-apk.py`, `scripts/stage-alpha-os-branding.py`, `scripts/generate-alpha-os-branding.ts`, `scripts/stage-os-update-enrollment.ts`, `scripts/verify-aosp-*.ts`, `scripts/verify-pixel10a-*.ts`, `scripts/pixel10a-source-contract.ts`, `scripts/verify-cuttlefish-launcher.ts`, `scripts/sign-aosp-release.ts`, `scripts/fetch-alpha-os-preset-inputs.py` | (`.ts`) | ✓ | | | | ✓ | | the AOSP lane, which is the `aosp:stage` step of A |
| 10 | `test/browser/**`, `playwright.config.ts`, `scripts/storage-specs.ts` | | | | | ✓ | | | B narrow when every path is an existing spec (current `browserPlan`) |
| 11 | `test/browser/helpers/**` | | | ✓ | | ✓ | | | legacy maps refinement imports the helpers |
| 12 | `test/quint-*.test.mjs`, `test/fixtures/quint/**` | | | ✓ | | | | | `quint-refinement` narrow when every Q path is a `test/quint-*.test.mjs` |
| 13 | `test/*.test.mjs`, `test/*.test.ts` (not `quint-*`) | | narrow | | | | | | H runs only the changed files |
| 14 | `test/*.test.py` | | narrow | | | | | | H runs `test/python-suites.test.mjs` |
| 15 | the 11 prepared-SDK test files (§3.3) | | | | | | | ✓ | added to row 13 |
| 16 | `test/fixtures/**` (not `quint/`), `test/support/**`, `test/own-provider/**` | | ✓ | ✓ | | | | | full H |
| 17 | `specs/quint/**` (not `*.md`), `scripts/check-quint.ts`, `scripts/check-quint-refinement.ts`, `scripts/prepare-quint-history.ts`, `scripts/ci/check-changed-models.ts`, `specs/quint/tlc.json` | (`.ts`) | | ✓ | | | | | |
| 18 | `scripts/quint-lib.ts` | ✓ | | ✓ | ✓ | | | | `check-lemma.ts` imports it |
| 19 | `specs/lemma/**`, `LemmaScript-files.txt`, `lemmascript.json`, `scripts/check-lemma.ts` | (`.ts`) | | | ✓ | | | | |
| 20 | every path listed in a manifest `sources` array (`specs/quint/{application,services,native,legacy}/manifest.json`, read by `affected.ts` at run time) | | | ✓ | | | | | added to the path's own row; this is how `resident-android.yml`, the release workflows and release scripts reach Q |
| 21 | `scripts/**/*.ts`, `scripts/**/*.tsx`, not matched by rows 9, 17–19 | ✓ | ✓ | | | closure | closure | closure | **fixes the catch-all.** B/A/P only when the file is in that lane's import closure (§3.3). |
| 22 | `scripts/**/*.py`, `scripts/**/*.sh`, `scripts/**/*.json`, `scripts/**/*.gradle`, `scripts/fixtures/**`, `scripts/ci/fixtures/**`, not matched by rows 9, 23, 24 | | ✓ | | | | | | Python CI units, release helpers and resident/emulator helpers are covered on PRs by their Python tests only, because `resident-android.yml` and release workflows never run on PRs |
| 23 | `scripts/ci/calendar-bridge.py`, `scripts/ci/calendar-bridge.init.gradle`, `scripts/host-speech-assets.json`, `licenses/**` | | ✓ | | | | ✓ | | |
| 24 | `scripts/ci/prepare-host-test-json.sh`, `scripts/ci/prepare-dafny.sh`, `test/fixtures/kotlin-tools.mjs` | | ✓ | ✓ | ✓ | | ✓ | | setup scripts of those lanes |
| 25 | `.github/workflows/ci.yml`, `.github/actions/**`, `scripts/ci/affected.ts`, `scripts/ci/required-result.ts`, `scripts/ci/run-browser.ts`, `scripts/run-node-tests.ts` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | the files that configure every lane |
| 26 | `.github/workflows/resident-android.yml`, `android-emulator.yml`, `embedding-qualification-carrier.yml`, `release-*.yml`, `publish-qualified-app-update.yml` | | | | | | | | actionlint in `changes` only (plus Q through row 20 where a manifest lists the file) |
| 27 | `package.json`, `package-lock.json`, `.nvmrc`, `upstream.lock.json`, `vendor/eliza` (gitlink), `.gitmodules`, `tsconfig.json` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | root build inputs |
| 28 | `tsconfig.scripts.json` | ✓ | | | | | | | |
| 29 | anything else | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | unknown means all, which keeps today's safety property |

### 3.3 Import closures and file lists that `affected.ts` computes

`affected.ts` does a static relative-import scan of the entries below. The scan matches
`from|import(|import '…'` specifiers that start with `./` or `../`, recurses into `scripts/**` and stops at `apps/`,
`vendor/`, `.eliza/` and `node_modules/`. Verified with a scratch scan of the current tree. Files that are only spawned
are listed as entries explicitly.

- **browser closure.**
  - Entries: `vite.config.ts`, `playwright.config.ts`, every file under `test/browser/`.
  - Current result: `scripts/{agent-embeddings,browser-cloud-dev-bridge,browser-full-reload,browser-pdf-assets,build-policy-source,cloud-deployment-policy,cloud-deployment,cloud-email-code,cloud-resident-host,cloud-sdk-authority,combined-agent-source,copy-file-clone,core-state-patch,gmail-agent-dev-broker,gmail-agent-read-host,live-voice-session,local-agent-dev-bridge,local-agent-dev-storage,local-agent-source,local-ocr-assets,native-google-host-artifact,native-view-policy,prepare-client-features,private-runtime-launch,random-id,storage-specs,subscription-entitlement,upstream-native-source,workflow-worker-artifact}.ts`
    and `scripts/audit-production-bundle.ts`, which `test/browser` imports directly.
- **android closure.**
  - Entries: `scripts/build-android.ts`, `scripts/verify-apks.ts`, `scripts/stage-aosp.ts`,
    `scripts/android-build-preflight.ts`, `scripts/prepare-local-agent.ts`, `scripts/generate-sbom.ts`,
    `scripts/gradle-verification.ts`, `scripts/audit-production-bundle.ts`.
  - Current result: 37 files, for example `apk.ts`, `android-host.ts`, `android-gzip-assets.ts`,
    `generate-licenses.ts`, `release-blockers.ts`, `update-channel.ts`, `voice-host.ts`, `toolchain.ts` and every
    `aosp-*.ts` that `stage-aosp.ts` imports.
- **prepare closure.**
  - Entries: `scripts/prepare-local-agent.ts`, `scripts/check-cloud-recording-signature.ts`,
    `scripts/test-local-digest-restart.ts`, `scripts/build-workflow-worker.ts`, `scripts/ci/export-browser-proof.ts`,
    `scripts/test-local-redaction.ts`, `scripts/dev-local.ts`, `scripts/dev-cloud.ts`,
    `scripts/start-local-remote.ts`, `scripts/start-cloud-qa.ts`, and the prepared-SDK test files below.
- **prepared-SDK test files.** These are the test files that read `ALPHA_REQUIRE_PREPARED_SDK`,
  `ALPHA_ELIZA_SOURCE` or `ALPHA_CLOUD_COLLECTOR_SOURCE`:
  - `test/agent-embedding-overrides.test.mjs`
  - `test/agent-identity.test.mjs`
  - `test/agent-model-selection.test.mjs`
  - `test/calendar-managed-rejection.test.mjs`
  - `test/cloud-resident-authority.test.mjs`
  - `test/cloud-resident-embedding-route.test.mjs`
  - `test/cloud-resident-full-profile.test.mjs`
  - `test/cloud-resident-host.test.mjs`
  - `test/cloud-sdk-routing.test.mjs`
  - `test/dev-local-launcher.test.mjs`
  - `test/development-cartesia-conversation.test.mjs`
  - `test/digest-restart-input.test.mjs`

  `test/ci-required-checks.test.mjs` also reads one of these variables, but it is deleted in CI-1. The `host` lane runs
  these files without a prepared SDK, so they self-skip there. The `prepare` lane runs them with
  `ALPHA_REQUIRE_PREPARED_SDK=1`. This replaces the prepared-SDK setup inside today's verify job.
- **The Lemma inventory.** `affected.ts` reads `LemmaScript-files.txt` (23 files) but needs no closure: row 3 already
  covers the inventory files.

### 3.4 Effect

| Change | Lanes today | Lanes after |
|---|---|---|
| `docs/prd.md` | verify (~2 h) + formal | `changes` plus one host test, about 2 min |
| one `apps/app/src/**/*.tsx` | verify, formal, 6 browser shards, production, android, then again on push | R, H×4, Q, L, B×6, production. All parallel; wall clock is set by browser shards, about 25 min, plus Q until the formal plan narrows composition hashing. |
| one Android Java file | verify, formal, android | A, H×4, Q |
| one `scripts/owner/*.ts` | verify, formal, browser×6, android, prepare (catch-all) | R, H×4 |
| one `scripts/ci/*.py` | everything (catch-all) | H |
| `specs/lemma/**` | everything (catch-all) | L, about 2 min |
| one `test/foo.test.mjs` | verify | H narrow (one file) |
| `resident-android.yml` | verify | actionlint, plus Q for the two models that list it |

---

## 4. Required checks when a lane is skipped (no settings change)

**Constraints:**
- No `paths:` or `paths-ignore:` on `ci.yml`'s `pull_request` trigger. A workflow that does not start leaves required
  checks pending.
- Lane jobs are skipped with job-level `if:` instead. The required names are produced by jobs that **always run**.

**One gate job.** It is a single always-run job that turns every lane result into one pass or fail, using the existing
`scripts/ci/required-result.ts`:

```yaml
  gate:
    name: CI gate
    needs: [changes, renderer, host, quint-models, quint-refinement, lemma, browser, browser-production, android, prepare]
    if: always()
    runs-on: ubuntu-24.04
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with: { sparse-checkout: scripts/ci }
      - env:
          PLAN: ${{ needs.changes.outputs.plan }}
          RESULTS: ${{ toJSON(needs) }}
        run: node scripts/ci/required-result.ts --plan-env=PLAN --needs-env=RESULTS
```

**Rules inside `required-result.ts`** (extended in CI-4; the current `name=result:selected` argument form stays
supported):
- `changes` must be `success`.
- A lane whose `plan.<lane>` is `true` must be `success`.
- A lane whose `plan.<lane>` is `false` must be `skipped`. Any other result, including `success` from a job whose
  `if:` drifted out of step with the plan, fails the gate.
- A matrix job reports its aggregate result, so one failing shard fails the lane.

**The three required names as aliases.** Each name is a three-line job that mirrors the gate. Each runs even when
the gate fails, so the check reports `failure` and never stays pending:

```yaml
  repository-verification:
    name: Repository verification
    needs: gate
    if: always()
    runs-on: ubuntu-24.04
    timeout-minutes: 2
    steps:
      - run: test "$GATE" = success
        env: { GATE: '${{ needs.gate.result }}' }
  browser-mvp-result:      # same body, name: Browser MVP result
  android-foundation-result: # same body, name: Android foundation result
```

Why aliases:
- Status contexts are job names under GitHub Actions (`integration_id 15368`), not workflow file names. Moving them
  from `browser.yml`/`android.yml` into `ci.yml` keeps the contexts byte-identical.
- No other workflow may define a job with any of these three names. A duplicate context would make the result
  ambiguous. CI-5 deletes the old files in the same commit that adds `ci.yml`.
- `scripts/ci/required-checks-ruleset.json` stays untouched (D12). The cross-file proposal to drop
  `Repository verification` from it waits for the owner's ruleset change.
- With no ruleset installed today, the aliases cost about 10 s of runner time each, and installing the ruleset later
  needs no workflow edit.

**Narrow mode.** In narrow mode, for example a docs-only PR, every lane job is skipped. `changes` succeeds, the gate
sees every unselected lane `skipped` and passes, and the three aliases report success within about 1 minute.

---

## 5. Caching and concurrency

### 5.1 Caches

Action SHAs follow the repo's existing `@<sha> # vX.Y.Z` convention. `actions/cache` gets the commit SHA of its
current v4 release, which is the one new pin.

| What | Path | Key | Where | Rule |
|---|---|---|---|---|
| `node_modules` | `node_modules` | `nm-${{ runner.os }}-${{ hashFiles('.nvmrc','package-lock.json') }}` | `node-setup` | Skip `npm ci` on an exact hit; no `restore-keys`, so there are no partial trees. `setup-node cache: npm` stays for misses. `package.json` has no `postinstall`/`prepare` hook that writes outside `node_modules`; the seven `pre*` hooks run `upstream:prepare-client`, which `node-setup` runs explicitly. |
| Playwright browsers | `~/.cache/ms-playwright` | `pw-${{ runner.os }}-1.62.1-${{ browser }}` (version from `package.json` `@playwright/test`) | host, quint-refinement, browser, browser-production, storage | On a hit, run only `npx playwright install-deps <browser>` (system packages are not cached) |
| org.json jar | `~/.cache/alpha-host-json/json-20250517.jar` | `json-20250517-3ea61b2a` | host, quint-refinement, android | `prepare-host-test-json.sh` writes the jar to `${ALPHA_TOOL_CACHE:-$RUNNER_TEMP}` and skips `curl` when the existing file passes the same `sha256sum --check`. This removes the Maven 429 retry wait (`:4-7`). |
| Dafny 4.11.0 | `~/.cache/alpha-dafny-4.11.0` | `dafny-4.11.0-a46a9ff7` | lemma | `prepare-dafny.sh` uses `${ALPHA_TOOL_CACHE:-$RUNNER_TEMP}` and skips download and unzip when the version check at `:12` passes |
| Quint / Apalache | `~/.quint` | `quint-0.33.1-apalache-0.62.4` | quint-models, quint-verify | versions from `package.json:100` and `check-quint.ts:144` |
| Gradle | managed by `gradle/actions/setup-gradle` | built in | android | `cache-read-only: ${{ github.event_name == 'pull_request' }}`, so PRs read and the nightly run on `main` writes |

Not cached:
- `.eliza/client-features`, the `upstream:prepare-client` projection. It is derived from the vendor checkout plus
  scripts. A stale projection would mask real failures, so it is rebuilt once per job that needs it.
- The `prepare-local-agent.ts` SDK graph. The `prepare` lane exists to prove a fresh preparation.

### 5.2 Concurrency

| Workflow | `group` | `cancel-in-progress` |
|---|---|---|
| `ci.yml` | `ci-${{ github.event_name }}-${{ github.event.pull_request.number \|\| github.ref }}` | `${{ github.event_name == 'pull_request' }}`. A new push to a PR cancels the superseded run. The event name in the group keeps a dispatch from cancelling the nightly schedule, as `browser.yml:21` does today. |
| `resident-android.yml` | unchanged (`:48-51`) | unchanged |
| `android-emulator.yml` | unchanged: `android-emulator-${{ github.ref }}-${{ inputs.suite }}` | `true` |
| `embedding-qualification-carrier.yml` | `embedding-carrier-${{ github.ref }}` | `false`. It is a publication and must never be cancelled halfway. |
| `release-*.yml`, `publish-qualified-app-update.yml` | unchanged (`release-signing`, `release-custody-proof`, `preserving-os-ota-signing`, `alpha-app-stable-publication`) | `false` (unchanged) |

Dropping `push` from `ci.yml` removes the per-SHA uncancellable push groups (`browser.yml:21-22`,
`android.yml:13-14`) and three of the four runs per change. The `main`→`develop` sync PR still runs its selected
lanes. Whether `develop` stays is scripts-01 owner Q5. Changes merged under `strict: false` are still covered by the
daily `23 7 * * *` run, which selects all lanes.

---

## 6. Execution units, ordered

Each unit is one commit. It ends with `actionlint` clean. Every unit that changes `ci.yml`, `affected.ts` or a lane
ends with a PR run in which every lane the unit touches was selected and green, triggered with `workflow_dispatch` on
the branch. A unit that edits a file parsed by a Quint harness ends with that harness passing locally, for example
`node --test test/quint-protected-app-update-promotion*.test.mjs test/quint-app-update-candidate*.test.mjs`.

**CI-1: Delete the workflow-text tests.** Prerequisite for every later unit (T1, D10).
- Delete:
  - `test/ci-required-checks.test.mjs`
  - `test/ci-ruleset-readback.test.mjs`
  - `test/embedding-workflow-forwarding.test.mjs`
  - the HOST case at `test/ci-pin-bound-scripts.test.mjs:12-22` (CI-9 removes the pin itself)
  - the Paradee block at `test/ci-pin-bound-scripts.test.mjs:25-35`, then the whole file, since nothing is left
- From `test/ci-emulator-evidence.test.mjs`, delete every case that reads `.github/workflows/*` (35 reads, including
  `:89`). Keep only cases that call `scripts/ci/emulator-suite.ts` exports.
- Delete the workflow-text parts of `test/qualified-app-update.test.mjs`, `test/app-update-candidate.test.mjs:210`
  and `test/hosted-native-inputs.test.py`. Keep their script-behaviour cases.
- Update the comments that name `browser.yml` at `test/cloud-resident-embedding-route.test.mjs:10` and
  `test/cloud-resident-full-profile.test.mjs:89`.
- `test/ci-emulator-evidence.test.mjs` already has an uncommitted one-line change in this worktree. Rebase on it and
  do not revert it.
- Add the pinned `actionlint` step to the `changes` job in `changes.yml`. CI-5 moves it into `ci.yml`.

**CI-2: Delete dead workflows and their scripts.**
- Delete `.github/workflows/{lemma-check,digest-restart,bun-spawn-seccomp,reproduce-paradee-model}.yml`,
  `scripts/ci/reproduce-bun-spawn-seccomp.py` and `scripts/ci/reproduce-paradee-model.py`.
- In `android-emulator.yml`:
  - delete the `fused-speech` job (`:267-336`), the `fused-speech` and `all` options, and the refusal at `:72-76`;
  - change the `suite` input description to name two suites.
- Delete `scripts/ci/speech-candidate.ts` and the `FUSED_SPEECH_CLASSES` export in `scripts/ci/emulator-suite.ts`.
- In `scripts/owner/emulator-campaign-check.ts`:
  - point `:66` at `ci.yml` job `prepare` (step "digest-restart");
  - delete the `digest-restart.yml` row at `:204`;
  - delete the fused-speech rows at `:120` and `:221`.
- Update `test/owner-emulator-campaign-check.test.mjs:57` to match.
- Remove `bun-spawn-seccomp|digest-restart` from `affected.ts:38`.
- Coverage: Lemma still runs inside `npm run verify` in `browser.yml`, and digest restart still runs in
  `resident-prepare.yml`. `fused-speech` could never run.

**CI-3: Add composite actions** (new files only).
- Add `.github/actions/{node-setup,android-toolchain,android-emulator,free-disk,prepared-sdk}/action.yml` (§2).
- Add `--print-source` to `scripts/prepare-local-agent.ts`. It prints `sourceDirectory(cwd)` after `verifySource`.
- Switch `browser.yml`, `android.yml`, `resident-prepare.yml`, `resident-android.yml` and `android-emulator.yml` to
  the actions, keeping every step's behaviour the same.
- Delete the duplicate `setup-bun` (`android.yml:31-34`) and the duplicate `sdkmanager "build-tools;36.0.0"`
  (`resident-android.yml:490-495,578-583`).
- Add the `ALPHA_TOOL_CACHE` reuse to `scripts/ci/prepare-dafny.sh` and `scripts/ci/prepare-host-test-json.sh`.
- Add the cache entries from §5.1.
- Leave `producerJob` in `resident-android.yml` unchanged: its `env.ALPHA_APP_UPDATE_CANDIDATE` and the step order of
  `app-update-candidate.ts version` → `receipt` → the `app-native-candidate-*` upload are asserted by
  `protected-app-update-promotion.mjs:37-41`.

**CI-4: Rewrite the lane selector.**
- `scripts/ci/affected.ts`:
  - Replace `affected()` with one ordered table `const rules: Array<{match: (path) => boolean; lanes: Lane[]; narrow?: 'host'|'quint'}>`
    built from §3.2 rows 1–28. Lanes: `renderer`, `host`, `quint`, `lemma`, `browser`, `android`, `prepare`.
  - Add the closure scan from §3.3 (about 25 lines) and the manifest-`sources` union (row 20). Unmatched paths select
    all lanes.
  - Derive `browserReadAndroid` at run time with the regex that `test/ci-affected.test.mjs:73` uses today, and delete
    the hard-coded set at `:12-15`.
  - Keep `browserPlan`, `changedPaths` and the "missing diff → all" fallback.
  - On `schedule` or `workflow_dispatch`, select all lanes.
  - Push events no longer occur in `ci.yml`. A push that reaches `affected.ts` anyway selects all lanes, which is the
    current safe default.
  - Write one output, `plan=<json>`, holding `{renderer, host, host_files, quint, quint_files, lemma, browser, browser_specs, browser_shards, browser_total, browser_development, browser_production, browser_speech, android, prepare}`.
- `scripts/ci/required-result.ts`: add the `--plan-env`/`--needs-env` mode from §4, including the "unselected must be
  `skipped`" rule. Keep the positional mode, which `browser.yml`/`android.yml` use until CI-5.
- `scripts/ci/check-changed-models.ts`:
  - drop `package-lock.json` from `checkerInputs` (`:22`) and select all models only when the lock's
    `packages["node_modules/@informalsystems/quint"].version` changed;
  - add `--phases=check,verify`, where `check` runs `scripts/check-quint.ts check --models=<selected>`;
  - drop `'legacy'` from `families` (`:20`) only in the formal plan's legacy-retirement unit, not here.
- `scripts/check-quint.ts`: add `shard` to `allowedOptions` (`:15`) and filter the sorted `models` (`:35`) by
  index mod n.
- `scripts/run-node-tests.ts`:
  - `--suite=host` expands `test/*.test.mjs` and `test/*.test.ts` minus `test/quint-*`;
  - `--suite=quint` expands `test/quint-*.test.mjs`;
  - `--files=<json>` takes an explicit list, validated against `^test/[A-Za-z0-9_.-]+\.test\.(mjs|ts)$` plus
    existence;
  - `--shard=i/n` is passed through as `--test-shard` (Node 26.13.0 from `.nvmrc`);
  - the default without flags stays the same, so `npm test` and `npm run verify` do not change.
- Rewrite `test/ci-affected.test.mjs`. Keep the spawn-the-real-CLI harness (`:10-55`). Replace the `lanes()` 4-tuple
  assertions with one table of `path → expected lanes` covering every row of §3.2. Delete the `test/browser` text scan
  (`:69-82`).
- Keep the old outputs (`verify`, `browser`, `android`, `prepare`) as derived booleans until CI-5. Define
  `verify = renderer || host || quint || lemma`. The current workflows keep working in this commit.

**CI-5: Add `ci.yml` and delete the six PR workflows.**
- Write `.github/workflows/ci.yml` with these jobs:
  - `changes` (actionlint + `affected.ts`)
  - `renderer`, `host` (matrix 4), `quint-models`, `quint-refinement` (matrix 4), `lemma`, `browser` (matrix from the
    plan), `browser-production`, `android`, `prepare`
  - `quint-verify` (matrix 8, `if: github.event_name != 'pull_request'`)
  - `storage` (dispatch with `cross_browser`)
  - `gate`, plus the three alias jobs (§4)
- Use the triggers from §2, the concurrency from §5.2 and the timeouts from §3.1.
- Each lane `if:` reads `fromJSON(needs.changes.outputs.plan).<lane>`.
- In the same commit, delete `.github/workflows/{browser,android,resident-prepare,changes,quint-model-check}.yml`.
  Nothing else may define the three alias names.
- Remove the `verify`-compatibility outputs from `affected.ts` and the positional mode from `required-result.ts`.
- Steps dropped while moving:
  - **`npm run verify` on `android.yml` dispatch (`:78-82`):** covered by `renderer`, `host`, `quint` and `lemma` in
    the same run.
  - **`stage-launcher-overlay.node.test.ts` (`android.yml:83`):** it tests `vendor/eliza`. List it in
    `cross-file-actions.md` §6 as an upstream follow-up (D14).
  - **`quint:refinement --families=composition` (`browser.yml:211-221`):** already run by
    `test/quint-composition-refinement.test.mjs` in `quint-refinement`.
  - **"Report upstream develop reachability" (`browser.yml:105-107`):** warn-only, nothing reads it.
  - **`ALPHA_TEST_CONCURRENCY: '1'`:** the host suite no longer carries the 20-minute aggregates. Those run in
    `quint-refinement`, at `--test-concurrency=1` only for the three family aggregates
    `test/quint-{application,services,native}-refinement.test.mjs` until the formal plan deletes them.
  - **`test-resident-phase.py` (`resident-prepare.yml:31`):** run once, in the host Python suite (CI-6).
  - **Inline APK-manifest Node check (`android.yml:113-122`):** becomes `scripts/verify-apks.ts --require-distribution`.
- Verification: one dispatch run (all lanes) and three PRs, each green with the expected skips:
  - docs-only, where the gate passes with every lane skipped;
  - `apps/app/src`-only;
  - `android/`-only.

**CI-6: Run the Python tests once.**
- Move each test to `test/` and register it in `test/python-suites.test.mjs` (the one runner; host lane):
  - `scripts/ci/test-recovery-ui-guard.py` → `test/recovery-ui-guard.test.py`, with the four
    `scripts/ci/fixtures/recovery-*` files → `test/fixtures/android-recovery/`. Use the names from scripts-06 and keep
    the bytes verbatim.
  - `scripts/ci/test-resident-phase.py` → `test/resident-phase.test.py`. Skip off Linux instead of requiring
    `GITHUB_ACTIONS`.
  - `scripts/ci/test-resident-uid-crash-audit.py` → `test/resident-uid-crash-audit.test.py`.
  - `scripts/ci/test-acquire-resident-bun.py` → `test/acquire-resident-bun.test.py`, keeping the two transport cases.
  - `scripts/ci/release-custody-proof.test.py` → `test/release-custody-proof.test.py`.
  - `scripts/ci/sign-os-ota.test.py` → `test/sign-os-ota.test.py`.
- Delete `scripts/ci/test-pending-recovery-phases.py` (T2 transplant) and `test/resident-crash-diagnostics.test.mjs`
  (wrapper).
- Remove these runs from `resident-android.yml`:
  - `:197-198` (the moved `.test.py` files);
  - `:209` (`test-acquire-resident-bun.py`);
  - `:244` (`test-resident-phase.py`);
  - `:567-570` (the recovery-guard step).
- Point `release-custody-proof.yml:46` and `release-os-ota-signing.yml:74` at the new test paths. Both keep their
  in-workflow self-test as a pre-flight.
- `release-custody-proof.py` itself is not renamed. It is SHA-pinned by the workflow input `proof_sha256`.

**CI-7: Simplify `resident-android.yml`** (file name, producer job env and producer step order unchanged).
- Jobs `native` (`:447-449`) and `recovery-ui` (`:530-532`): add `github.event_name != 'push' &&` to `if:`. A `main`
  push then builds only the unsigned candidate. Emulator suites run on dispatch `build` and on the var-gated schedule.
  The variable stays as it is (D12).
- Delete the upstream test `node --test vendor/eliza/.../stage-launcher-overlay.node.test.ts` (`:272`).
- Remove the `publish-qualification` job (`:53-62`), the `operation` input and its five carrier inputs. Make
  `embedding-qualification-carrier.yml` `on: workflow_dispatch` with those inputs, plus the concurrency from §5.2.
- Replace the three free-disk blocks and the two emulator blocks with the CI-3 actions.
- Not in this unit (owner questions): the `embedding-artifacts.py --check-inputs` step (`:199`, scripts-04 Q3) and the
  SDK offline re-install ceremony (`:283-304,342-344`, scripts-01 Q7).

**CI-8: Merge `verify-cloud-signing-input.yml` into `release-cloud-app-signing.yml`.**
- Move its `admit` job, with outputs `plan_sha256` from `steps.verify.outputs.plan_sha256`, the
  `bash scripts/ci/verify-cloud-signing-input.sh` step and the `if:` guard at `:19`, into
  `release-cloud-app-signing.yml` as job `admit`. Delete the reusable file.
- In the same commit, update the harness `specs/quint/refinement/services/protected-app-update-promotion.mjs`:
  - delete `verifier` (`:15`);
  - replace `assert.equal(signing.admit.uses, './' + verifier)` (`:43`) with assertions on `signing.admit.steps`;
  - read `verify` from `signing.admit` instead of the deleted file (`:48-50`).
- Remove `.github/workflows/verify-cloud-signing-input.yml` from `specs/quint/services/manifest.json:2919`.
- Release workflows change in nothing else. These are held for the owner: the `.mjs` fallbacks (`:115-117`, Q6), CMS
  delivery (scripts-07 Q1) and the `runtimeProfile == "cloud"` admission (scripts-01 Q1).

**CI-9: Replace the Calendar bridge supervisor.**
- Delete `scripts/ci/calendar-bridge.py`, including its `HOST` sha256 pin of `AlphaCalendarPlugin.java`. Every
  plugin edit and the formatter (D9) would otherwise break the Android lane.
- Reduce `scripts/ci/calendar-bridge.init.gradle` to a single `qualifyCalendarBridge` `Exec` task of about 40 lines.
  It runs the upstream `bridge-check.mjs` against the compiled `AlphaCalendarPlugin`.
- In the `android` job, replace the two `calendar-bridge.py` steps and the six receipt paths in the evidence upload
  (`android.yml:94-98,108-112,147-152` today) with one step:
  `./gradlew --init-script ../scripts/ci/calendar-bridge.init.gradle :app:qualifyCalendarBridge`
  (`timeout-minutes: 4`).
- Remove the `runpy`/text reads in `test/resident-native-ci-admission.test.mjs:100,113`.
- Coverage is kept: this is still the only host-side behavioural check of the Android Calendar bridge (D18).

**CI-10: Smaller `scripts/ci` cleanups** (no workflow semantics change).
- Move `scripts/ci/read-required-checks.ts` to `scripts/owner/read-required-checks.ts`. Keep
  `scripts/ci/required-checks-ruleset.json` where it is, because `read-required-checks.ts` reads it.
- Add `scripts/ci/ci_common.py` (`require`, `sha256_file`, strict JSON, the `build-tools/36.0.0` constant). Use it from
  `hosted-native-inputs.py`, `private-apk-storage.py`, `qualified-app-update.py`, `sign-os-ota.py`,
  `seal-signed-apks.py` and both crash modules. `release-custody-proof.py` waits for its next `proof_sha256` rotation.
- Merge `resident_crash_diagnostic.py` and `resident_uid_crash_audit.py` into `resident_crash.py`. Merge
  `resident_native_source.py` into `resident_fixture.py`.
- Hyphenated → underscore module renames, which remove the `importlib` loaders, land only together with
  `scripts/quint-lib.ts:38`, `specs/quint/services/manifest.json:2931-2932` and
  `protected-app-update-promotion.mjs:60,203`. They therefore follow the formal plan's T10 port, not this plan.

**Not done here (owner decisions):**
- Delete `release-app-signing.yml` and `scripts/ci/build-app-signing-fixtures.py` (scripts-01 Q3).
- Delete `export-browser-proof.ts` and both `browser-proof-*` uploads (scripts-04 Q2).
- Drop `develop` (scripts-01 Q5).
- Install or change the ruleset, and drop `Repository verification` from it (D12).
- Retire the `recovery-ui` lane together with `recovery_ui_guard.py` and its fixtures (scripts-06 Q).
- Narrow the quint lane's `apps/app/src/**`/`android/**` selection, which needs the formal plan to remove
  `sourcePaths()` hashing from the composition harnesses.

None of these units produces emulator, AOSP image, device or real-integration evidence. A green `ci.yml` is evidence
of an APK build and of host, formal and browser checks only.
