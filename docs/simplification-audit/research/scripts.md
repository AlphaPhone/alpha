# scripts/ audit

Scope: `scripts/` (362 tracked files, ~41k lines: 296 `.ts`, 43 `.py`, 3 `.sh`, 2 `.gradle`, 2 `.java`, JSON/fixtures),
the `scripts` block of `package.json` (65 entries) and `tsconfig.scripts.json`.

How callers were established: every tracked file under `scripts/` was searched for by its basename (with a
non-name character in front, so `native.ts` does not match `upstream-native-source.ts`) across the whole repository
except `vendor/` and this audit folder (`git grep -P`), plus a `from <module>` search for underscore Python modules.
Each hit was classified as package.json script, workflow, a real import/spawn from another script, a mention only in
a hand-maintained inventory list (`quint-lib.ts` `runtimeScriptPaths`, `source-snapshot.ts` roots,
`android-instrumentation.ts` `CAMPAIGN_RUNNERS`/notes), a test, a spec, app/config code, or docs/comments.
"nobody" files were re-checked with a stem search (without extension) to catch comments and dynamic names. The
per-file table is in section 8.

## 1. Area overview

`scripts/` is not a "scripts" folder. It is five different things sharing one flat directory:

1. **Build and release pipeline** (~120 files): `prepare-local-agent.ts` -> `build-workflow-worker.ts` ->
   `stage-local-agent-runtime.ts` -> `build-android.ts` -> `verify-apks.ts`, with satellites for the embedding host,
   voice host, Gradle verification, licences/SBOM, signing (`sign-release-apks.ts`, `ci/sign-os-ota.py`), update
   delivery (`app-update-candidate.ts`, `deliver-app-update.ts`, `publish-update-manifest.ts`) and AOSP staging
   (`stage-aosp.ts` + 12 `aosp-*`/`pixel10a-*`/`verify-aosp-*` files, many of them re-exports of
   `vendor/eliza/packages/os/scripts/android/*`).
2. **Development servers and Vite plugins** imported by `vite.config.ts` (`browser-cloud-dev-bridge.ts`,
   `local-agent-dev-bridge.ts`, `local-ocr-assets.ts`, `browser-pdf-assets.ts`, `browser-full-reload.ts`,
   `cloud-deployment.ts`) and seven agent launchers (`dev-local.ts`, `dev-cloud.ts`, `start-*.ts`,
   `cloud-resident-host.ts`).
3. **Test suites** that live here instead of `test/`: 113 `test-*.ts`, 7 `test-*.py`/`*.test.py`, 4 `maps/test-*`,
   12 files in `scripts/fixtures/`, plus 17 Android "campaign" runners. 64 of the `test-*.ts` files are executed
   only through a 1-30 line `test/*.test.mjs` shim that spawns them (e.g. `test/adapter-contracts.test.mjs:4-24`
   runs 26 of them in a loop).
4. **CI glue** in `scripts/ci/` (49 files): change selection (`affected.ts`), required-result aggregation,
   the resident-android Python harness (`resident-*.py`, `pending-recovery-ui.py`, `recovery_ui_guard.py`) and
   release-custody Python, with their own Python unit tests and fixtures beside them.
5. **Formal-method tooling** (`quint-lib.ts`, `check-quint.ts`, `check-quint-refinement.ts`, `check-lemma.ts`,
   `prepare-quint-history.ts`, `ci/check-changed-models.ts`) and **owner/incident tooling** (`scripts/owner/`,
   incident #658/#659 of 2026-10-27).

The scripts are also a library for tests: 192 `test/` files import from `scripts/`, and 34 test files read a
script's *source text* and regex-match it. Conversely 19 scripts import from `test/` (e.g.
`scripts/fixtures/prototype-script.ts:2` imports `../../test/support/strip-types.mjs`). Most scripts are written
"import-and-run": 55 files use `if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))`
so a test can import the internals; 4 more use a different idiom, 1 uses `import.meta.main`.

Rough verdict tally from the table: 153 keep, 64 move to `test/` as the suite itself (delete the shim), 38 other
moves to `test/` (Python tests, fixtures, npm-alias suites), 25 delete, 20 merge, 16 simplify/split/move,
15 manual tools only tests import, 26 owner decisions, 5 archive.

## 2. Pattern taxonomy

### 2.1 Tests-in-scripts with a shim ("shimmed suite")
**Looks like:** a self-asserting `scripts/test-foo.ts` (top-level `assert` calls, exits non-zero on failure) plus a
`test/foo.test.mjs` that only `execFileSync`s it.
- `test/adapter-contracts.test.mjs:4-24` - loops over 26 `scripts/test-*.ts` and spawns each with `--import tsx`.
- `test/browser/adapters.spec.ts:6` - same for 8 browser scripts inside Playwright.
- `test/local-agent-contracts.test.mjs:4` - `execFileSync(process.execPath,['--import','tsx','scripts/test-local-agent.ts'],...)`, repeated 6 times.
- `test/inbox.test.mjs:7-13` - uses a third copy of the runner, `runChildSuite` from `test/fixtures/child-suite.mjs`.
- `scripts/test-workflow-protocol.ts:5` - re-spawns *itself* with `--import=tsx` if the loader is missing.
**Why it hurts:** two files per test, three copies of the child-runner, failures surface as a stderr blob, node:test
reporting/filtering is lost, and the CI change selector cannot tell these are tests (section 2.13).
**How widespread:** 64 scripts shimmed; 102 `test-*` files total in `scripts/`.
**Treatment:** move each `test-*.ts` into `test/` as a real `node:test` file (wrap top-level asserts in `test()`),
delete the shim. Keep `test/fixtures/child-suite.mjs` only if any child-process isolation is truly needed.
**Risk:** some suites rely on a fresh process (globals, `NODE_TEST_CONTEXT` deleted in
`test/adapter-contracts.test.mjs:16`); verify each with `--test-isolation=process` (Node's default).

### 2.2 Unwired probes and campaign runners ("evidence probe")
**Looks like:** a script that drives a real emulator/host, writes `test-results/<x>/real-host.json` or an
"evidence" record with a `scope:` disclaimer, and is run by nobody.
- `scripts/test-automatic-update-platform.ts:18-19` - `ANDROID_HOME??path.join(os.homedir(),'Library/Android/sdk')`, `JAVA_HOME??'/opt/homebrew/...'`; no caller.
- `scripts/test-update-confirmation-platform.ts:17-19` - same, no caller.
- `scripts/test-workflow-approvals-host.ts:9-11`, `test-workflow-approval-crash.ts`, `test-workflow-cancel-recovery.ts`,
  `test-workflow-lifecycle-host.ts`, `test-workflow-metadata-host.ts`, `test-reviewed-workflow-host.ts` - only named in a
  comment, `scripts/start-reviewed-workflow-agent.ts:5-8`.
- `scripts/android-instrumentation.ts:307-317` `CAMPAIGN_RUNNERS` - 17 runner scripts listed so a test can treat
  their instrumentation classes as "reachable"; none is run by any workflow (`ci/emulator-suite.ts` only runs
  `test:android:instrumentation`).
- `test/fixtures/isolated-native-campaign.mjs:7` + 5 `*-runner.test.mjs` files then exercise those campaign runners
  against a fake adb: tests of test harnesses that never run against a device.
**Why it hurts:** code that looks like coverage but proves nothing in CI; tests that pin the harness.
**Treatment:** decide per campaign: wire it into `android-emulator.yml`/`resident-android.yml`, or delete it together
with its runner tests and its `CAMPAIGN_RUNNERS`/`NOT_RUN_BY_A_RUNNER` entries.

### 2.3 Copy-pasted helpers instead of a `scripts/lib/`
**Looks like:** one-line helpers re-declared per file.
- `sha256`/`sha`/`digest` over bytes or a file: **~40 definitions**, e.g. `quint-lib.ts:110`, `generate-licenses.ts:144`,
  `local-agent-source.ts:9`, `combined-agent-source.ts:5`, `upstream-native-source.ts:5` (all *exported*, all identical),
  plus `provision-unit.ts:39`, `pilot-update.ts:72`, `enroll-release-keys.ts:76`, `build-embedding-host.ts:28`,
  `owner/pilot-rotation.ts:9`, `owner/pilot-rotation-journal.ts:7`, `ci/speech-candidate.ts:41`, `update-artifact.ts:5`
  (streamed variant); Python: `ci/sign-os-ota.py:33`, `ci/qualified-app-update.py:52`, `ci/release-custody-proof.py:93`,
  `ci/seal-signed-apks.py:18`, `ci/calendar-bridge.py:45`, `prepare-aosp-apk.py:16`, `maps/prepare-region.py:14`,
  and lambdas in `ci/resident_fixture.py`, `ci/resident_native_source.py:12`, `ci/build-private-peer.py`.
- `git(...)` wrappers: **17** (`qualify-head.ts:313`, `owner/merge-review.ts:148-150` with overloads,
  `owner/forged-branch-scan.ts:31`, `app-update-candidate.ts:69`, `prepare-embedding-host.ts:22`, `paradee-runtime.ts:32`,
  `local-agent-source.ts:71`, `android-build-preflight.ts:70`, `ci/export-browser-proof.ts:11`, `ci/reproduce-paradee-model.py:26`, ...).
- Directory walkers: `regular-files.ts:5`, `quint-lib.ts:98` (`filesWithin`), `source-snapshot.ts:52`,
  `android-gzip-assets.ts:26` and `:51` (two in one file), `generate-licenses.ts:155` and `:419`, `paradee-runtime.ts:82`,
  `generate-sbom.ts:207`, `owner/emulator-campaign-check.ts:77`, `ci/export-browser-proof.ts:112`.
- `readJson`: 12 copies (`enroll-release-keys.ts:78`, `app-update-candidate.ts:54`, `cloud-readiness.ts:50`,
  `android-build-preflight.ts:230`, `voice-host.ts:65`, `build-embedding-host.ts:29`, `generate-licenses.ts:142` exported,
  `quint-lib.ts:153` exported, `runtime-profile.ts:8`, `mobile-uuid-adapter.ts:14`, ...).
- `upstream.lock.json` read-and-take-`.commit`: **30** call sites (e.g. `android-build-preflight.ts:83,133,241` - three
  in one file; `paradee-runtime.ts:34,74`; `prepare-embedding-host.ts:23`; `cloud-resident-host.ts:74`) while
  `local-agent-source.ts:11` already parses it.
- `adb` helpers: 16 (`provision-unit.ts:207 adbFor`, `android-resident-instrumentation.ts:15`, `native-voice-latency-emulator.ts:72`, ...);
  `ANDROID_HOME` resolution in 27 files although `toolchain.ts:4 androidEnv()` exists (28 importers).
- Argument parsing: 8 hand-written `parseArgs` (`publish-update-manifest.ts:30`, `enroll-release-keys.ts:213`,
  `sign-release-apks.ts:184`, `cloud-readiness.ts:227`, `record-release.ts:36`, `verify-cuttlefish-launcher.ts:49`,
  `render-assetlinks.ts:373`, `aggregate-voice-latency.ts:53`) plus ad-hoc `option/value/get` closures
  (`check-quint.ts:12-14`, `ci/check-changed-models.ts:55`, `owner/input.ts:1`, `verify-aosp-listener.ts:12`,
  `test-update-confirmation-platform.ts:12`, `cloud-subscription-latency.ts:13`); only 2 launchers use `node:util parseArgs`.
- `sleep`: `deliver-app-update.ts:45`, `test-local-digest-restart.ts:41`, plus inline `new Promise(r=>setTimeout(r,500))`
  in the workflow probes. `gh`: `deliver-app-update.ts:91`, `app-update-candidate.ts:78`, `owner/gh-readonly.ts`,
  `ci/qualified-app-update.py:132`.
- Repo-root resolution: 9 spellings (`path.resolve(import.meta.dirname,'..')` x25, `resolve(import.meta.dirname,'..')` x10,
  `path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')` x16, `fileURLToPath(new URL('../',import.meta.url))` x6, ...).
**Treatment:** one `scripts/lib/` (`hash.ts`, `git.ts`, `fs.ts` (walk/readJson/privateFile), `args.ts` (use
`node:util parseArgs`), `android.ts` (adb/sdk via toolchain), `pin.ts` (upstream lock), `root.ts`). For Python, one
`scripts/ci/common.py` imported normally (requires the module renames in 2.10).
**Risk:** low; behaviour identical. Several of these files are hashed as build/provenance inputs (2.9), so changing
them invalidates prepared artefacts once.

### 2.4 Hand-maintained path inventories ("manual manifest")
**Looks like:** long literal lists of repository paths that must be kept in sync by hand.
- `quint-lib.ts:10-38` `runtimeScriptPaths` - 60 script paths (and `capacitor.config.ts`, `vite.config.ts`) inside the
  *Quint* library, used by `specs/quint/refinement/*` to hash "product sources".
- `source-snapshot.ts:5-45` - ~90 roots including 30 `scripts/*.ts`; `test/mobile-uuid-build.test.mjs:53` then asserts
  the source text contains each name.
- `android-instrumentation.ts:307-317` `CAMPAIGN_RUNNERS` (with the comment "Added on main while the reachability check was being written").
- `ci/check-changed-models.ts:22` `checkerInputs`, `check-quint.ts:40-43` `inputPaths`, `check-quint-refinement.ts:79-83` `reportingInputs`,
  `check-lemma.ts:47-48` `inputs`.
- `ci/affected.ts:12-15` `browserReadAndroid` ("test/ci-affected.test.mjs scans test/browser to keep this complete").
- `verify-packaged-runtime.py:26-37` duplicates `upstream-core-sources.ts` file list in Python.
**Treatment:** derive from the import graph or a glob; where a list is genuinely policy, keep exactly one copy (JSON)
and read it from both languages.

### 2.5 Receipt-and-rehash ceremony ("evidence receipt")
**Looks like:** every runner writes a JSON receipt with `schemaVersion`, `startedAt`, `inputHashes`, writes it once as
`status:'running'`, hashes all inputs again in `finally` and fails if any changed "during the run".
- `check-quint.ts:83-93` receipt, `:236-242` "Checker input changed during run".
- `check-lemma.ts:26-28`, `:108-114`; `:84-87` even rewrites "frozen" proof files back if generation changed them.
- `ci/check-changed-models.ts:60-62`, `:106-110` "Proof input changed during run".
- `check-quint-refinement.ts:112-126` atomic `.progress.json` checkpoints, `:203-207` `reportingInputsUnchanged`.
- 48 scripts write `schemaVersion`/`scope:` records; 46 refuse to overwrite outputs (`flag:'wx'`, `exist_ok=False`,
  "Preserve prior closure", "Output must be a new directory").
**Why it hurts:** most of the code in these runners is bookkeeping; CI logs and exit codes already provide the
evidence. A concurrent edit during a local run is not a threat model worth code.
**Treatment:** keep exit codes and console output; delete receipts that nothing reads (check who consumes each:
`ci/check-changed-models.ts:96-101` is the only reader of `check-quint` receipts).

### 2.6 Defensive validation of the script's own inputs
- `run-node-tests.ts:5-9` validates `ALPHA_TEST_CONCURRENCY` before passing it to `node --test`, which validates it anyway.
- `android-abis.ts:7` - `!Array.isArray(requested)` on a `readonly string[]` parameter.
- `removed-profile-flags.ts:6` - `typeof arg === 'string'` on `readonly string[]`.
- `check-lemma.ts:6` refuses any argument; `:45` "The reviewed proof directory must be specs/lemma"; `:52` "LemmaScript must be exactly 0.6.6" (already pinned by package-lock).
- `prepare-quint-history.ts:16` validates the 40-hex revision in a checked-in JSON.
- `embedding-build-remap.ts:3-6,10` re-validates four internal absolute paths.
- `agent-model.ts:5-8` regex-validates a model name from a default constant.
- `start-combined-agent.ts:16-18` requires exact `v26.13.0`/`1.4.2` binary versions via `ALPHA_NODE_BIN`/`ALPHA_BUN`.
- 25 files check `st.uid`/`mode & 0o077` on developer key/token files; 40 do symlink checks; 115 regex hex validations.
**Treatment:** trust typed inputs and checked-in data; keep validation only at genuine trust boundaries (CI secrets,
downloaded artefacts, signing inputs).

### 2.7 Legacy-refusal shims ("tombstone")
Code whose only job is to reject something an earlier migration removed.
- `removed-profile-flags.ts` (whole file) and its 5 call sites: `build-android.ts:67`, `stage-local-agent-runtime.ts:40`,
  `gradle-verification.ts:267`, `verify-apks.ts:103`, `android-build-preflight.ts:307`.
- `runtime-profile.ts:18` "There is one runtime profile now; --verify-cloud is gone."
- `speech-env.ts:10-20` `RENAMED`/`RETIRED` env names (`ALPHA_LOCAL_TTS`, `ALPHA_WHISPER_BIN`, `ELIZA_KOKORO_*`).
- `.github/workflows/publish-qualified-app-update.yml:146-150` `if test -f scripts/deliver-app-update.mjs` - the
  pre-TypeScript entry point.
- `deliver-app-update.ts:113-132` `checkLegacyFloor` (suspicion: may still be needed while an old pointer is live).
**Treatment:** delete; unknown flags already fail in the parsers that have strict option lists.

### 2.8 Thin re-export / single-caller wrappers ("pass-through module")
- Pure re-exports of `vendor/eliza`: `aosp-clock-contract.ts` (2 lines), `aosp-image-capability.ts:11-17`,
  `aosp-release-record.ts:17-20`.
- One-caller files under 30 lines: `gmail-agent-read-host.ts` (8), `gmail-agent-dev-broker.ts` (13),
  `stage-workflow-worker.ts` (13), `cloud-sdk-authority.ts` (14), `agent-model.ts` (15), `embedding-build-remap.ts` (18),
  `native-cloud-runtime-config-check.ts`, `test-reminder-recovery.ts`/`test-reminder-recurrence-recovery.ts` (3 lines each,
  calling `reminder-recovery-fixture.ts` with `false`/`true`), `release-distributable.ts` (exists "so the predicate can be run by tests", line 2-3).
- CLI wrappers of upstream verifiers: `verify-aosp-clock.ts` (15), `verify-aosp-listener.ts` (19),
  `verify-aosp-secure-camera.ts` (15), `verify-pixel10a-source.ts` (15), `verify-pixel10a-image.ts` (29).
**Treatment:** inline into the caller or import upstream directly; one `aosp-device-check.ts` with subcommands.

### 2.9 Scripts that hash themselves ("self-provenance")
Editing a script invalidates artefacts because the script's own bytes are part of a stamp.
- `prepare-local-agent.ts:10` `preparerSha256: digest('scripts/prepare-local-agent.ts')`.
- `verify-upstream.ts:60` `stamp.guardSha256 !== hash("scripts/local-agent-source.ts")`.
- `native-google-host-artifact.ts:66` lists `scripts/build-native-google-host.ts`, `scripts/local-agent-source.ts` as inputs.
- `ci/resident_native_source.py:12-13` asserts the hashes of `scripts/local-agent-source.ts` and `stage-local-agent-sources.ts`.
- `test/prepare-local-agent-requalify.test.mjs:22` pins it in a test.
**Why it hurts:** helper refactors (2.3) force full re-preparation and make every scripts change look like a build input change.
**Treatment:** stamp on the pin and the prepared-tree content, not on the tool's source.

### 2.10 Python as a second language for the same job
- Hyphenated Python modules imported by path: `importlib.util.spec_from_file_location` in 9 scripts
  (`ci/sign-os-ota.py:21-29` loads `private-apk-storage.py` and `release-custody-proof.py`;
  `ci/qualified-app-update.py`, `ci/hosted-native-inputs.py`, `stage-aosp-native.py`, ...) and 12 test files.
- `ci/test-pending-recovery-phases.py:5-6` parses `pending-recovery-ui.py` with `ast` to extract `PHASES` because the
  script runs at import (no Python script in `scripts/` has an `if __name__ == '__main__'` guard: 0 of 43).
- `apk-manifest.json` is parsed independently by ~30 scripts across TS and Python (`ci/admit-cloud-signing-input.py`,
  `ci/qualified-app-update.py`, `scan-archived-apks.py`, `ci/resident_fixture.py`, `verify-apks.ts`, `build-archive.ts`,
  `qualify-head.ts:83`, `generate-sbom.ts:91`, `provision-unit.ts:56` - three separate `interface ApkManifest`).
- `verify-packaged-runtime.py:26-37` repeats `upstream-core-sources.ts`.
- Release flow split across languages: `sign-release-apks.ts` (TS) vs `ci/seal-signed-apks.py`, `ci/admit-cloud-signing-input.py`,
  `ci/qualified-app-update.py`, `ci/private-apk-storage.py` (Python), glued by `ci/verify-cloud-signing-input.sh`.
**Treatment:** pick one language per pipeline. CI-only steps that need no Node could stay Python, but then rename
to underscore modules, add `__main__` guards and a shared `common.py`; TS should own manifest parsing via one type.
**Risk:** release-custody workflows pin script SHA-256s (`release-custody-proof.yml` `proof_sha256` input,
`test/ci-pin-bound-scripts.test.mjs`), so moves need coordinated pin updates.

### 2.11 Unit tests for scripts living next to the scripts
`scripts/ci/test-acquire-resident-bun.py`, `test-pending-recovery-phases.py`, `test-recovery-ui-guard.py`,
`test-resident-phase.py`, `test-resident-uid-crash-audit.py`, `release-custody-proof.test.py`, `sign-os-ota.test.py`,
`scripts/maps/test-dataset-manifest.py`, `test-prepare-region.py`, plus `scripts/ci/fixtures/` (4 files named after
specific runs/commits: `recovery-policy-52ab.txt`, `recovery-storage-e4d-pass.txt`).
Three naming schemes (`test-*.py`, `*.test.py`, and `test/*.test.py`). Duplicate execution:
`test-recovery-ui-guard.py` and `test-pending-recovery-phases.py` run in `npm test` (`test/python-suites.test.mjs:25-26`)
**and** in `resident-android.yml:569-570`; `test-resident-phase.py` in both `resident-android.yml:244` and
`resident-prepare.yml:31` (it asserts `GITHUB_ACTIONS == 'true'`, line 12, so it can never run locally).
**Treatment:** move to `test/`, one name scheme, one runner, run once.

### 2.12 Tests that read script source text ("source-regex test")
34 test files `readFileSync('scripts/...')` and match regexes against code, e.g.
`test/android-gzip-assets.test.mjs:50` (`/problems\.push\(\.\.\.packagedGzipProblems\(payload\.public\)\)/` in `verify-apks.ts`),
`test/aosp-capabilities.test.mjs:53` (`stage.indexOf('if (!physical) writeAospCapabilityOverlay(output'`),
`test/android-instrumentation-runner.test.mjs:208,420,495,514,533`, `test/pilot-units.test.mjs:234,308`,
`test/ci-ruleset-readback.test.mjs:18-20`, `test/cloud-resident-authority.test.mjs:56,67`,
`test/direct-transcription-proxy.test.mjs:25` and `test/fixtures/product-character-host.mjs:20` (strip imports from a
script's source and eval it). These exist because the scripts are top-level code, not functions.
**Treatment:** delete (owner explicitly wants none); where behaviour matters, test it through the script's real CLI.

### 2.13 CI cost caused by scripts
- `ci/affected.ts:49-51`: any path not otherwise matched sets `browser = android = prepare = true`. Every `scripts/**`
  file except `check-quint.ts`/`quint-lib.ts`/`storage-specs.ts` falls there, so editing one owner tool, one
  `test-*.ts` suite or a Python CI unit test runs the browser shards, the Android build and resident prepare.
  Moving test suites out of `scripts/` (2.1) alone fixes most of this; a per-folder map (`scripts/aosp/**` -> nothing on PR,
  `scripts/owner/**` -> verify only) fixes the rest.
- Dafny proofs run twice: `npm run verify` in `browser.yml:69-74` with `LEMMA_REQUIRE_BACKEND: '1'` after
  `ci/prepare-dafny.sh`, and again in `lemma-check.yml:49-50` on any `apps/app/src/**` PR.
- Quint bounded checking runs in `quint-model-check.yml` on `specs/quint/**` PRs **and** `browser.yml:130-134`
  runs `quint:changed` (per-changed-model verify) on every verify-selected PR; `npm run verify` itself also runs
  `quint:prepare-history` (a network `git fetch` into the submodule) and `quint:check` for every model.
- `agent:test-digest-restart` runs on every PR in `resident-prepare.yml:49` and in the dedicated `digest-restart.yml:51`.

### 2.14 Misplaced modules ("not a script")
- Vite plugins: `local-ocr-assets.ts`, `browser-pdf-assets.ts`, `browser-full-reload.ts` (imported by `vite.config.ts:3-5`).
- Dev-server middleware: `browser-cloud-dev-bridge.ts` (519 lines), `local-agent-dev-bridge.ts`, `gmail-agent-*`
  (`vite.config.ts:2,11`).
- Playwright config data: `storage-specs.ts` (`playwright.config.ts:5`).
- Spec harness code: `quint-lib.ts` `sourcePaths()` is consumed only by `specs/quint/refinement/{application,composition}`.
- Owner tool in CI folder: `ci/read-required-checks.ts` (uses `owner/gh-readonly.ts`, never run by CI).
- Generator named as a test: `test-photo-filter-png-reference.ts` (writes `android/app/src/androidTest/assets/photo-filter-goldens.json`).

### 2.15 Copy-paste launcher family
Five agent launchers repeat the same 12-line block (profile dir 0700, port range check, Cerebras key mode check,
owner-token create/check, `dev-server.ts` entry check): `start-local-remote.ts:28-40`, `start-local-voice-agent.ts:25-37`,
`start-reviewed-workflow-agent.ts:28-37`, `start-combined-agent.ts:26-35` (its own `privatePath`), `start-cloud-qa.ts:15-27`.
`private-runtime-launch.ts` was extracted for this but only `start-local-remote.ts`, `start-cloud-qa.ts` and
`cloud-resident-host.ts` use it. `start-local-voice-agent.ts`, `start-reviewed-workflow-agent.ts` and
`start-combined-agent.ts` have no npm/CI caller. `dev-local.ts:11-12` calls `prepareClientFeatures()` with the
comment "npm run dev has no predev hook", but `package.json:53` defines `predev`, so it runs twice; `dev` and
`dev:local` (`package.json:10,33`) are the same command.
**Treatment:** one `start-agent.ts --profile --port [--voice|--workflow]` on top of `private-runtime-launch.ts`.

### 2.16 package.json script block
- 7 `pre*` hooks (`predev`, `predev:ui`, `prebuild`, `pretypecheck`, `pretest`, `predev:maps`, `prebuild:test-mocks`)
  all run `upstream:prepare-client`; `verify` then runs it explicitly and calls the others with `--ignore-scripts`
  to avoid re-running it. One explicit step in `verify`/`dev` is simpler than hooks plus opt-outs.
- Aliases never called by CI, docs or other scripts: `agent:test`, `agent:test-redaction`, `agent:local`,
  `agent:stage-workflow-worker`, `quint:typecheck`, `quint:test`, `quint:simulate` (all subsets of `quint:check`),
  `quint:conformance`, `test:browser:storage`, `test:browser:live`, `aosp:verify-secure-camera`, `upstream:verify`
  (CI calls `node scripts/verify-upstream.ts` directly), `android:deps:check`.
- `typecheck:scripts` -> `typecheck-scripts.ts:17-28` runs `tsc -p tsconfig.scripts.json` and **drops every
  diagnostic outside `scripts/`**, i.e. the scripts project currently has errors in imported app/vendor files that
  are being filtered. `tsconfig.scripts.json` adds only `DOM` libs to the base config.

## 3. Quint / Lemma tooling (is it simpler than it could be?)

No. Five scripts (`check-quint.ts` 249, `check-quint-refinement.ts` 217, `check-lemma.ts` 119,
`ci/check-changed-models.ts` 115, `prepare-quint-history.ts` 38) + `quint-lib.ts` 252 = ~990 lines to run a CLI.
- `check-quint.ts` re-implements process supervision (`:96-141`: detached process groups, Windows `taskkill`,
  8 MiB output cap, SIGTERM/SIGKILL escalation), retries silent SIGSEGV/SIGILL (`quint-lib.ts:164-170`),
  validates manifest metadata by loading Quint's internal parser through `require` of `dist/src/parsing/...`
  (`quint-lib.ts:197-201`), runs two self-test "canaries" that check Quint can detect a counterexample
  (`check-quint.ts:203-230`) and hashes inputs before/after.
- `ci/check-changed-models.ts` diffs manifests against a base, computes `.qnt` import closure by regex
  (`:41-45`), then spawns `check-quint.ts` per model/phase and **re-validates its receipt** (`:93-101`).
  `ci/affected.ts` already does the PR-level selection.
- `check-quint-refinement.ts` is a driver for `specs/quint/refinement/*/index.mjs` that belongs with the specs.
- `prepare-quint-history.ts` exists only for `specs/quint/legacy/core/source-inventory.json` and
  `specs/quint/refinement/native/mms-historical-sources.json` (`:7-10`); it is the one networked step in `npm run verify`.
- `quint-lib.ts` mixes three concerns: manifest loading, checker-output parsing, and product source enumeration
  (`runtimeScriptPaths`, `sourcePaths`, `sharedSourcePaths`) used by refinement specs.
**Simpler shape:** a manifest-driven loop (`for model: quint test|run|verify ...`) with the CLI's own exit code, no
receipts/canaries/rehash; changed-model selection as a `--models=` list computed in the workflow; the legacy family and
its history fetch deleted (owner decision); source enumeration moved into `specs/quint/refinement`.
`check-lemma.ts` similarly reduces to `lsc gen-check && lsc check` plus the inventory check.

## 4. Delete candidates (evidence: no caller found by the search described at the top)

Confident, deletable today:
| file | evidence |
|---|---|
| `scripts/aosp-unsigned-debug.init.gradle` | no reference in repo or `vendor/eliza` |
| `scripts/cloud-subscription-latency.ts` | only self-reference (usage comment, line 9); one-off probe for #410 |
| `scripts/compare-prototype.py`, `scripts/prototype-capture.ts` | no reference; prototype comparison tooling |
| `scripts/fingerprint-voice-assets.ts` | only an allow-list regex in `test/llama-cpp-only.test.mjs:36` names it |
| `scripts/stage-native-apps.ts` | only a comment in `PasswordProviderSupport.java:16`; dated 2026-09-29 candidate receipt |
| `scripts/test-automatic-update-platform.ts`, `scripts/test-update-confirmation-platform.ts` | no reference |
| `scripts/test-native-calendar-consumer.ts` | no reference |
| `scripts/maps/test-region.py`, `maps/test-renderer.ts`, `maps/test-recovery-renderer.ts` | no reference |
| `scripts/removed-profile-flags.ts` (+5 call sites) | tombstone for removed flags |
| `scripts/aosp-clock-contract.ts`, `aosp-image-capability.ts` | pure re-exports of vendor modules |
| `.github/workflows/publish-qualified-app-update.yml:146-148` `.mjs` branch | file does not exist |
| package aliases `dev:local`, `quint:typecheck`, `quint:test`, `quint:simulate` | duplicates/subsets, no caller |

Likely deletable (owner decision because they are evidence tooling):
- The six workflow host probes (`test-reviewed-workflow-host.ts`, `test-workflow-{approvals-host,approval-crash,cancel-recovery,lifecycle-host,metadata-host}.ts`),
  `scripts/fixtures/workflow-host.ts` and `start-reviewed-workflow-agent.ts` (its only purpose per `:4-8`).
- `qualify-head.ts` (465 lines; local re-run of CI qualification; only tests import it) with `test/qualify-head.test.mjs` and parts of `test/pilot-units.test.mjs`.
- `ci/reproduce-bun-spawn-seccomp.py` + `bun-spawn-seccomp.yml`, `ci/reproduce-paradee-model.py` + `reproduce-paradee-model.yml` (dispatch-only reproductions).
- `owner/forged-branch-scan.ts`, `owner/incident-access-audit.ts`, `owner/incident-ci-exposure.ts`, `owner/merge-review.ts`,
  `owner/incident-2026-10-27-iocs.json` once incident #658/#659 is closed (only `test/owner-*.test.mjs` call them).
- The 17 `CAMPAIGN_RUNNERS` scripts that no workflow runs, with their fake-adb runner tests.
- `prepare-quint-history.ts` with `specs/quint/legacy`.
- `speech-env.ts` `RENAMED`/`RETIRED`, `runtime-profile.ts` CLI branch.

## 5. Duplicated types and helpers

| name | locations | proposed home |
|---|---|---|
| `sha256`/`sha`/`digest` | ~40 TS + ~10 Py, listed in 2.3 | `scripts/lib/hash.ts` (incl. streamed `updateArtifactDigest`), `scripts/ci/common.py` |
| `git()` | 17 (2.3) | `scripts/lib/git.ts` |
| walkers `regularFiles`/`filesWithin`/`walk`/`walkFiles` | 11 (2.3) | `scripts/lib/fs.ts` |
| `readJson` | 12 (2.3) | `scripts/lib/fs.ts` |
| upstream pin read | 30 sites | `scripts/lib/pin.ts` (`local-agent-source.ts:11` already parses it) |
| `adb`/`adbFor`/SDK path | 16 adb + 27 `ANDROID_HOME` | extend `toolchain.ts` |
| `parseArgs`/`option`/`value` | 8 + 6 | `node:util parseArgs` |
| `interface ApkManifest` | `qualify-head.ts:83`, `generate-sbom.ts:91`, `provision-unit.ts:56` (+ untyped readers in ~25 files and 5 Python files) | `scripts/apk.ts` export |
| `type Adb` | `ci/emulator-suite.ts:50`, `android-instrumentation.ts:85`, `provision-unit.ts:74`, `pilot-update.ts:49` | `toolchain.ts` |
| `interface UpdateOffer` | `deliver-app-update.ts:17`, `app-update-candidate.ts:21` | `update-channel.ts` |
| `ManifestNode` | `apk.ts:14` (exported), `render-assetlinks.ts:54` | `apk.ts` |
| `SignerOptions` | `render-assetlinks.ts:40`, `apk.ts:254` (different meaning, same name) | rename one |
| `Ruleset` | `ci/read-required-checks.ts:49`, `owner/read-branch-integrity.ts:25` | `owner/gh-readonly.ts` |
| `ApkPair` | `android-workflow-native.ts:45`, `native-test-fixture.ts:32` (different shapes) | rename |
| `ReleaseRecord` | `enroll-release-keys.ts:63`, `deliver-app-update.ts:42` (different shapes) | rename |
| child-suite runner | `test/adapter-contracts.test.mjs:13-23`, `test/fixtures/child-suite.mjs`, inline in `test/local-agent-contracts.test.mjs` | gone after 2.1 |
| profile/token/key launcher block | 5 launchers (2.15) | `private-runtime-launch.ts` |
| sources hashing lists | `quint-lib.ts`, `source-snapshot.ts`, `verify-packaged-runtime.py` vs `upstream-core-sources.ts` | one JSON |
| product agent identity | `scripts/agent-identity.ts` and `apps/app/src/product/native-cloud-runtime.ts:9` ("Same product registration as scripts/agent-identity.ts") | one shared module (suspicion; check content) |
| inventory walkers for licences vs SBOM | `generate-licenses.ts` `npmEntries/fontEntries/androidEntries/voiceHostEntries/runtimeEntries` vs `generate-sbom.ts` `npmComponents/fontComponents/gradleComponents/voiceHostComponents/residentRuntimeComponents` | one collector, two renderers |

## 6. Structure / foldering

Proposed layout:
- `scripts/lib/` shared helpers (section 5).
- `scripts/build/` (prepare/build/stage/verify APK), `scripts/release/` (signing, update delivery, pilot),
  `scripts/aosp/` (13 aosp/pixel10a files + `stage-aosp*.{ts,py}`), `scripts/dev/` (launchers + dev bridges),
  `vite-plugins/` next to `vite.config.ts`, `scripts/ci/` (workflow glue only), `scripts/owner/` (incl. `ci/read-required-checks.ts`).
- All `test-*.ts`, `scripts/fixtures/*`, `scripts/ci/test-*.py`, `*.test.py`, `scripts/ci/fixtures/*`,
  `scripts/maps/test-*` -> `test/` (and `test/fixtures/`), which also fixes 2.13.
- `specs/quint/refinement/run.mjs` for `check-quint-refinement.ts`; `sourcePaths()` moves there.
- Monoliths to split: `generate-licenses.ts` (1038), `android-instrumentation.ts` (753; registry data as JSON),
  `browser-cloud-dev-bridge.ts` (519; dense one-line handlers, e.g. `:338` one 600-character line),
  `qualify-head.ts` (465, or delete), `verify-apks.ts` (457, top-level script body), `render-assetlinks.ts` (438),
  `pilot-update.ts` (410), `generate-sbom.ts` (390).
- Tiny files to merge: listed in 2.8.
- Misleading names: `test-photo-filter-png-reference.ts` (generator), `quint-lib.ts` (also product source inventory),
  `owner/input.ts` (generic helpers: `option`, `isRecord`, `errorCode`), `test-local-agent-source.ts` (runs upstream tests).

## 7. Worst offenders

1. `scripts/android-instrumentation.ts` - 753 lines; runner + two registries maintained for a source-text test; 17 listed campaigns no CI runs.
2. `scripts/generate-licenses.ts` - 1038-line monolith; parallel to `generate-sbom.ts`.
3. `scripts/qualify-head.ts` - 465 lines re-running CI locally; no caller but tests.
4. `scripts/check-quint.ts` - process supervision, canaries, receipts, rehash for one CLI.
5. `scripts/ci/check-changed-models.ts` - second selector + receipt validator over `check-quint.ts`.
6. `scripts/check-lemma.ts` - receipt, rehash, frozen-proof restore, exact-version gates.
7. `scripts/quint-lib.ts` - three unrelated concerns, 60-path manual inventory.
8. `scripts/source-snapshot.ts` - ~90 hand-listed roots, asserted by a source-text test.
9. `scripts/browser-cloud-dev-bridge.ts` - 519-line dev middleware in `scripts/`, minified-style lines.
10. `scripts/ci/affected.ts` - catch-all branch makes every scripts edit run all lanes.
11. `scripts/start-local-remote.ts` / `start-local-voice-agent.ts` / `start-reviewed-workflow-agent.ts` / `start-combined-agent.ts` - copy-paste family.
12. `scripts/test-inbox-sent-cleanup.ts` (629) and `test-connection-history.ts` (471) - suites in the wrong tree behind shims.
13. `scripts/ci/test-pending-recovery-phases.py` - AST-extracts code from the script under test; run twice in CI.
14. `scripts/ci/sign-os-ota.py` - loads two hyphenated modules by path; Python half of a TS/Python release flow.
15. `scripts/removed-profile-flags.ts` + 5 call sites - tombstone.
16. `scripts/test-automatic-update-platform.ts`, `test-update-confirmation-platform.ts` - unreferenced probes with macOS paths.
17. The six `test-workflow-*-host.ts` probes + `fixtures/workflow-host.ts` - unwired.
18. `scripts/verify-apks.ts` - 457-line top-level script with `refuseRemovedProfileFlags`, pinned by source-regex tests.
19. `scripts/typecheck-scripts.ts` - hides type errors outside `scripts/`.
20. `scripts/run-node-tests.ts` / `with-test-mocks.ts` - wrappers that only set flags/env.
21. `scripts/owner/*` incident tools - one-off, tested in `npm test` forever.
22. `scripts/prepare-local-agent.ts` - hashes its own source into the stamp (2.9).

## 7a. Open questions / risks

- Which manual device campaigns (`CAMPAIGN_RUNNERS`, the workflow host probes, `native-voice-latency-emulator.ts`,
  `android-*-live.ts`) are still part of release acceptance? If none, ~25 scripts and ~10 runner tests go.
- Is the `specs/quint/legacy` family still wanted? It drives `prepare-quint-history.ts`, the TLC `compare`/`temporal`
  steps and part of `quint-lib.ts`.
- Are Quint/Lemma receipts consumed by anyone outside CI (release evidence, audits)? If not, drop them.
- Release custody pins script hashes (`release-custody-proof.yml` input `proof_sha256`, `test/ci-pin-bound-scripts.test.mjs`);
  moving or renaming `scripts/ci/release-custody-proof.py`, `sign-os-ota.py`, `reproduce-paradee-model.py` needs the
  pins and the reviewed workflow commit updated together.
- Incident #658/#659 status decides when `scripts/owner/incident-*` can be archived.
- `deliver-app-update.ts:113` `checkLegacyFloor` may still guard a live legacy pointer - verify the published stable manifest before removing.
- Should Python remain a CI language? Converting the resident-android harness is a large but mechanical job; leaving it
  requires module renames to get rid of `spec_from_file_location`.
- `typecheck-scripts.ts` filtering: unknown how many errors it hides; run `tsc -p tsconfig.scripts.json` unfiltered first.
- Confidence notes: delete candidates in section 4 "Confident" were checked by basename and stem search; "owner decision"
  items have callers only in tests or dispatch-only workflows. Counts of helper copies come from regex searches and may
  be off by a few.

## 8. Per-script caller table

Columns: `npm` = package.json script; `wf` = workflow file; `scripts` = another script imports or spawns it;
`listed-only in` = named only in a hand-maintained inventory list (not an invocation); `test` = test files
(import, spawn, or source read); `specs` = spec harness files; `app/config` = app source, Android files or
vite/playwright config; `docs/comments` = README/docs or comment-only mentions.
"Campaign" = a manual device runner listed in `android-instrumentation.ts` `CAMPAIGN_RUNNERS` that no workflow runs.

| script | lines | callers | verdict |
|---|---:|---|---|
| `agent-bundle-dependencies.ts` | 38 | scripts generate-licenses.ts, stage-local-agent-runtime.ts; listed-only in quint-lib.ts; test runtime-licenses.test.mjs, sbom.test.mjs | keep |
| `agent-embeddings.ts` | 38 | scripts cloud-resident-host.ts, start-local-remote.ts, start-local-voice-agent.ts, start-reviewed-workflow-agent.ts; test agent-embedding-overrides.test.mjs, agent-identity.test.mjs, fixtures/product-character-host.mjs; specs x3 | keep |
| `agent-identity.ts` | 66 | scripts start-combined-agent.ts, start-local-remote.ts, start-local-voice-agent.ts, start-reviewed-workflow-agent.ts; test agent-identity.test.mjs, fixtures/agent-identity-canonical.test.ts, product-character-host.test.mjs; specs x5; app/config native-cloud-runtime.ts | keep |
| `agent-model.ts` | 15 | scripts eval-device-action-clarification.ts, start-combined-agent.ts, start-local-remote.ts, start-local-voice-agent.ts +1; test agent-model-selection.test.mjs; specs x5 | merge into agent-identity.ts - 15-line launcher helper |
| `aggregate-voice-latency.ts` | 175 | scripts native-voice-latency-emulator.ts; test diagnostics-export.test.mjs, native-voice-latency.test.mjs, voice-entry-timing.test.mjs +1; app/config diagnostics-export.ts, voice-timing.ts | keep |
| `android-abis.ts` | 18 | scripts android-stage-voice-models.ts, paradee-runtime.ts, voice-host.ts; test android-build-path.test.mjs, paradee-runtime.test.mjs, upstream-pin-guard.test.mjs | keep; drop runtime re-validation of typed input |
| `android-browser-reading-live.ts` | 332 | listed-only in android-instrumentation.ts | owner decision: manual device campaign (not run by CI) - keep and document, or delete with its runner tests |
| `android-build-preflight.ts` | 336 | npm android:build:inputs, android:build:local; scripts build-android.ts, gradle-verification.ts; listed-only in quint-lib.ts, source-snapshot.ts; test android-build-path.test.mjs, mobile-uuid-build.test.mjs, one-runtime-profile.test.mjs +2; specs x2 | keep |
| `android-cloud-voice-timing.ts` | 211 | test android-cloud-voice-timing.test.mjs | manual tool: only tests/specs import it - keep only if still run by hand, else delete with its test |
| `android-gzip-assets.ts` | 69 | npm android:sync; scripts verify-apks.ts; listed-only in quint-lib.ts; test android-gzip-assets.test.mjs; specs x2 | keep |
| `android-host.ts` | 117 | npm android:host; scripts build-android.ts, build-archive.ts, build-notification-fixture.ts, ci/build-private-peer.py +3; listed-only in quint-lib.ts, source-snapshot.ts; test android-host.test.mjs, fixtures/android-browser-module-stage.mjs, gradle-verification.test.mjs +3; specs x1; app/config .gitignore, consumer-host.json | keep |
| `android-instrumentation.ts` | 753 | npm test:android:instrumentation; scripts developer-archive.ts, owner/emulator-campaign-check.ts, pilot-update.ts, test-calendar-regression.ts +1; test android-instrumentation-runner.test.mjs, ci-emulator-evidence.test.mjs, fixtures/isolated-native-campaign.mjs +1; specs x3; docs/comments x2 | split registry data (JSON) from runner - 753-line monolith with CAMPAIGN_RUNNERS/NOT_RUN registries |
| `android-paired-speech-live.ts` | 92 | listed-only in android-instrumentation.ts | owner decision: manual device campaign (not run by CI) - keep and document, or delete with its runner tests |
| `android-resident-instrumentation.ts` | 52 | listed-only in android-instrumentation.ts; test qualify-head.test.mjs; app/config ResidentEgressRedactionInstrumentedTest.java; docs/comments x1 | owner decision: manual device campaign (not run by CI) - keep and document, or delete with its runner tests |
| `android-stage-voice-models.ts` | 205 | wf android-emulator.yml, resident-android.yml; scripts android-build-preflight.ts, voice-host.ts; listed-only in source-snapshot.ts; test android-stage-voice-models.test.mjs, voice-host-record.test.mjs; app/config qualified-voice-host.json; docs/comments x1 | keep |
| `android-workflow-native.ts` | 206 | listed-only in android-instrumentation.ts; test developer-archive.test.mjs, fixtures/isolated-native-campaign.mjs; app/config WorkflowApprovalNoticeProcessDeathInstrumentedTest.java | owner decision: manual device campaign (not run by CI) - keep and document, or delete with its runner tests |
| `aosp-capability-overlay.ts` | 27 | scripts stage-aosp.ts; test aosp-capabilities.test.mjs | keep |
| `aosp-clock-contract.ts` | 2 | scripts stage-aosp.ts, verify-aosp-clock.ts; test aosp-release-signing.test.mjs | delete; import upstream module directly - 2-line re-export of vendor module |
| `aosp-cuttlefish.ts` | 18 | scripts stage-aosp.ts; test aosp-cuttlefish.test.mjs | keep |
| `aosp-image-capability.ts` | 17 | scripts stage-aosp.ts; test aosp-image-capability.test.mjs | delete; import upstream module directly - pure re-export of vendor module |
| `aosp-listener-systemui.ts` | 28 | test aosp-listener-systemui.test.mjs, aosp-listener.test.mjs | manual tool: only tests/specs import it - keep only if still run by hand, else delete with its test |
| `aosp-listener.ts` | 19 | scripts stage-aosp.ts, verify-aosp-listener.ts, verify-apks.ts | keep |
| `aosp-ota-update.ts` | 40 | npm aosp:retain-known-good; test aosp-release-signing.test.mjs, aosp-retain-known-good.test.mjs | keep |
| `aosp-pixel10a.ts` | 110 | scripts aosp-release-record.ts, sign-aosp-release.ts, stage-aosp.ts; test aosp-pixel10a.test.mjs, aosp-release-signing.test.mjs, owner-sign-aosp-release-edges.test.mjs | keep |
| `aosp-provisioning-overlay.ts` | 43 | scripts stage-aosp.ts; test aosp-provisioning-overlay.test.mjs | keep |
| `aosp-release-record.ts` | 26 | test aosp-release-signing.test.mjs | delete; call upstream CLI directly - re-export + main() of vendor module; test-only caller |
| `aosp-secure-camera-contract.ts` | 38 | scripts stage-aosp.ts, verify-aosp-secure-camera.ts; test aosp-secure-camera-policy.test.mjs, aosp-secure-camera.test.mjs, aosp-staging-patches.test.mjs | keep |
| `aosp-unsigned-debug.init.gradle` | 5 | **nobody** | delete - no reference in repo or vendor/eliza |
| `apk.ts` | 328 | scripts build-archive.ts, owner/emulator-campaign-check.ts, pilot-update.ts, provision-unit.ts +6; listed-only in quint-lib.ts, source-snapshot.ts; test aosp-image-capability.test.mjs, aosp-sms.test.mjs, apk-alpha-power-policy.test.mjs +11; specs x1; app/config AndroidManifest.xml | keep |
| `app-update-candidate.ts` | 312 | wf resident-android.yml; test app-update-candidate.test.mjs; specs x3 | keep |
| `audit-production-bundle.ts` | 180 | npm audit:bundle; wf android.yml, browser.yml; scripts apk.ts, qualify-head.ts; listed-only in quint-lib.ts; test agent-always-local.test.mjs, avatar-initials-audit.test.mjs, browser/production-surface.spec.ts +9; app/config development-cloud-agents.ts, playwright.config.ts; docs/comments x2 | keep |
| `browser-cloud-dev-bridge.ts` | 519 | scripts gmail-agent-read-host.ts; listed-only in quint-lib.ts; test browser-cloud-dev-bridge.test.mjs, cloud-deployment.test.mjs, cloud-email-resend.test.mjs +3; specs x5; app/config vite.config.ts; docs/comments x1 | move to a dev-server/ folder - vite dev-server middleware |
| `browser-full-reload.ts` | 35 | specs x4; app/config vite.config.ts | move to a vite-plugins/ folder - vite plugin, not a script |
| `browser-pdf-assets.ts` | 15 | app/config vite.config.ts; docs/comments x1 | move to a vite-plugins/ folder - vite plugin, not a script |
| `build-android.ts` | 319 | npm android:build; scripts build-archive.ts, gradle-verification.ts, pilot-update.ts, provision-unit.ts +7; listed-only in quint-lib.ts, source-snapshot.ts; test android-build-path.test.mjs, android-consumer-build.test.mjs, gradle-verification.test.mjs +5; specs x3; docs/comments x1 | keep |
| `build-archive.ts` | 107 | wf resident-android.yml; scripts developer-archive.ts; test embedding-workflow-forwarding.test.mjs, gradle-verification.test.mjs, one-runtime-profile.test.mjs +1; docs/comments x1 | keep |
| `build-embedding-host.ts` | 231 | npm agent:build-embedding-host; wf resident-android.yml; scripts android-build-preflight.ts; listed-only in quint-lib.ts; test android-build-path.test.mjs, embedding-host-admission.test.mjs, strict-build-inputs.test.mjs +1; specs x2 | keep |
| `build-mobile-agent.ts` | 30 | scripts mobile-uuid-adapter.ts, stage-local-agent-runtime.ts, verify-packaged-runtime.py; listed-only in quint-lib.ts, source-snapshot.ts; test android-build-path.test.mjs, android-runtime-staging-selection.test.mjs, mobile-uuid-build.test.mjs; specs x1 | keep |
| `build-native-google-host.ts` | 61 | scripts native-google-host-artifact.ts; listed-only in quint-lib.ts; test fixtures/native-google-host-builder-port.mjs; specs x3 | keep |
| `build-notification-fixture.ts` | 28 | scripts gradle-verification.ts; test gradle-verification.test.mjs | keep |
| `build-pinned-voice.ts` | 58 | test pinned-voice-build.test.mjs | manual tool: only tests/specs import it - keep only if still run by hand, else delete with its test |
| `build-policy-source.ts` | 7 | scripts core-state-patch.ts, mobile-uuid-adapter.ts, verify-packaged-runtime.py; listed-only in quint-lib.ts, source-snapshot.ts; test android-build-path.test.mjs, core-state-patch.test.mjs, fixtures/mobile-uuid-build.mjs +2; specs x7 | keep |
| `build-workflow-worker.ts` | 22 | npm agent:build-workflow-worker; listed-only in quint-lib.ts, source-snapshot.ts; specs x2 | keep |
| `bun-runtime.d.ts` | 40 | **nobody** | keep - ambient Bun types for bun-run scripts |
| `check-cloud-recording-signature.ts` | 31 | wf resident-prepare.yml; test cloud-voice-profile.test.mjs | keep |
| `check-lemma.ts` | 119 | npm lemma:check; wf lemma-check.yml; test lemma-check.test.mjs, lemma-checker.test.mjs; specs x1 | simplify (drop receipt, re-hash, frozen-restore) - see Quint section |
| `check-quint-refinement.ts` | 217 | npm quint:refinement; specs x1 | move to specs/quint/refinement/run.mjs - driver for spec adapters |
| `check-quint.ts` | 249 | npm quint:check, quint:typecheck, quint:test, quint:simulate, quint:verify, quint:temporal, quint:compare; wf quint-model-check.yml; scripts ci/check-changed-models.ts; test ci-affected.test.mjs, quint-changed-models.test.mjs, quint-checker.test.mjs | simplify (drop receipts/canaries/input re-hash) - see Quint section |
| `child-command.ts` | 31 | scripts run-node-tests.ts, test-cloud-subscription.ts, test-connection-history.ts, test-device-actions.ts +1; listed-only in quint-lib.ts; test node-test-runner.test.mjs | keep (only shared spawn helper) and reuse it - used by 5 scripts |
| `ci/acquire-resident-bun.py` | 127 | wf bun-spawn-seccomp.yml, resident-android.yml; scripts ci/test-acquire-resident-bun.py | keep |
| `ci/admit-cloud-signing-input.py` | 168 | scripts ci/qualified-app-update.py, ci/verify-cloud-signing-input.sh; listed-only in quint-lib.ts; test cloud-signing-input.test.py; specs x2 | keep |
| `ci/affected.ts` | 112 | wf changes.yml; test ci-affected.test.mjs, ci-emulator-evidence.test.mjs, ci-required-checks.test.mjs | keep |
| `ci/build-app-signing-fixtures.py` | 53 | wf release-app-signing.yml | keep |
| `ci/build-private-peer.py` | 33 | wf resident-android.yml; scripts ci/resident_fixture.py; test resident-native-ci-admission.test.mjs; app/config build.gradle | keep |
| `ci/calendar-bridge.init.gradle` | 271 | scripts ci/calendar-bridge.py; test resident-native-ci-admission.test.mjs | keep |
| `ci/calendar-bridge.py` | 471 | wf android.yml; test ci-pin-bound-scripts.test.mjs, resident-native-ci-admission.test.mjs; docs/comments x1 | keep |
| `ci/check-changed-models.ts` | 115 | npm quint:changed; test quint-changed-models.test.mjs | simplify: pass changed model names to check-quint - re-implements receipt checking around check-quint |
| `ci/embedding-artifacts.py` | 343 | wf embedding-qualification-carrier.yml, resident-android.yml; scripts ci/hosted-native-inputs.py; test embedding-artifact-inputs.test.py | keep |
| `ci/emulator-suite.ts` | 221 | wf android-emulator.yml; scripts ci/speech-candidate.ts, owner/emulator-campaign-check.ts; test ci-emulator-evidence.test.mjs, owner-emulator-campaign-check.test.mjs | keep |
| `ci/export-browser-proof.ts` | 139 | wf browser.yml, resident-prepare.yml; test browser-proof-export.test.mjs | keep |
| `ci/fixtures/recovery-dismiss-52ab-v2.json` | 22 | scripts ci/test-recovery-ui-guard.py | move to test/fixtures - fixture of a python test |
| `ci/fixtures/recovery-idle-52ab.json` | 18 | scripts ci/test-recovery-ui-guard.py | move to test/fixtures - fixture of a python test |
| `ci/fixtures/recovery-policy-52ab.txt` | 76 | scripts ci/test-recovery-ui-guard.py | move to test/fixtures - fixture of a python test |
| `ci/fixtures/recovery-storage-e4d-pass.txt` | 23 | scripts ci/test-recovery-ui-guard.py | move to test/fixtures - fixture of a python test |
| `ci/hosted-native-inputs.py` | 210 | wf resident-android.yml; test hosted-native-inputs.test.py; docs/comments x1 | keep |
| `ci/pending-recovery-ui.py` | 133 | wf resident-android.yml; scripts ci/test-pending-recovery-phases.py, owner/emulator-campaign-check.ts; listed-only in android-instrumentation.ts; app/config WorkflowNoticeProcessDeathInstrumentedTest.java | keep |
| `ci/prepare-dafny.sh` | 13 | wf browser.yml | keep |
| `ci/prepare-host-test-json.sh` | 11 | wf android.yml, browser.yml, resident-android.yml | keep |
| `ci/private-apk-storage.py` | 149 | wf release-cloud-app-signing.yml; scripts ci/qualified-app-update.py, ci/sign-os-ota.py, ci/verify-cloud-signing-input.sh; listed-only in quint-lib.ts; test cloud-signing-input.test.py; specs x2 | keep |
| `ci/private-artifact-identity.json` | 47 | test qualified-app-update.test.mjs | move to docs/ or the workflow that uses it - read only by a test |
| `ci/qualified-app-update.py` | 337 | wf publish-qualified-app-update.yml; listed-only in quint-lib.ts; test qualified-app-update.test.py; specs x2 | keep |
| `ci/read-required-checks.ts` | 183 | test ci-ruleset-readback.test.mjs | keep as owner tool (move to owner/) - test-only caller; uses owner/gh-readonly |
| `ci/recovery_ui_guard.py` | 112 | scripts ci/pending-recovery-ui.py, ci/test-pending-recovery-phases.py, ci/test-recovery-ui-guard.py | keep |
| `ci/release-custody-proof.py` | 247 | wf release-custody-proof.yml; scripts ci/release-custody-proof.test.py, ci/sign-os-ota.py | keep |
| `ci/release-custody-proof.test.py` | 171 | wf release-custody-proof.yml | move to test/ - python test in scripts/ci |
| `ci/reproduce-bun-spawn-seccomp.py` | 178 | wf bun-spawn-seccomp.yml | owner decision: delete with bun-spawn-seccomp.yml - dispatch-only reproduction of an upstream defect |
| `ci/reproduce-paradee-model.py` | 86 | wf reproduce-paradee-model.yml; test ci-pin-bound-scripts.test.mjs | owner decision: delete with reproduce-paradee-model.yml - dispatch-only reproduction |
| `ci/required-checks-ruleset.json` | 26 | scripts ci/read-required-checks.ts; test ci-required-checks.test.mjs | keep |
| `ci/required-result.ts` | 28 | wf android.yml, browser.yml; test ci-required-checks.test.mjs | keep |
| `ci/resident-native.py` | 154 | wf resident-android.yml; scripts owner/emulator-campaign-check.ts; listed-only in android-instrumentation.ts; test resident-crash-diagnostic.test.py | keep |
| `ci/resident-phase.py` | 49 | wf digest-restart.yml, resident-android.yml, resident-prepare.yml; scripts ci/test-resident-phase.py | keep |
| `ci/resident_absence.py` | 49 | scripts ci/pending-recovery-ui.py, ci/resident-native.py | keep |
| `ci/resident_crash_diagnostic.py` | 116 | scripts ci/resident-native.py, ci/resident_uid_crash_audit.py; test resident-crash-diagnostic.test.py | keep |
| `ci/resident_fixture.py` | 50 | scripts ci/pending-recovery-ui.py, ci/resident-native.py; test resident-native-ci-admission.test.mjs | keep |
| `ci/resident_native_source.py` | 32 | scripts ci/resident_fixture.py; listed-only in source-snapshot.ts; test resident-native-ci-admission.test.mjs | keep |
| `ci/resident_uid_crash_audit.py` | 81 | scripts ci/resident-native.py, ci/resident_crash_diagnostic.py, ci/test-resident-uid-crash-audit.py | keep |
| `ci/run-browser.ts` | 19 | wf browser.yml | keep |
| `ci/seal-signed-apks.py` | 67 | wf release-cloud-app-signing.yml | keep |
| `ci/sign-os-ota.py` | 279 | wf release-os-ota-signing.yml; scripts ci/sign-os-ota.test.py; test qualified-app-update.test.mjs | keep |
| `ci/sign-os-ota.test.py` | 130 | wf release-os-ota-signing.yml | move to test/ - python test in scripts/ci |
| `ci/speech-candidate.ts` | 164 | wf android-emulator.yml; test ci-emulator-evidence.test.mjs; docs/comments x1 | keep |
| `ci/test-acquire-resident-bun.py` | 145 | wf resident-android.yml | move to test/ - python test living in scripts/ci |
| `ci/test-pending-recovery-phases.py` | 174 | wf resident-android.yml; test python-suites.test.mjs | move to test/; run once (not both npm test and resident-android.yml) - duplicate CI run |
| `ci/test-recovery-ui-guard.py` | 135 | wf resident-android.yml; test python-suites.test.mjs | move to test/; run once - duplicate CI run |
| `ci/test-resident-phase.py` | 48 | wf resident-android.yml, resident-prepare.yml | move to test/; run in one workflow - runs in resident-android.yml and resident-prepare.yml |
| `ci/test-resident-uid-crash-audit.py` | 28 | test resident-crash-diagnostics.test.mjs | move to test/ - python test in scripts/ci |
| `ci/upstream-reachability.json` | 26 | scripts pinned-upstream-source.ts; test upstream-reachability.test.mjs | keep |
| `ci/verify-cloud-signing-input.sh` | 57 | wf release-cloud-app-signing.yml, resident-android.yml, verify-cloud-signing-input.yml; test cloud-signing-input.test.py, embedding-workflow-forwarding.test.mjs; specs x3 | keep |
| `cloud-deployment-policy.ts` | 29 | scripts cloud-deployment.ts, cloud-readiness.ts, cloud-sdk-authority.ts, verify-apks.ts; listed-only in quint-lib.ts, source-snapshot.ts; test ci-affected.test.mjs, cloud-deployment.test.mjs, cloud-email-deployment.test.mjs +2; specs x4; app/config CloudDeployment.java, ConnectionRoutes.java; docs/comments x2 | keep |
| `cloud-deployment.ts` | 104 | npm verify; scripts cloud-readiness.ts; listed-only in quint-lib.ts, source-snapshot.ts; test android-host.test.mjs, cloud-deployment.test.mjs, cloud-email-deployment.test.mjs; app/config CloudDeployment.java, cloud-deployment.generated.gradle; docs/comments x1 | keep |
| `cloud-email-code.ts` | 33 | scripts browser-cloud-dev-bridge.ts; listed-only in quint-lib.ts; test cloud-email-deployment.test.mjs, cloud-email-resend.test.mjs, cloud-sign-in-flow.test.mjs; specs x1 | keep |
| `cloud-readiness.ts` | 255 | test cloud-readiness.test.mjs; docs/comments x1 | manual tool: only tests/specs import it - keep only if still run by hand, else delete with its test |
| `cloud-resident-host.ts` | 203 | scripts browser-cloud-dev-bridge.ts; listed-only in quint-lib.ts; test cloud-deployment.test.mjs, cloud-resident-embedding-route.test.mjs, cloud-resident-full-profile.test.mjs +2; specs x3 | keep |
| `cloud-sdk-authority.ts` | 14 | scripts cloud-deployment.ts, cloud-resident-host.ts, start-cloud-qa.ts; test cloud-deployment.test.mjs, cloud-sdk-routing.test.mjs, fixtures/product-character-host.mjs +1; specs x4 | merge into cloud-deployment-policy.ts - 14 lines |
| `cloud-subscription-latency.ts` | 94 | **nobody** | delete - no caller; one-off latency probe for issue #410 |
| `combined-agent-source.ts` | 47 | scripts core-state-patch.ts, core-state-preload.ts, start-combined-agent.ts, verify-packaged-runtime.py; listed-only in quint-lib.ts, source-snapshot.ts; test core-state-patch.test.mjs, host-speech-admission.test.mjs; specs x4 | keep |
| `compare-prototype.py` | 35 | **nobody** | delete - no caller; compares prototype captures |
| `copy-file-clone.ts` | 69 | scripts local-agent-source.ts, prepare-local-agent.ts, stage-aosp-native.py, verify-upstream.ts; listed-only in quint-lib.ts, source-snapshot.ts; test android-build-path.test.mjs, aosp-native-fixtures.py, client-feature-preparation.test.mjs +5; specs x8 | keep |
| `core-state-patch.ts` | 167 | scripts build-mobile-agent.ts, build-native-google-host.ts, cloud-resident-host.ts, core-state-preload.ts +8; listed-only in quint-lib.ts, source-snapshot.ts; test android-build-path.test.mjs, core-runtime-transform.test.mjs, core-state-patch.test.mjs +9; specs x16 | keep |
| `core-state-preload.ts` | 25 | scripts core-state-patch.ts, verify-packaged-runtime.py; listed-only in quint-lib.ts, source-snapshot.ts; test core-state-patch.test.mjs; specs x5 | keep |
| `deliver-app-update.ts` | 236 | wf publish-qualified-app-update.yml; scripts app-update-candidate.ts; listed-only in quint-lib.ts; test deliver-app-update.test.mjs, qualified-app-update.test.mjs; specs x3; docs/comments x1 | keep |
| `dev-cartesia.ts` | 18 | scripts start-local-remote.ts; test dev-cartesia.test.mjs | keep |
| `dev-cloud.ts` | 33 | npm dev:cloud; listed-only in quint-lib.ts; test cloud-resident-host.test.mjs, dev-ui-remote-host.test.mjs; specs x1 | keep |
| `dev-local.ts` | 49 | npm dev, dev:local; listed-only in quint-lib.ts; test client-feature-preparation.test.mjs, dev-local-launcher.test.mjs, private-cloud-restore.test.mjs; specs x1 | keep; drop duplicate prepareClientFeatures() (predev already runs it) - also aliased twice: dev and dev:local |
| `dev-speech-settings.ts` | 51 | scripts dev-local.ts; test client-feature-preparation.test.mjs, dev-local-launcher.test.mjs, dev-speech-settings.test.mjs | keep |
| `dev-ui-remote-host.ts` | 22 | test dev-ui-remote-host.test.mjs | owner decision - only a test imports it |
| `developer-archive.ts` | 92 | test developer-archive.test.mjs; docs/comments x1 | manual tool: only tests/specs import it - keep only if still run by hand, else delete with its test |
| `embedding-build-remap.ts` | 18 | scripts prepare-embedding-host.ts; test embedding-host-preparation.test.mjs | merge into prepare-embedding-host.ts - one caller |
| `embedding-native-contract.ts` | 64 | scripts prepare-embedding-host.ts, stage-embedding-host.ts; test android-build-path.test.mjs, embedding-host-admission.test.mjs, embedding-host-producer-closure.test.mjs +3 | keep |
| `enroll-release-keys.ts` | 262 | scripts android-build-preflight.ts; test enroll-release-keys.test.mjs; app/config alpha-key-manifest.json | keep |
| `eval-device-action-clarification.ts` | 235 | test device-action-clarification-eval.test.mjs, device-capability-selection.test.mjs | keep as manual eval or delete - test-only callers |
| `feature-manifest.ts` | 45 | scripts prepare-client-features.ts; test direct-provider-module-budget.test.mjs, feature-parity.test.mjs | keep |
| `fetch-alpha-os-preset-inputs.py` | 29 | listed-only in quint-lib.ts; specs x1; docs/comments x1 | manual tool: only tests/specs import it - keep only if still run by hand, else delete with its test |
| `fingerprint-voice-assets.ts` | 30 | **nobody** | delete - no caller; macOS-only one-off closure hash (only a test regex allow-list names it) |
| `fixtures/bundled-module.ts` | 41 | scripts test-inbox-multiple-drafts.ts, test-inbox-saved-drafts.ts, test-mail-html.ts | move to test/fixtures |
| `fixtures/calendar-adapter.ts` | 93 | scripts test-calendar-crud-review.ts, test-calendar-query-race.ts; test browser/calendar-options.spec.ts, calendar-delete-latch.test.mjs, calendar-view-rules.test.mjs +4; specs x3; docs/comments x1 | move to test/fixtures |
| `fixtures/cloud-delegation/capacitor.ts` | 24 | scripts test-cloud-delegation.ts | move to test/fixtures |
| `fixtures/cloud-delegation/controls.ts` | 29 | scripts fixtures/cloud-delegation/capacitor.ts, fixtures/cloud-delegation/entry.tsx, fixtures/cloud-delegation/native.ts | move to test/fixtures |
| `fixtures/cloud-delegation/entry.tsx` | 31 | scripts fixtures/cloud-delegation/index.html, fixtures/hosted-live-source/index.html | move to test/fixtures |
| `fixtures/cloud-delegation/index.html` | 1 | scripts audit-production-bundle.ts, ci/export-browser-proof.ts, prototype-capture.ts, test-cloud-delegation.ts +1; listed-only in quint-lib.ts; test avatar-initials-audit.test.mjs, browser-proof-export.test.mjs, browser/dev-reload.spec.ts +6; specs x10 | move to test/fixtures |
| `fixtures/cloud-delegation/native.ts` | 34 | scripts test-cloud-delegation.ts; test browser/browser-voice-registration.spec.ts, browser/native-cloud-subscription.spec.ts, support/feature-parity.mjs; specs x2 | move to test/fixtures |
| `fixtures/device-action-journal.ts` | 31 | scripts test-agent-camera-flow.ts, test-device-actions.ts | move to test/fixtures |
| `fixtures/hosted-digest-protocol.ts` | 9 | scripts test-digest-cancellation.ts, test-local-digest-storage.ts | move to test/fixtures |
| `fixtures/hosted-live-source/entry.tsx` | 16 | scripts fixtures/cloud-delegation/index.html, fixtures/hosted-live-source/index.html | move to test/fixtures |
| `fixtures/hosted-live-source/index.html` | 1 | scripts audit-production-bundle.ts, ci/export-browser-proof.ts, prototype-capture.ts, test-cloud-delegation.ts +1; listed-only in quint-lib.ts; test avatar-initials-audit.test.mjs, browser-proof-export.test.mjs, browser/dev-reload.spec.ts +6; specs x10 | move to test/fixtures |
| `fixtures/inbox-memory.ts` | 17 | scripts inbox-adapter-fixture.ts, test-inbox-cloud-flow.ts, test-inbox-drafts-browser.ts, test-inbox-grant-withdrawal.ts +1 | move to test/fixtures |
| `fixtures/local-agent-stream.ts` | 19 | scripts test-batch-progress-stream.ts, test-batch-voice-progress-ack.ts, test-local-agent-stream.ts, test-local-redaction.ts; test fixtures/cloud-voice-view.mjs, support/feature-parity.mjs; docs/comments x1 | move to test/fixtures |
| `fixtures/loopback.ts` | 20 | scripts eval-device-action-clarification.ts, fixtures/speech-bridge.ts, test-cloud-delegation.ts, test-cloud-personal-flow.ts +12 | move to test/fixtures |
| `fixtures/playwright.ts` | 29 | scripts maps/test-recovery-renderer.ts, maps/test-renderer.ts, test-agent-context-browser.ts, test-browser-bookmark-recovery.ts +6 | move to test/fixtures |
| `fixtures/prototype-script.ts` | 12 | scripts inbox-adapter-fixture.ts, test-clock-handoff-flow.ts, test-inbox-grant-withdrawal.ts, test-inbox-sent-cleanup.ts +1 | move to test/fixtures |
| `fixtures/speech-bridge.ts` | 63 | scripts test-agent-speech-bridge.ts, test-agent-tts-bridge.ts | move to test/fixtures |
| `fixtures/workflow-host.ts` | 102 | scripts test-reviewed-workflow-host.ts, test-workflow-approval-crash.ts, test-workflow-approvals-host.ts, test-workflow-cancel-recovery.ts +2 | delete with the six *-host.ts probes - only used by the unwired workflow host probes |
| `font-license-blockers.ts` | 150 | scripts audit-production-bundle.ts, verify-apks.ts; test font-license.test.mjs; app/config unverified-allowlist.json | keep |
| `generate-alpha-os-branding.ts` | 45 | listed-only in quint-lib.ts; specs x1; docs/comments x1 | manual tool: only tests/specs import it - keep only if still run by hand, else delete with its test |
| `generate-licenses.ts` | 1038 | npm licenses:packaged-runtime; wf resident-android.yml; scripts generate-sbom.ts, gradle-verification.ts, verify-apks.ts; listed-only in quint-lib.ts; test android-build-path.test.mjs, android-dependency-fingerprint.test.mjs, fixtures/voice-host-product.mjs +6; app/config THIRD_PARTY_NOTICES.txt, font-licenses.json; docs/comments x1 | split by source (npm/fonts/android/voice/runtime) - 1038-line monolith |
| `generate-sbom.ts` | 390 | npm sbom; wf android.yml; scripts build-android.ts, sign-release-apks.ts; test sbom.test.mjs, sign-release-apks.test.mjs, voice-host-record.test.mjs | keep; reuse generate-licenses collectors instead of re-walking - parallel inventory |
| `gmail-agent-dev-broker.ts` | 13 | scripts local-agent-dev-bridge.ts; test calendar-managed-rejection.test.mjs | merge into local-agent-dev-bridge.ts - 13 lines, one caller |
| `gmail-agent-read-host.ts` | 8 | scripts gmail-agent-dev-broker.ts; test gmail-agent-read-host.test.mjs | merge into gmail-agent-dev-broker.ts - 8 lines, one caller |
| `gradle-verification.ts` | 304 | npm android:deps:check, android:deps:write-verification; scripts generate-licenses.ts, generate-sbom.ts; test gradle-verification.test.mjs, one-runtime-profile.test.mjs, sbom.test.mjs | keep |
| `host-speech-admission.ts` | 64 | scripts fingerprint-voice-assets.ts, start-combined-agent.ts, start-local-remote.ts, start-local-voice-agent.ts; listed-only in quint-lib.ts; test agent-speech-environment.test.mjs, host-speech-admission.test.mjs; specs x3 | keep |
| `host-speech-assets.json` | 73 | scripts ci/reproduce-paradee-model.py, host-speech-admission.ts; test ci-pin-bound-scripts.test.mjs, font-license.test.mjs; specs x2 | keep |
| `inbox-adapter-fixture.ts` | 307 | scripts test-inbox-attention-flow.ts, test-inbox-cloud-flow.ts, test-inbox-retention-cases.ts | keep |
| `inject-emulator-audio.py` | 132 | scripts native-voice-latency-emulator.ts; test emulator-microphone-preflight.test.py; app/config NativeVoiceLatencyInstrumentedTest.java | keep |
| `instrumentation-result.ts` | 147 | scripts android-instrumentation.ts, android-workflow-native.ts, test-installed-upgrade.ts, test-native-calendar-deletion-restart.ts; test android-instrumentation-runner.test.mjs, instrumentation-outcome-status.test.mjs | keep |
| `launcher-child.ts` | 26 | scripts start-combined-agent.ts, start-reviewed-workflow-agent.ts; listed-only in quint-lib.ts; specs x5 | merge into private-runtime-launch.ts - launcher helper |
| `licence-policy.ts` | 223 | scripts audit-production-bundle.ts, font-license-blockers.ts, generate-licenses.ts, generate-sbom.ts +2; test font-license.test.mjs, licenses.test.mjs, runtime-licenses.test.mjs +1; app/config settings-adapter.ts; docs/comments x2 | keep |
| `local-agent-dev-bridge.ts` | 309 | scripts fixtures/speech-bridge.ts, test-local-agent-stream.ts, test-local-agent.ts; listed-only in quint-lib.ts; test automations-transport.test.mjs, cloud-prewarm.test.mjs, development-cloud-voice.test.mjs +4; app/config google-agent-access.ts, vite.config.ts | move to a dev-server/ folder - vite dev-server middleware |
| `local-agent-dev-storage.ts` | 99 | scripts local-agent-dev-bridge.ts, test-local-agent.ts, test-local-digest-storage.ts; listed-only in quint-lib.ts; specs x3 | keep |
| `local-agent-source.ts` | 119 | wf android.yml, browser.yml, digest-restart.yml; scripts android-build-preflight.ts, build-workflow-worker.ts, check-cloud-recording-signature.ts, ci/resident_native_source.py +27; listed-only in quint-lib.ts, source-snapshot.ts; test android-build-path.test.mjs, aosp-native-fixtures.py, calendar-managed-rejection.test.mjs +12; specs x10 | keep |
| `local-ocr-assets.ts` | 31 | specs x2; app/config vite.config.ts | move to a vite-plugins/ folder - vite plugin, not a script |
| `maps/dataset_manifest.py` | 88 | scripts maps/dev.ts, maps/serve-region.py, maps/test-dataset-manifest.py, maps/test-region.py | keep |
| `maps/dev.ts` | 56 | npm dev:maps; docs/comments x1 | keep |
| `maps/graphhopper.yml` | 31 | scripts maps/dataset_manifest.py, maps/dev.ts | keep |
| `maps/index-region.py` | 21 | scripts maps/dev.ts | keep |
| `maps/prepare-region.py` | 65 | scripts maps/dev.ts, maps/test-prepare-region.py | keep |
| `maps/serve-region.py` | 99 | scripts maps/dev.ts, maps/test-dataset-manifest.py, maps/test-native-recovery.ts; test maps-navigation.test.mjs | keep |
| `maps/test-dataset-manifest.py` | 116 | test maps-dataset-manifest.test.mjs | move to test/ - python test in scripts/maps |
| `maps/test-native-navigation.ts` | 54 | listed-only in android-instrumentation.ts; app/config MapsBackgroundNavigationInstrumentedTest.java | owner decision: manual device campaign (not run by CI) - keep and document, or delete with its runner tests |
| `maps/test-native-recovery.ts` | 77 | listed-only in android-instrumentation.ts | owner decision: manual device campaign (not run by CI) - keep and document, or delete with its runner tests |
| `maps/test-prepare-region.py` | 72 | test maps-dataset-manifest.test.mjs | move to test/ - python test in scripts/maps |
| `maps/test-recovery-renderer.ts` | 25 | **nobody** | delete (or move to test/browser) - no caller |
| `maps/test-region.py` | 29 | **nobody** | delete (or wire into maps-navigation test) - no caller |
| `maps/test-renderer.ts` | 134 | **nobody** | delete (or move to test/browser) - no caller; needs dev:maps running by hand |
| `mobile-bundle-smoke.ts` | 36 | scripts build-mobile-agent.ts, mobile-uuid-adapter.ts, verify-packaged-runtime.py; listed-only in quint-lib.ts, source-snapshot.ts; specs x1 | keep |
| `mobile-uuid-adapter.ts` | 81 | scripts android-build-preflight.ts, build-mobile-agent.ts, stage-local-agent-runtime.ts, verify-packaged-runtime.py; listed-only in quint-lib.ts, source-snapshot.ts; test android-build-path.test.mjs, fixtures/mobile-uuid-build.mjs, mobile-uuid-build.test.mjs +1; specs x3 | keep |
| `native-cloud-runtime-config-check.ts` | 46 | scripts test-native-cloud-runtime-config.ts | merge into test-native-cloud-runtime-config.ts - one caller |
| `native-google-host-artifact.ts` | 151 | scripts build-workflow-worker.ts, cloud-resident-host.ts, runtime-profile.ts, stage-local-agent-runtime.ts +1; listed-only in quint-lib.ts; test fixtures/product-character-host.mjs; specs x4 | keep |
| `native-google-product-host.ts` | 26 | scripts build-native-google-host.ts, native-google-host-artifact.ts; listed-only in quint-lib.ts; test fixtures/native-google-host-builder-port.mjs, one-runtime-profile.test.mjs, support/managed-google-agent.mjs; specs x2 | keep |
| `native-test-fixture.ts` | 219 | scripts android-workflow-native.ts, reminder-recovery-fixture.ts, test-browser-storage-format.ts, test-calendar-regression.ts +6 | keep |
| `native-view-policy.ts` | 19 | scripts cloud-resident-host.ts, stage-aosp-native.py, stage-local-agent-runtime.ts, start-cloud-qa.ts +2; listed-only in quint-lib.ts, source-snapshot.ts; test agent-action-preferences.test.mjs, agent-model-selection.test.mjs, aosp-native-fixtures.py +3; specs x5 | keep |
| `native-voice-latency-emulator.ts` | 140 | listed-only in android-instrumentation.ts | owner decision: manual device campaign (not run by CI) - keep and document, or delete with its runner tests |
| `native-voice-latency.ts` | 235 | scripts aggregate-voice-latency.ts; test diagnostics-export.test.mjs, native-voice-latency.test.mjs; app/config NativeVoiceLatencyInstrumentedTest.java | keep |
| `owner/InspectUpdateApk.java` | 86 | scripts update-apk-admission.ts; listed-only in quint-lib.ts | keep |
| `owner/VerifyApkRotation.java` | 158 | wf release-cloud-app-signing.yml; scripts owner/pilot-rotation.ts, sign-release-apks.ts; specs x2 | keep |
| `owner/emulator-campaign-check.ts` | 270 | test owner-emulator-campaign-check.test.mjs | owner decision (issue #676 planning aid) - test-only caller |
| `owner/forged-branch-scan.ts` | 126 | test owner-incident-response.test.mjs | archive after incident #658 closes - one-off incident response |
| `owner/gh-readonly.ts` | 162 | scripts ci/read-required-checks.ts, owner/forged-branch-scan.ts, owner/incident-access-audit.ts, owner/incident-ci-exposure.ts +2; test ci-ruleset-readback.test.mjs, owner-incident-response.test.mjs | keep |
| `owner/incident-2026-10-27-iocs.json` | 695 | scripts owner/gh-readonly.ts; docs/comments x3 | archive after incident #658 closes - incident data |
| `owner/incident-access-audit.ts` | 156 | test owner-incident-response.test.mjs | archive after incident #658 closes - one-off incident response |
| `owner/incident-ci-exposure.ts` | 159 | test owner-incident-response.test.mjs | archive after incident #658 closes - one-off incident response |
| `owner/input.ts` | 16 | scripts owner/emulator-campaign-check.ts, owner/merge-review.ts, owner/pilot-rotation-journal.ts, owner/pilot-rotation.ts; test embedding-artifact-inputs.test.py | keep |
| `owner/merge-review.ts` | 221 | test owner-merge-review.test.mjs | archive after incident #659 closes - one-off review aid for one merge |
| `owner/pilot-rotation-journal.ts` | 136 | scripts pilot-update.ts; test pilot-rotation-journal.test.mjs, pilot-update-export.test.mjs; specs x3 | keep |
| `owner/pilot-rotation.ts` | 78 | scripts pilot-update.ts; specs x2 | keep |
| `owner/read-branch-integrity.ts` | 126 | test owner-branch-integrity.test.mjs, owner-incident-response.test.mjs | manual tool: only tests/specs import it - keep only if still run by hand, else delete with its test |
| `owner/rulesets/alphacompute-org-shared-branch-integrity.json` | 29 | test owner-incident-response.test.mjs | manual tool: only tests/specs import it - keep only if still run by hand, else delete with its test |
| `owner/rulesets/default-branch-baseline.json` | 25 | test owner-incident-response.test.mjs | manual tool: only tests/specs import it - keep only if still run by hand, else delete with its test |
| `owner/rulesets/shared-branch-integrity.json` | 17 | test owner-incident-response.test.mjs | manual tool: only tests/specs import it - keep only if still run by hand, else delete with its test |
| `paradee-runtime.ts` | 113 | scripts android-stage-voice-models.ts, build-pinned-voice.ts, voice-host.ts; listed-only in source-snapshot.ts; test android-build-path.test.mjs, paradee-runtime.test.mjs, upstream-pin-guard.test.mjs; app/config asr-inputs.json, build.gradle | keep |
| `pilot-update.ts` | 410 | scripts provision-unit.ts; test pilot-units.test.mjs, pilot-update-export.test.mjs; specs x3; app/config DataIntegrityProvider.java; docs/comments x1 | keep |
| `pinned-upstream-source.ts` | 109 | scripts android-workflow-native.ts, build-pinned-voice.ts, native-test-fixture.ts, test-calendar-regression.ts +2; listed-only in source-snapshot.ts; test upstream-reachability.test.mjs; specs x3 | keep |
| `pixel10a-source-contract.ts` | 56 | scripts stage-aosp.ts, verify-pixel10a-source.ts; test pixel10a-source.test.mjs | keep (stage-aosp uses it) |
| `prepare-aosp-apk.py` | 90 | test aosp-apk-preparation.py | owner decision; test-only caller - no CI or pkg caller |
| `prepare-ci-emulator.ts` | 117 | wf resident-android.yml; scripts ci/emulator-suite.ts; test ci-emulator-evidence.test.mjs | keep |
| `prepare-ci-webview.ts` | 40 | scripts ci/emulator-suite.ts; test ci-emulator-evidence.test.mjs | keep |
| `prepare-client-features.ts` | 469 | npm upstream:prepare-client; scripts dev-cloud.ts, dev-local.ts, native-google-host-artifact.ts; listed-only in quint-lib.ts, source-snapshot.ts; test accessibility-coverage.test.mjs, client-feature-preparation.test.mjs, dev-local-launcher.test.mjs +8; specs x44 | keep |
| `prepare-embedding-host.ts` | 100 | scripts build-embedding-host.ts; listed-only in quint-lib.ts, source-snapshot.ts; test embedding-host-preparation.test.mjs, embedding-host-producer-closure.test.mjs, strict-build-inputs.test.mjs | keep |
| `prepare-local-agent.ts` | 87 | npm agent:prepare; wf android-emulator.yml, android.yml, browser.yml, digest-restart.yml, resident-android.yml; scripts build-workflow-worker.ts, dev-cloud.ts, dev-local.ts, stage-aosp-native.py +7; listed-only in quint-lib.ts, source-snapshot.ts; test aosp-native-fixtures.py, fixtures/prepare-local-agent.mjs, packaged-runtime.test.py +2; specs x2 | keep |
| `prepare-patched-native.ts` | 95 | scripts android-host.ts, verify-apks.ts; listed-only in quint-lib.ts, source-snapshot.ts; test android-dependency-fingerprint.test.mjs, android-host.test.mjs, browser-host-source-closure.test.mjs +23; specs x21; app/config build.gradle, consumer-host.json | keep |
| `prepare-quint-history.ts` | 38 | npm quint:prepare-history; test quint-tla-inventory.test.mjs | delete with specs/quint/legacy - fetches historical vendor commits only for legacy models |
| `prepared-workflow-worker.ts` | 48 | scripts build-workflow-worker.ts; listed-only in quint-lib.ts, source-snapshot.ts; test android-build-path.test.mjs, prepared-workflow-worker.test.mjs, quint-prepared-workflow-worker.test.mjs; specs x2 | keep |
| `private-runtime-launch.ts` | 57 | scripts agent-identity.ts, agent-model.ts, cloud-resident-host.ts, start-cloud-qa.ts +1; listed-only in quint-lib.ts; specs x6 | keep |
| `prototype-capture.ts` | 184 | **nobody** | delete - no caller; prototype presentation capture |
| `provision-unit.ts` | 289 | scripts pilot-update.ts, publish-update-manifest.ts, record-release.ts, update-apk-admission.ts; listed-only in quint-lib.ts; test pilot-units.test.mjs, update-apk-admission.test.mjs; specs x2 | keep |
| `publish-update-manifest.ts` | 109 | scripts deliver-app-update.ts; listed-only in quint-lib.ts; test publish-update-manifest.test.mjs; specs x2 | keep |
| `qualify-head.ts` | 465 | test docs-links.test.mjs, pilot-units.test.mjs, qualify-head.test.mjs; docs/comments x1 | owner decision: delete with its tests (local re-run of CI) - 465 lines; no CI/pkg caller; only tests import it |
| `quint-lib.ts` | 252 | wf quint-model-check.yml; scripts check-lemma.ts, check-quint-refinement.ts, check-quint.ts, ci/check-changed-models.ts; test lemma-check.test.mjs, lemma-checker.test.mjs, quint-checker.test.mjs +3; specs x18 | split: model loading stays; sourcePaths/runtimeScriptPaths move to specs/quint/refinement - mixes checker utils with product source enumeration |
| `record-release.ts` | 89 | test record-release.test.mjs | manual tool: only tests/specs import it - keep only if still run by hand, else delete with its test |
| `regular-files.ts` | 12 | scripts audit-production-bundle.ts, font-license-blockers.ts; listed-only in quint-lib.ts | merge into a scripts/lib/fs.ts with filesWithin - duplicates quint-lib filesWithin and 8 walk() copies |
| `release-blockers.ts` | 45 | scripts provision-unit.ts, qualify-head.ts, stage-aosp.ts; test aosp-release-signing.test.mjs, font-license.test.mjs, licenses.test.mjs +1; specs x1 | keep |
| `release-distributable.ts` | 27 | scripts verify-apks.ts; test font-license.test.mjs, release-signing.test.mjs | merge into verify-apks.ts - exists so a test can import a predicate |
| `reminder-recovery-fixture.ts` | 112 | scripts test-reminder-recovery.ts, test-reminder-recurrence-recovery.ts; listed-only in android-instrumentation.ts | owner decision: manual device campaign (not run by CI) - keep and document, or delete with its runner tests |
| `removed-profile-flags.ts` | 8 | scripts android-build-preflight.ts, build-android.ts, gradle-verification.ts, stage-local-agent-runtime.ts +1; listed-only in quint-lib.ts; test android-build-path.test.mjs, one-runtime-profile.test.mjs, upstream-pin-guard.test.mjs | delete - refuses flags removed by an earlier migration; 6 call sites just throw a migration message |
| `render-assetlinks.ts` | 438 | scripts audit-production-bundle.ts, cloud-readiness.ts, verify-apks.ts; test assetlinks-cloud-config.test.mjs, auth-callback-manifest.test.mjs, cloud-readiness.test.mjs +2; app/config AndroidManifest.xml, product.gradle; docs/comments x1 | keep |
| `resident-emulator-admission.ts` | 31 | scripts android-resident-instrumentation.ts; test resident-native-ci-admission.test.mjs | keep |
| `run-node-tests.ts` | 18 | npm test; test node-test-runner.test.mjs | replace with plain node --test in package.json - validates its own env var |
| `runtime-profile.ts` | 20 | wf resident-android.yml; scripts android-build-preflight.ts; listed-only in quint-lib.ts; test android-build-path.test.mjs, one-runtime-profile.test.mjs; app/config product.gradle | merge into native-google-host-artifact.ts - one function + a CLI that rejects removed --verify-cloud |
| `scan-archived-apks.py` | 75 | test archive-scan.test.mjs | owner decision (manual archive scan); test-only caller - reads the owner provider key from ~/.config |
| `sign-aosp-release.ts` | 41 | test aosp-release-signing.test.mjs, owner-sign-aosp-release-edges.test.mjs; app/config pixel10a-ota-channel.json, pixel10a-product.json | keep |
| `sign-release-apks.ts` | 363 | wf release-app-signing.yml, release-cloud-app-signing.yml; scripts android-build-preflight.ts; test sign-release-apks.test.mjs; specs x2 | keep |
| `source-snapshot.ts` | 56 | scripts build-archive.ts; listed-only in quint-lib.ts; test mobile-uuid-build.test.mjs, source-snapshot.test.mjs, verify-apks.test.mjs | keep; derive roots instead of hand list - hand-maintained list of 60+ paths |
| `speech-env.ts` | 28 | scripts dev-speech-settings.ts, host-speech-admission.ts; test client-feature-preparation.test.mjs, dev-local-launcher.test.mjs; specs x2 | simplify: drop RENAMED/RETIRED refusals - refuses env names retired by a migration |
| `stage-alpha-os-branding.py` | 195 | listed-only in quint-lib.ts; test aosp-fresh-presets.test.py; specs x2; docs/comments x2 | manual tool: only tests/specs import it - keep only if still run by hand, else delete with its test |
| `stage-aosp-native.py` | 101 | scripts aosp-cuttlefish.ts, aosp-pixel10a.ts; test aosp-native-fixtures.py | keep |
| `stage-aosp.ts` | 358 | npm aosp:stage; listed-only in quint-lib.ts; test aosp-capabilities.test.mjs, aosp-cuttlefish.test.mjs, aosp-image-capability.test.mjs +6; app/config AlphaImageCapability.java, AndroidManifest.xml; docs/comments x2 | keep |
| `stage-embedding-host.ts` | 157 | wf resident-android.yml; scripts android-build-preflight.ts, build-embedding-host.ts, generate-sbom.ts, prepare-embedding-host.ts; listed-only in quint-lib.ts, source-snapshot.ts; test android-build-path.test.mjs, embedding-host-admission.test.mjs, embedding-library-source.test.mjs +5; specs x2; app/config product.gradle | keep |
| `stage-local-agent-runtime.ts` | 75 | npm agent:stage-android; scripts generate-licenses.ts; listed-only in quint-lib.ts, source-snapshot.ts; test android-build-path.test.mjs, android-runtime-staging-selection.test.mjs, mobile-uuid-build.test.mjs +1; app/config THIRD_PARTY_NOTICES.txt, product.gradle | keep |
| `stage-local-agent-sources.ts` | 75 | scripts build-archive.ts, ci/resident_native_source.py; listed-only in quint-lib.ts, source-snapshot.ts; test alpha-system-entry.test.mjs, android-host.test.mjs, browser-web-features.test.mjs +5; specs x1; app/config consumer-host.json, proguard-rules.pro | keep |
| `stage-native-apps.ts` | 130 | app/config PasswordProviderSupport.java | delete - no caller; 2026-09-29 candidate receipt, only a Java comment names it |
| `stage-os-update-enrollment.ts` | 69 | test os-update-enrollment.test.mjs | manual tool: only tests/specs import it - keep only if still run by hand, else delete with its test |
| `stage-workflow-worker.ts` | 13 | npm agent:stage-workflow-worker; scripts stage-local-agent-runtime.ts; listed-only in quint-lib.ts, source-snapshot.ts; specs x2 | keep |
| `start-cloud-qa.ts` | 53 | listed-only in quint-lib.ts; test cloud-deployment.test.mjs, cloud-qa-launcher.test.mjs, core-state-patch.test.mjs; specs x3 | owner decision - only specs/tests reference it |
| `start-combined-agent.ts` | 66 | listed-only in android-instrumentation.ts, quint-lib.ts; test agent-identity.test.mjs, core-state-patch.test.mjs; specs x5 | owner decision - only specs/tests and a NOT_RUN note reference it |
| `start-local-remote.ts` | 79 | npm agent:local; scripts dev-local.ts, test-local-redaction.ts; listed-only in quint-lib.ts; test agent-embedding-overrides.test.mjs, agent-identity.test.mjs, agent-model-selection.test.mjs +2; specs x1 | merge launcher boilerplate into private-runtime-launch.ts - copy-pasted profile/port/key/token block |
| `start-local-voice-agent.ts` | 57 | listed-only in quint-lib.ts; test agent-identity.test.mjs, core-state-patch.test.mjs; specs x1 | merge into start-local-remote.ts behind --voice - copy-paste of start-local-remote; no pkg/CI caller |
| `start-reviewed-workflow-agent.ts` | 64 | listed-only in quint-lib.ts; test agent-embedding-overrides.test.mjs, agent-identity.test.mjs, core-state-patch.test.mjs; specs x5 | merge into start-local-remote.ts or delete with the workflow host probes - launcher for the unwired *-host.ts probes |
| `storage-specs.ts` | 43 | scripts ci/affected.ts, qualify-head.ts; test playwright-projects.test.mjs; app/config playwright.config.ts | keep (move next to playwright.config.ts) - data list for playwright |
| `test-agent-calendar-mutation-flow.ts` | 154 | test agent-calendar-mutation.test.mjs | move to test/ as the suite itself; delete the .test.mjs shim |
| `test-agent-camera-flow.ts` | 109 | test agent-camera-capture.test.mjs | move to test/ as the suite itself; delete the .test.mjs shim |
| `test-agent-context-browser.ts` | 218 | test browser/adapters.spec.ts | move to test/ as the suite itself; delete the .test.mjs shim |
| `test-agent-speech-bridge.ts` | 46 | test local-agent-contracts.test.mjs | move to test/ as the suite itself; delete the .test.mjs shim |
| `test-agent-tts-bridge.ts` | 45 | test local-agent-contracts.test.mjs | move to test/ as the suite itself; delete the .test.mjs shim |
| `test-android-notification-device-slot.ts` | 63 | test native-notification-device-slot.test.mjs | move to test/ as the suite itself; delete the .test.mjs shim |
| `test-automatic-update-platform.ts` | 182 | **nobody** | delete - no caller anywhere; owned-emulator probe with hard-coded macOS SDK/JDK paths |
| `test-batch-progress-stream.ts` | 64 | test batch-progress-stream.test.mjs | move to test/ as the suite itself; delete the .test.mjs shim |
| `test-batch-voice-progress-ack.ts` | 80 | test batch-voice-progress-ack.test.mjs | move to test/ as the suite itself; delete the .test.mjs shim |
| `test-browser-bookmark-recovery.ts` | 67 | test browser/adapters.spec.ts | move to test/ as the suite itself; delete the .test.mjs shim |
| `test-browser-storage-format.ts` | 17 | listed-only in android-instrumentation.ts | owner decision: manual device campaign (not run by CI) - keep and document, or delete with its runner tests |
| `test-calendar-availability-flow.ts` | 259 | test calendar-availability.test.mjs | move to test/ as the suite itself; delete the .test.mjs shim |
| `test-calendar-availability-provider-rows.ts` | 21 | test calendar-availability-reader.test.mjs | move to test/ as the suite itself; delete the .test.mjs shim |
| `test-calendar-crud-review.ts` | 97 | test adapter-contracts.test.mjs | move to test/ as the suite itself; delete the .test.mjs shim |
| `test-calendar-query-race.ts` | 55 | test adapter-contracts.test.mjs | move to test/ as the suite itself; delete the .test.mjs shim |
| `test-calendar-regression.ts` | 134 | listed-only in android-instrumentation.ts; test fixtures/isolated-native-campaign.mjs; app/config CalendarFlowInstrumentedTest.java, HomeCalendarCardInstrumentedTest.java | owner decision: manual device campaign (not run by CI) - keep and document, or delete with its runner tests |
| `test-calendar-sync-provider.ts` | 194 | test calendar-linked-provider.test.mjs | move to test/ as the suite itself; delete the .test.mjs shim |
| `test-canonical-notification-navigation.ts` | 161 | test canonical-notification-navigation.test.mjs | move to test/ as the suite itself; delete the .test.mjs shim |
| `test-clock-handoff-flow.ts` | 127 | test adapter-contracts.test.mjs, fixtures/workflow-clock-admission.mjs | move to test/ as the suite itself; delete the .test.mjs shim |
| `test-cloud-delegation-return.ts` | 37 | test browser/adapters.spec.ts | move to test/ as the suite itself; delete the .test.mjs shim |
| `test-cloud-delegation.ts` | 172 | test browser/adapters.spec.ts | move to test/ as the suite itself; delete the .test.mjs shim |
| `test-cloud-maps.ts` | 221 | test adapter-contracts.test.mjs | move to test/ as the suite itself; delete the .test.mjs shim |
| `test-cloud-personal-flow.ts` | 49 | test adapter-contracts.test.mjs | move to test/ as the suite itself; delete the .test.mjs shim |
| `test-cloud-protocol.ts` | 328 | test adapter-contracts.test.mjs | move to test/ as the suite itself; delete the .test.mjs shim |
| `test-cloud-subscription.ts` | 158 | test adapter-contracts.test.mjs | move to test/ as the suite itself; delete the .test.mjs shim |
| `test-cloud-voice-cancellation-flow.ts` | 44 | test adapter-contracts.test.mjs | move to test/ as the suite itself; delete the .test.mjs shim |
| `test-cloud-voice-flow.ts` | 104 | test adapter-contracts.test.mjs | move to test/ as the suite itself; delete the .test.mjs shim |
| `test-connection-history.ts` | 471 | test browser/connection-boundaries.production.spec.ts, connection-contracts.test.mjs | move to test/ as the suite itself; delete the .test.mjs shim |
| `test-cross-app-notifications.ts` | 202 | listed-only in android-instrumentation.ts | owner decision: manual device campaign (not run by CI) - keep and document, or delete with its runner tests |
| `test-device-actions.ts` | 162 | test adapter-contracts.test.mjs | move to test/ as the suite itself; delete the .test.mjs shim |
| `test-device-timing-source.ts` | 14 | npm agent:test-device-timing | move to test/ (keep npm alias) |
| `test-digest-cancellation.ts` | 47 | test local-agent-contracts.test.mjs | move to test/ as the suite itself; delete the .test.mjs shim |
| `test-gmail-mailbox.ts` | 133 | test adapter-contracts.test.mjs | move to test/ as the suite itself; delete the .test.mjs shim |
| `test-gmail-read-ahead.ts` | 26 | test gmail-read-ahead.test.mjs | move to test/ as the suite itself; delete the .test.mjs shim |
| `test-google-accounts.ts` | 93 | test google-accounts.test.mjs, google-calendar-connect.test.mjs | move to test/ as the suite itself; delete the .test.mjs shim |
| `test-google-calendar-protocol.ts` | 71 | test adapter-contracts.test.mjs | move to test/ as the suite itself; delete the .test.mjs shim |
| `test-google-calendar-selection.ts` | 41 | test google-calendar-selection.test.mjs | move to test/ as the suite itself; delete the .test.mjs shim |
| `test-hosted-live-source-picker.ts` | 30 | test browser/adapters.spec.ts | move to test/ as the suite itself; delete the .test.mjs shim |
| `test-inbox-attention-flow.ts` | 338 | test inbox.test.mjs | move to test/ as the suite itself; delete the .test.mjs shim |
| `test-inbox-cloud-flow.ts` | 449 | test adapter-contracts.test.mjs | move to test/ as the suite itself; delete the .test.mjs shim |
| `test-inbox-drafts-browser.ts` | 80 | test browser/adapters.spec.ts | move to test/ as the suite itself; delete the .test.mjs shim |
| `test-inbox-grant-withdrawal.ts` | 182 | test adapter-contracts.test.mjs | move to test/ as the suite itself; delete the .test.mjs shim |
| `test-inbox-multiple-drafts.ts` | 73 | test inbox.test.mjs | move to test/ as the suite itself; delete the .test.mjs shim |
| `test-inbox-retention-cases.ts` | 120 | test inbox-retention-cases.test.mjs | move to test/ as the suite itself; delete the .test.mjs shim |
| `test-inbox-saved-drafts.ts` | 32 | test inbox.test.mjs | move to test/ as the suite itself; delete the .test.mjs shim |
| `test-inbox-sent-cleanup.ts` | 629 | test adapter-contracts.test.mjs, browser/journey-f-email-notifications.spec.ts | move to test/ as the suite itself; delete the .test.mjs shim |
| `test-installed-upgrade.ts` | 141 | scripts owner/emulator-campaign-check.ts; listed-only in android-instrumentation.ts; test android-instrumentation-runner.test.mjs, installed-upgrade-runner.test.mjs; docs/comments x1 | owner decision: manual device campaign (not run by CI) - keep and document, or delete with its runner tests |
| `test-local-agent-source.ts` | 15 | npm agent:test | move to test/; wire into CI or delete - npm agent:test is never run by CI |
| `test-local-agent-stream.ts` | 271 | test local-agent-contracts.test.mjs | move to test/ as the suite itself; delete the .test.mjs shim |
| `test-local-agent.ts` | 182 | test local-agent-contracts.test.mjs | move to test/ as the suite itself; delete the .test.mjs shim |
| `test-local-digest-restart.ts` | 204 | npm agent:test-digest-restart; wf digest-restart.yml; test browser/dev-digest-schedule.spec.ts, browser/journey-d-digests.spec.ts, digest-restart-input.test.mjs | move to test/ (keep npm alias) |
| `test-local-digest-storage.ts` | 64 | test local-agent-contracts.test.mjs | move to test/ as the suite itself; delete the .test.mjs shim |
| `test-local-redaction.ts` | 192 | npm agent:test-redaction | move to test/; wire into CI or delete - npm agent:test-redaction is never run by CI |
| `test-mail-html.ts` | 27 | test mail-html.test.mjs | move to test/ as the suite itself; delete the .test.mjs shim |
| `test-maps-context-browser.ts` | 57 | test browser/adapters.spec.ts | move to test/ as the suite itself; delete the .test.mjs shim |
| `test-maps-device-navigation.ts` | 403 | test adapter-contracts.test.mjs | move to test/ as the suite itself; delete the .test.mjs shim |
| `test-maps-reroute-freshness.ts` | 134 | test maps-reroute-freshness.test.mjs | move to test/ as the suite itself; delete the .test.mjs shim |
| `test-mobile-workflow-bundle.ts` | 56 | npm agent:test-mobile-workflow-bundle | move to test/ (keep npm alias) |
| `test-native-calendar-consumer.ts` | 30 | **nobody** | delete - no caller anywhere; builds an upstream consumer fixture by hand |
| `test-native-calendar-deletion-restart.ts` | 35 | listed-only in android-instrumentation.ts | owner decision: manual device campaign (not run by CI) - keep and document, or delete with its runner tests |
| `test-native-cloud-runtime-config.ts` | 12 | wf resident-android.yml | move to test/ (keep npm alias) |
| `test-native-permissions.ts` | 350 | listed-only in android-instrumentation.ts; test android-instrumentation-runner.test.mjs, fixtures/isolated-native-campaign.mjs, native-permission-runner.test.mjs; app/config CameraFlowInstrumentedTest.java, HostedResultNoticeInstrumentedTest.java | owner decision: manual device campaign (not run by CI) - keep and document, or delete with its runner tests |
| `test-native-restart.ts` | 254 | listed-only in android-instrumentation.ts; test android-instrumentation-runner.test.mjs, browser/saved-signin-retry.production.spec.ts, fixtures/isolated-native-campaign.mjs; app/config AccessibilityLifecycleInstrumentedTest.java, BrowserSigninsInstrumentedTest.java | owner decision: manual device campaign (not run by CI) - keep and document, or delete with its runner tests |
| `test-notes-action-flow.ts` | 29 | test adapter-contracts.test.mjs | move to test/ as the suite itself; delete the .test.mjs shim |
| `test-notes-documents-browser.ts` | 42 | test browser/adapters.spec.ts | move to test/ as the suite itself; delete the .test.mjs shim |
| `test-notes-query-flow.ts` | 45 | test adapter-contracts.test.mjs | move to test/ as the suite itself; delete the .test.mjs shim |
| `test-notes-store-flow.ts` | 30 | test adapter-contracts.test.mjs | move to test/ as the suite itself; delete the .test.mjs shim |
| `test-notes-trash-flow.ts` | 189 | test adapter-contracts.test.mjs | move to test/ as the suite itself; delete the .test.mjs shim |
| `test-own-notice-question.ts` | 82 | test own-notice-question.test.mjs | move to test/ as the suite itself; delete the .test.mjs shim |
| `test-photo-filter-png-reference.ts` | 40 | app/config photo-filter-goldens.json | keep, rename generate-photo-filter-goldens.ts - golden generator, not a test |
| `test-reminder-one-off.ts` | 33 | listed-only in android-instrumentation.ts; test fixtures/isolated-native-campaign.mjs | owner decision: manual device campaign (not run by CI) - keep and document, or delete with its runner tests |
| `test-reminder-recovery.ts` | 3 | test fixtures/isolated-native-campaign.mjs; app/config ReminderRecoveryInstrumentedTest.java | merge into reminder-recovery-fixture.ts CLI - 3-line wrapper |
| `test-reminder-recurrence-recovery.ts` | 3 | test fixtures/isolated-native-campaign.mjs; app/config ReminderRecurrenceRecoveryInstrumentedTest.java | merge into reminder-recovery-fixture.ts CLI - 3-line wrapper |
| `test-reminder-recurrence.ts` | 32 | listed-only in android-instrumentation.ts; test fixtures/isolated-native-campaign.mjs; app/config ReminderRecurrenceInstrumentedTest.java | owner decision: manual device campaign (not run by CI) - keep and document, or delete with its runner tests |
| `test-reminder-time-flow.ts` | 59 | test adapter-contracts.test.mjs | move to test/ as the suite itself; delete the .test.mjs shim |
| `test-remote-protocol.ts` | 161 | test browser/connection-boundaries.production.spec.ts, connection-contracts.test.mjs | move to test/ as the suite itself; delete the .test.mjs shim |
| `test-resident-reuse.ts` | 116 | test resident-attachment.test.mjs | move to test/ as the suite itself; delete the .test.mjs shim |
| `test-reviewed-workflow-host.ts` | 27 | **nobody** | delete (or move to test/ and wire into a workflow) - no caller; manual real-host probe writing test-results JSON |
| `test-tts-startup.ts` | 64 | test tts-worker-lifecycle.test.mjs | move to test/ as the suite itself; delete the .test.mjs shim |
| `test-tts-worker-lifecycle.ts` | 101 | test tts-worker-lifecycle.test.mjs | move to test/ as the suite itself; delete the .test.mjs shim |
| `test-update-confirmation-platform.ts` | 87 | **nobody** | delete - no caller anywhere; same probe shape as test-automatic-update-platform |
| `test-workflow-approval-crash.ts` | 29 | **nobody** | delete (or move to test/ and wire) - no caller; only named in a comment |
| `test-workflow-approval-ui-flow.ts` | 29 | test adapter-contracts.test.mjs | move to test/ as the suite itself; delete the .test.mjs shim |
| `test-workflow-approvals-host.ts` | 34 | **nobody** | delete (or move to test/ and wire) - no caller; only named in a comment in start-reviewed-workflow-agent.ts |
| `test-workflow-cancel-recovery.ts` | 34 | **nobody** | delete (or move to test/ and wire) - no caller; only named in a comment |
| `test-workflow-compiler.ts` | 44 | npm agent:test-workflow-compiler | move to test/ (keep npm alias) |
| `test-workflow-lifecycle-host.ts` | 17 | **nobody** | delete (or move to test/ and wire) - no caller; only named in a comment |
| `test-workflow-lifecycle-ui-flow.ts` | 19 | test adapter-contracts.test.mjs | move to test/ as the suite itself; delete the .test.mjs shim |
| `test-workflow-metadata-host.ts` | 20 | **nobody** | delete (or move to test/ and wire) - no caller; only named in a comment |
| `test-workflow-metadata-ui-flow.ts` | 21 | test adapter-contracts.test.mjs | move to test/ as the suite itself; delete the .test.mjs shim |
| `test-workflow-protocol.ts` | 13 | test adapter-contracts.test.mjs, browser/workflow-missed-run-now.spec.ts | move to test/ as the suite itself; delete the .test.mjs shim |
| `test-workflow-ui-flow.ts` | 38 | test adapter-contracts.test.mjs | move to test/ as the suite itself; delete the .test.mjs shim |
| `test-workflow-worker.ts` | 108 | npm agent:test-workflow-worker | move to test/ (keep npm alias) |
| `toolchain.ts` | 13 | scripts android-browser-reading-live.ts, android-instrumentation.ts, android-paired-speech-live.ts, android-workflow-native.ts +21; listed-only in source-snapshot.ts; test android-build-path.test.mjs, gradle-verification.test.mjs, sign-release-apks.test.mjs +2; specs x1 | keep |
| `typecheck-scripts.ts` | 37 | npm typecheck:scripts | delete; use tsc -p tsconfig.scripts.json once out-of-scope errors are fixed - filters diagnostics outside scripts/ |
| `update-apk-admission.ts` | 119 | scripts publish-update-manifest.ts; listed-only in quint-lib.ts; test update-apk-admission.test.mjs | keep |
| `update-artifact.ts` | 16 | scripts app-update-candidate.ts, deliver-app-update.ts, provision-unit.ts, publish-update-manifest.ts +1; listed-only in quint-lib.ts; specs x3 | merge into a shared hash helper - another sha256 helper |
| `update-channel.ts` | 78 | scripts app-update-candidate.ts, build-android.ts, build-archive.ts, deliver-app-update.ts +3; listed-only in source-snapshot.ts; test android-build-path.test.mjs, update-apk-admission.test.mjs, update-channel.test.mjs; specs x2 | keep |
| `upstream-core-sources.ts` | 18 | scripts core-state-patch.ts, verify-packaged-runtime.py; listed-only in source-snapshot.ts; specs x2 | keep |
| `upstream-mobile-build.ts` | 43 | scripts mobile-uuid-adapter.ts, verify-packaged-runtime.py; listed-only in source-snapshot.ts | keep |
| `upstream-native-source.ts` | 68 | scripts aosp-listener-systemui.ts, build-pinned-voice.ts, native-google-host-artifact.ts, prepare-client-features.ts +2; listed-only in source-snapshot.ts; test calendar-sync-mutation.test.mjs, client-feature-preparation.test.mjs, files-agent-patch.test.mjs +6; specs x30 | keep |
| `vendor-lucide-icons.ts` | 40 | **nobody** | keep (regeneration tool) - document in README or delete - no caller; regenerates apps/app/public/icons/lucide by hand |
| `verify-aosp-clock.ts` | 15 | **nobody** | merge into one aosp device-check CLI - no caller; 15-line wrapper around an upstream verifier |
| `verify-aosp-listener.ts` | 19 | **nobody** | merge into one aosp device-check CLI - no caller; 19-line wrapper |
| `verify-aosp-secure-camera.ts` | 15 | npm aosp:verify-secure-camera | merge into one aosp device-check CLI - npm alias only, never run by CI |
| `verify-apks.ts` | 457 | npm android:verify; scripts build-android.ts, generate-sbom.ts, render-assetlinks.ts, sign-release-apks.ts; listed-only in quint-lib.ts, source-snapshot.ts; test android-consumer-build.test.mjs, android-gzip-assets.test.mjs, font-license.test.mjs +5; specs x3 | keep |
| `verify-cuttlefish-launcher.ts` | 55 | scripts verify-pixel10a-image.ts; test cuttlefish-launcher-postboot.test.mjs | keep |
| `verify-packaged-runtime.py` | 274 | scripts generate-sbom.ts, verify-apks.ts; listed-only in quint-lib.ts, source-snapshot.ts; test core-state-patch.test.mjs, mobile-uuid-build.test.mjs, one-runtime-profile.test.mjs +2; docs/comments x1 | keep |
| `verify-pixel10a-image.ts` | 29 | test pixel10a-image.test.mjs | manual tool: only tests/specs import it - keep only if still run by hand, else delete with its test |
| `verify-pixel10a-source.ts` | 15 | **nobody** | merge into stage-aosp.ts (it already calls verifyPixel10aSource) - no caller |
| `verify-upstream.ts` | 77 | npm upstream:verify; wf browser.yml; scripts build-android.ts, pinned-upstream-source.ts; listed-only in source-snapshot.ts; test upstream-reachability.test.mjs | keep |
| `voice-host.ts` | 281 | wf resident-android.yml; scripts android-build-preflight.ts, android-stage-voice-models.ts, generate-licenses.ts, verify-apks.ts; listed-only in quint-lib.ts, source-snapshot.ts; test android-build-path.test.mjs, fixtures/voice-host-product.mjs, hosted-native-inputs.test.py +4; specs x2; app/config build.gradle, product.gradle; docs/comments x1 | keep |
| `with-test-mocks.ts` | 20 | npm dev:ui, build:test-mocks; listed-only in quint-lib.ts | replace with cross-env or inline env in package.json - 20-line env wrapper |
| `workflow-renderer-fixture.ts` | 210 | scripts test-workflow-approval-ui-flow.ts, test-workflow-lifecycle-ui-flow.ts, test-workflow-metadata-ui-flow.ts, test-workflow-ui-flow.ts; test fixtures/workflow-execution-fixture.mjs, workflow-adapter-recovery.test.mjs, workflow-lifecycle-resend.test.mjs +1; specs x1 | keep |
| `workflow-worker-artifact.ts` | 73 | scripts build-workflow-worker.ts, ci/export-browser-proof.ts, cloud-resident-host.ts, native-google-host-artifact.ts +6; listed-only in quint-lib.ts, source-snapshot.ts; test android-build-path.test.mjs, fixtures/product-character-host.mjs, fixtures/workflow-worker-assets.mjs +3; specs x6 | keep |
