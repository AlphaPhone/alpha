# alpha-tooling: build, CI, release and formal-pipeline parity

Slice: root `package.json` scripts, `scripts/**`, `.github/workflows/**`, Android/AOSP build and verification,
release/OTA, licence notices, production bundle audit, upstream pin, formal-model pipeline.
Trees: legacy `alpha-develop` (dd63c6bc), port `alpha-vs` (3d7ca972), upstream `eliza-vs` and the port's pin
`c84e5d68e37` (read with `git -C eliza.git show c84e5d68e37:<path>`; `vendor/eliza` is not checked out).
Everything below was read, not run. Paths are relative to `/home/shaw/.cache/vibeaudit/`.
Sidecar: `findings/alpha-tooling.broken-tests.txt` (969 files that reference removed files, with the targets).

## Summary

| Class | Count |
|---|---:|
| OK | 20 |
| RETIRED | 3 |
| UNIMPLEMENTED | 7 |
| CHANGED | 13 |
| MISSING | 4 |
| KNOWN | 3 |
| UNMODELED | 1 |
| UNVERIFIED | 1 |

Verdict: **not at parity.** The build scripts themselves were carried over carefully (70 of 127 kept scripts are
byte-identical, most others differ only by `bun` → `node`, and every `@elizaos/os` / `@elizaos/agent/bundle` export that
`scripts/upstream-os.ts` imports exists at the pin; the resident entry's `workflowDeviceOffer` does not, G27). What was lost is the gating around them. `pnpm verify` cannot pass on
the tree as committed (no `pnpm-lock.yaml`, no `apps/app/spec/lock.json`, no ESLint config), and none of the seven
edited CI workflows can run to green (no lockfile for the frozen install; then missing scripts, a Bun-only helper,
Bun-only checks and ESM `require`).
The legacy root test suite (919 host test files, 3,619 cases; 493 Playwright specs, 2,053 cases) is still in the
tree but has no runner, and 819 of those files reference code that no longer exists. The formal pipeline dropped
from bounded symbolic checking plus TLC liveness plus 23 Dafny-proved modules to seeded simulation only, with
zero `.proof.dfy` files and no Dafny or Chromium installed in CI. The open-items doc admits "nothing was run" and
names seven stale tests; it does not name the lockfile, the review ledger, the root-test runner, the lost
model-checking depth, the licence drift or the broken workflows.

## Gaps

### G1. UNIMPLEMENTED: no `pnpm-lock.yaml` is committed
- Behaviour: every install is frozen to a reviewed lockfile; licences and SBOM are derived from it.
- Legacy: `alpha-develop/bun.lock`; `bun install --frozen-lockfile` in every workflow (`verify.yml:30`).
- Port: `git -C alpha-vs ls-files | grep lock` finds only `upstream.lock.json` and
  `android/aosp/branding/tools.lock.json`. Yet `verify.yml:26`, `promotion.yml:29,58,105,149`, `android.yml:64`,
  `release.yml:458`, `cloud-deploy.yml` all run `pnpm install --frozen-lockfile`; `android.yml:15` filters on
  `pnpm-lock.yaml`; `scripts/pnpm-lock.ts:11` (`LOCKFILE`), `generate-licenses.ts:431`, `generate-sbom.ts` read it;
  `resident-android.yml:291` archives it as evidence.
- Impact: no CI job gets past install; dependency set is unpinned; licence/SBOM generation throws.
- Fix: check out the pinned submodule, `pnpm install`, commit `pnpm-lock.yaml`; add it to open-items until done.

### G2. UNIMPLEMENTED: no accepted review ledger (`apps/app/spec/lock.json`)
- Behaviour: `pnpm check` passes only when every story/rule was accepted by a person (`pnpm accept`).
- Evidence: `eliza-vs/vibestack/review.ts:16-22` (missing file = empty ledger), `pipeline.ts:494-502,922`
  (pending review → `ok:false` → exit 1). `alpha-vs/apps/app/spec/lock.json` does not exist; upstream commits one
  (`eliza-vs/spec/lock.json`). The port has 603 stories and 1,563 rules, all pending.
- Impact: `pnpm check`, and so `pnpm verify` (`alpha-vs/package.json:19`) and the promotion `spec` job, exit 1 by
  design. The same file is the only way to accept "simulated only" proof obligations (G5).
- Fix: after the first real `pnpm check`, the owner runs `pnpm accept` in `apps/app` and commits `spec/lock.json`.

### G3. MISSING: the legacy root test suite has no runner
- Behaviour: every PR ran all non-Quint host tests; promotion ran the Quint refinement tests.
- Legacy: `package.json` `test:only` = `bun scripts/run-tests.ts` (567 `test/*.test.mjs` files), `quint:tests`
  (352 `test/quint-*.test.*` + `test:node`); `verify.yml:33-60` prepared Python, JDK 21, the JSON jar, the Kotlin
  compiler and the prepared SDK for them. 919 root files hold 3,619 `test(` cases.
- Port: `pnpm test` = `turbo run test --filter=app --filter=cloud` → Vitest over `apps/app/test/**/*.test.{ts,tsx,vibe}`
  (70 files, about 636 cases) and `cloud/test` (7 files) (`eliza-vs/vibestack/testing/vitest.ts` `TESTS`). Nothing
  runs `test/*.test.mjs`; `scripts/run-tests.ts`, `run-node-only-tests.ts`, `host-test-runtime.ts` are deleted.
  `alpha-vs/test/` is the legacy tree almost untouched (`git diff 057fdc5a2 HEAD -- test`: 7 modified, 1 deleted).
- Scale: of 1,411 `*.test.*`/`*.spec.ts` files, 669 import a removed file (238 directly, 431 through helpers:
  `specs/quint/refinement/check-traces.mjs` → `scripts/quint-lib.ts` breaks 331, `test/fixtures/jvm-tools.mjs` →
  `scripts/prepare-patched-native.ts` breaks 100), 150 more read a removed file by path, 592 are import-clean
  (412 of them Playwright specs for the removed UI). 916 files use `node:test`, so they need no Bun.
- Tooling tests (133 listed): 82 import-broken, 8 path-broken, 36 clean and unexecuted, 7 Python. Clean ones with
  safety value: `production-bundle-audit`, `licenses`\*, `font-license`, `gradle-verification`, `sign-release-apks`,
  `enroll-release-keys`, `owner-sign-aosp-release-edges`, `record-release`, `apk-signer-range`,
  `apk-alpha-power-policy`, `upstream-pin-guard`, `upstream-reachability`, `upstream-native-source`,
  `aosp-{cuttlefish,native-admission,pixel10a,retain-known-good,sense-policy,staging-patches}`, `pixel10a-{image,source}`
  (\* `licenses.test.mjs:15` reads the removed `bun.lock`).
- Impact: Alpha's 127 scripts (signing, OTA, APK admission, licence policy, bundle audit) have no executed test.
- Fix: add `test:root` = `node --test` over an allowlist starting with the 36 clean tooling files, call it from
  `verify`; repoint the two hub helpers or delete the files they break, per `scripts/legacy-retirement.json`.

### G4. CHANGED: model checking depth fell from symbolic + liveness to seeded simulation
- Legacy (`alpha-develop/.github/workflows/promotion.yml`): `symbolic` job `check-quint.ts verify --steps=6` over
  all 406 models in 8 shards (Apalache bounded symbolic, TLC where configured, `specs/quint/tlc.json`); `temporal`
  job, TLC fairness-guarded liveness for 25 models (SignIn, GoogleConnect, Calendar, Maps, CameraSession,
  PhotosLibrary, NotesView, FilesBrowser and 17 Core\*); `comparison` job, 12 models with expected counterexamples
  / current-design comparisons; `quint:check` = typecheck + scenarios + 80×40 sampled simulation; cache disabled
  in promotion on purpose (`promotion.yml:19-24`; the jobs are at `:82`, `:108`, `:159`).
- Port: `pnpm check` → `node ../../vendor/eliza/vibestack/spec.ts check` (`apps/app/package.json:12`). Stages
  `model`, `always`, `sometimes`, `replay` are simulation only (`eliza-vs/SPEC.md:15-30`; 1,000 values, seed 1,
  `CONTRIBUTING.md:372-375`). Exhaustive checking is a manual `quint verify` (`SPEC.md:626-629`); nothing in
  `alpha-vs` calls it or `--nightly`. `promotion.yml` has one `spec` job. Spec census: 234 specs with Quint,
  196 with `always`, 200 with `sometimes`, **1** with `leadsTo` (`spec/maps/location.md:151-152`), 0 `refines`.
- Impact: a rule violated only on a path the fixed seed does not sample ships; liveness is checked for one machine.
- Fix: add a promotion job running `spec.ts check --nightly` (20,000 values) and a `quint verify gen/<m>.run.qnt
  --invariant inv --max-steps 6` loop over the generated modules; port the eight app-level temporal properties as
  `leadsTo` + `fair_` rules in `spec/{account/signIn,account/google,calendar,maps,camera,notes,files}`.

### G5. UNIMPLEMENTED: Dafny proofs are neither written nor runnable in CI
- Legacy: `lemma:check` (`scripts/check-lemma.ts`, Dafny 4.11.0, `LEMMA_REQUIRE_BACKEND=1` in
  `promotion.yml:220-221`) proved 23 `//@ verify` modules listed in `LemmaScript-files.txt` with 23
  `specs/lemma/**/*.dfy`: `browser/{browser-poll,edit-receipt,journal-retention,notifications,video-capture,video-edit,workflow-triggers}`,
  `prototype/{calendar-days,chat-overlay-motion-adapter,context-selection,note-recorder,settings-adapter}`,
  `runtime/{canvas-geometry,cloud-environment-selection,cloud-voice-limit,gmail-mailbox,hosted-digests,inbox-edit-coalescer,inbox-operation,resident-recovery,voice-states,workflow-device-contract}`,
  `startup-permission-flow`.
- Port: `find alpha-vs -name '*.proof.dfy'` = 0 (upstream has 184 at the pin); no `//@` in `apps/app/src`.
  `scripts/legacy-retirement.json` claims "vibestack proofs are spec-level (*.proof.dfy beside the area spec)" for
  528 lemma entries; none exists. The `proof` stage still runs for every unit and throws without Dafny
  (`eliza-vs/vibestack/pipeline.ts:204-205`, `run.ts:156`), and any obligation Dafny cannot discharge alone fails
  unless accepted in `spec/lock.json` (`pipeline.ts:290-291`). `scripts/ci/prepare-dafny.sh` exists but no port
  workflow calls it (`rg prepare-dafny alpha-vs/.github` = 0). LemmaScript survives only as upstream's dependency
  (`eliza-vs/package.json:74`, used by `prove.ts`); root `lemmascript` dep, `lemmascript.json`,
  `LemmaScript-files.txt` are gone; `alpha-vs/specs/lemma/` is 23 dead `.dfy` files.
- Impact: "Dafny proofs" is a claim in docs, not a gate; the 23 proved properties are at best simulated.
- Fix: add `bash scripts/ci/prepare-dafny.sh` before `pnpm verify`/`pnpm check` in `verify.yml` and
  `promotion.yml`; after the first run, write `apps/app/spec/<area>/<spec>.proof.dfy` where obligations fail,
  starting with the specs that own the 23 legacy modules; delete `specs/lemma`.

### G6. UNIMPLEMENTED: Bombadil exploration is wired but cannot run in CI
- Port: `apps/app/test/bombadil.ts` + 16 `test/bombadil/<area>.ts`, `@antithesishq/bombadil 0.7.10`, served by the
  `start` script: the `explore` stage of `pnpm check` (`eliza-vs/vibestack/explore.ts:14,168,228`). Needs
  Playwright Chromium. `verify.yml` and the promotion `spec` job install no browser, and
  `scripts/ci/install-playwright-browser.sh:7` still runs `bunx --bun` (no Bun in port CI).
- Impact: `explore` fails with "Bombadil found no Chromium". Legacy had no Bombadil, so this is a new gate that
  never ran, not a regression.
- Fix: change the helper to `pnpm exec playwright install --with-deps "$browser"`; call it in both jobs.

### G7. CHANGED: the browser lanes no longer test the product
- Legacy: `test:browser` = `playwright test --project=chromium` (493 specs, 2,053 cases, 6 shards),
  `test:browser:production` (58 flag-off specs), Firefox/WebKit storage lanes, `test:browser:live`.
- Port: `test:browser` = `turbo run test:browser` → `vitest run --project browser` (`apps/app/package.json:20`);
  `apps/app` has **one** `*.browser.test.*` file plus generated story mounts. The Playwright suite became
  `test:browser:legacy`, which no workflow runs. `promotion.yml:64` passes `--shard=N/6` to turbo and `:71`
  passes three `test/browser/*.spec.ts` paths to it. The `storage` and `production` jobs still run the unmodified
  legacy specs against the new UI: `test/browser/production-surface.spec.ts` selects `.alpha-connection`,
  `.alpha-dev-tools`, `.mock-mode-banner`, `[data-screen]`, `[data-mobile-shell-tile]`, none of which occurs in
  `alpha-vs/apps/app/src` (so its "absent in production" assertions are vacuous and its positive ones fail).
  Both jobs call `pnpm upstream:prepare-client` (`promotion.yml:120,151`), which is not a script, and
  `pnpm build:test-mocks --outDir …` (`:154`) appends the flag to `write-build-flags.ts`, not to Vite.
  `test:browser:live` is gone but `playwright.config.ts:18` still names it.
- Impact: no browser journey of the shipped UI is exercised; the flag-off production surface check is void.
- Fix: rewrite `production-surface.spec.ts` for `src/web` and keep it as the production lane; move journeys to
  `apps/app/test/<area>/*.browser.test.vibe`; fix the three promotion steps or delete the legacy lanes.

### G8. UNIMPLEMENTED: `pnpm lint` has no ESLint configuration
- Port: `apps/app/package.json:21` runs `eslint src/web` (ESLint 10.14); `find alpha-vs -name 'eslint.config.*'`
  and `.eslintrc*` return nothing (upstream keeps its config at its own root, not an ancestor of `apps/app`).
- Impact: `turbo run … lint` in `pnpm verify` fails with "could not find config". Fix: add
  `apps/app/eslint.config.js` re-exporting the pinned `vendor/eliza/eslint.config.js` rules for `src/web`.

### G9. UNIMPLEMENTED: the workflow worker is not built, staged or verified
- Legacy: `agent:build-workflow-worker` was a step of `android:build:local` (`package.json:39`); preflight
  required the artifact and the staged `workflow-worker/manifest.json`
  (`scripts/android-build-preflight.ts:194-199`); `verify-packaged-runtime.py:130,198-218` compared every worker
  file in the APK; CI ran `agent:test-workflow-worker`, `agent:test-workflow-compiler`,
  `agent:test-mobile-workflow-bundle` (`resident-android.yml:286-319`).
- Port: upstream can ship a worker (`eliza-vs/packages/workflow/package.json:46` writes
  `dist/workflow-worker.json`; `packages/agent/src/bundle/build.vibe:158-171`; `packages/os/src/build/runtime-payload.vibe:433-467`),
  but `android:build:local` runs `agent:bundle` before anything builds `packages/workflow`, and
  `agent:stage-android` passes no `--workflow-worker` (`scripts/stage-agent-runtime.ts:35-37`,
  `package.json:33`). Result is either no worker (silently) or, if `dist` happens to exist, a pinned worker with
  no artifact → `WorkerRefused`. Preflight (`:191-196`) and `verify-packaged-runtime.py:19` no longer require one.
  Open-items mentions only the payload layout, not the worker.
- Impact: generated workflow code has no isolated worker on the phone, and no gate notices.
- Fix: in `scripts/build-agent-bundle.ts` build `@elizaos/plugin-workflow` first and return its worker; have
  `stage-agent-runtime.ts` pass `{dir, executable}` from the bundle manifest; require `workflowWorker` in
  preflight and `agent/workflow-worker/*` in `verify-packaged-runtime.py`.

### G10. CHANGED: `android.yml` post-build qualification cannot pass
- `:71` runs Vitest on `vendor/eliza/packages/os/scripts/__tests__/stage-launcher-overlay.node.test.ts` (absent at
  the pin; the file is `packages/os/aosp/stage-launcher-overlay.ts`).
- `:91-92` requires `assets/agent/agent-bundle-dependencies.json` and runs `test/wallet-disabled.test.mjs`, which
  reads that file (`:17`) and `vendor/eliza/packages/agent/src/runtime/core-plugins.ts` (`:34`). Upstream staging
  writes `manifest.json`/`inventory.json` only, so the **wallet-package exclusion check** (no `@metamask/*`,
  `wagmi`, `@rainbow-me/*` in the staged runtime) is dead.
- `:77,112` `scripts/ci/calendar-bridge.py` is unchanged legacy: `:223-224` require `packageManager == bun@…` and a
  `bun` binary, `:239` hashes the removed `android/upstream-native-sources.json`.
- `:126` `pnpm agent:test-digest-restart` is not a script. `:128` `export-browser-proof.ts worker` imports the
  removed `scripts/workflow-worker-artifact.ts` (`export-browser-proof.ts:93`).
- `:138` an `--input-type=module` heredoc calls `require()`.
- Fix: one pass over `android.yml` against `package.json`; port the wallet check to read
  `assets/agent/manifest.json` `packages[].name`; rewrite `calendar-bridge.py` inputs for Node/pnpm.

### G11. CHANGED: third-party notices are stale and ungated
- Legacy: `test/licenses.test.mjs`, `runtime-licenses.test.mjs`, `font-license.test.mjs`, `sbom.test.mjs` ran in
  `bun run verify` and failed on stale notices (`generate-licenses.ts --check`).
- Port: nothing runs `--check`. The committed `apps/app/public/licenses/third-party-notices.json` has the same 116
  entries as develop and omits 23 direct shipping dependencies of `apps/app/package.json`: `effect`,
  `@effect/platform-browser`, `vibelang-runtime`, 17 `@radix-ui/react-*`, `class-variance-authority`, `clsx`,
  `tailwind-merge` (plus their transitive packages and the `@elizaos/*` workspace packages).
  `generate-licenses.ts:830` reads `assets/agent/bundle-manifest.json` and `packages[].directory`; upstream writes
  `manifest.json` with `{name, version, sha256}` (`build.vibe:333-348`). `:852` errors when
  `workflow-worker/dependencies.json` is absent (always, see G9). So `licenses:packaged-runtime`, a step of
  `android:build:local`, fails or lists no bundled package.
- Impact: Settings → licences under-reports what ships; a release APK's notices cannot be regenerated.
- Fix: commit the lockfile (G1), run `node scripts/generate-licenses.ts`, read `manifest.json` rows (resolve each
  through `pnpm-lock.ts`), and run `--check` from `pnpm verify`.

### G12. CHANGED: on-device voice build names upstream paths that do not exist
- Port `scripts/build-pinned-voice.ts:14,36` reads and runs
  `vendor/eliza/packages/os/android/local-inference/scripts/paradee-voice/build-native.ts`; at the pin the file is
  `packages/os/android/local-inference/scripts/build-native.ts` (no `paradee-voice/`). `scripts/voice-host.ts:202-203`
  guards `…/local-inference/native` and `…/local-inference/paradee-voice/native`, neither a pin path.
- Impact: `agent:build-embedding-host` / voice staging cannot build the voice libraries AGENTS.md says every APK
  packages; the "no stray voice staging" guard watches the wrong directories.
- Fix: correct both path lists against the pin's `packages/os/android/local-inference/**`.

### G13. CHANGED: a CI Cloud deploy may mint new sealing secrets
- Legacy: `cloud-deploy.yml:79` `secrets … --frozen` ("refuses to generate any secret in CI",
  `scripts/cloud-worker.ts:566`) and `:74` failed on an empty `ALPHA_CLOUD_ENV`.
- Port: `cloud-deploy.yml:70` calls `secrets` with no `--frozen`; `scripts/cloud-worker.ts:229-232` always runs
  `completeSecrets` (`:110-113`), which fills absent `CLOUD_DIGEST_KEY`, `CLOUD_SEALING_KEY`, `EMAIL_CODE_SECRET`,
  `GOOGLE_CONNECT_TOKEN_KEY`, `CLOUD_ENTITLEMENT_KEY` into the runner's temp file, which the job then deploys and
  deletes (`:97`).
- Impact: an incomplete secret rotates sealing/entitlement keys on every deploy and loses them.
- Fix: restore `--frozen` in `cloud-worker.ts` `secrets` and pass it in the workflow.

### G14. CHANGED: `release.yml` breaks before signing
- `:73` `node --input-type=module -e '… require("./android/release-signer.json") …'` throws (no `require` in ESM).
- `:473` `pnpm upstream:prepare-client` is not a script.
- Fix: drop `--input-type=module` on `:73`; delete `:473`.

### G15. CHANGED: resident-runtime qualification steps were dropped from `resident-android.yml`
- Legacy steps with no port counterpart: `test/native-build-inputs.test.mjs` (`:204`); the four metadata/voice
  contract tests (`:244-249`); the OS-network-denied frozen install and SDK graph before/after compare
  (`:263-282`, `:346-349`); `agent:test-device-timing`, `test-native-cloud-runtime-config.ts`, workflow
  compiler/worker tests (`:287-291`); `stage-embedding-host.ts --verify` after staging (`:308`);
  `agent:test-mobile-workflow-bundle` (`:319`); `runtime-profile.ts --verify-native` (`:345`).
- Port keeps: `upstream:verify` twice, `agent:bundle`, `agent:stage-android`, licences, archive.
- Impact: an app-update candidate is produced with byte checks only; no behavioural qualification of the bundle.
- Fix: run `pnpm --filter @elizaos/agent test` and `@elizaos/plugin-workflow test` at the pin in this job, and
  restore `stage-embedding-host.ts --verify`.

### G16. CHANGED: AOSP product descriptors point at lock files that are not at the pin
- `alpha-vs/android/aosp/product.json:8,21` and `pixel10a-product.json:15` name
  `vendor/eliza/packages/os/android/aosp.lock.json` and `…/os/android/sources/pixel10a-stallion.json`; the pin has
  `packages/os/aosp/aosp.lock.json` and `packages/os/aosp/sources/…`, which is what `scripts/stage-aosp.ts:60` and
  `aosp-pixel10a.ts` expect. `cuttlefish-product.mjs:132-158` refuses a descriptor whose `sourceLock.file` is not
  an existing lock. `android/signing/alpha-key-manifest.json:4` and `sign-release-apks.ts:14` cite
  `generate-release-keys.ts`/`decrypt-release-keys.ts` under paths that do not exist (`scripts/os-ported/os/` has
  no `decrypt-release-keys.ts`).
- Impact: `pnpm aosp:stage` refuses; the signing runbook names a missing tool.
- Fix: update the three JSON paths; point the docs at `eliza-os keys` (`@elizaos/os/image` `decrypt`/`generate`).

### G17. CHANGED: the pin's reachability record is for another commit
- Legacy: `scripts/ci/upstream-reachability.json` head == pin (`7a124190a1`, "identical"), enforced by
  `test/upstream-reachability.test.mjs`.
- Port: record head `a3a19afd17…` against `develop`; pin is `c84e5d68e37` on
  `claude/vibestack-alphaphone-migration` (unmerged elizaOS/eliza#40140). `verify.yml:47` only warns.
- Fix: after the pin moves (G27), `pnpm upstream:verify -- --record-reachability`; make promotion use `fail` mode.

### G18. MISSING: scripts are no longer typechecked
- Legacy: `typecheck:scripts` (`scripts/typecheck-scripts.ts`, `tsconfig.scripts.json`) inside `verify`.
- Port: root `tsconfig.json` includes `scripts/**/*.ts` but no command runs it (`typecheck` = turbo over app and
  cloud). 127 scripts, 45 of them new `scripts/os-ported/**` copies, are unchecked; e.g.
  `scripts/private-runtime-launch.ts:7` imports `vendor/eliza/packages/agent/native-host/private-runtime-launch.mjs`,
  absent at the pin.
- Fix: add `"typecheck:scripts": "tsc -p tsconfig.json"` and call it from `verify`.

### G19. CHANGED: local development no longer starts an agent
- Legacy: `dev` = `scripts/dev-local.ts` (pinned agent + renderer), `dev:ui`, `dev:maps`, `dev:cloud` (loopback
  resident + Cloud), served through `browser-cloud-dev-bridge.ts` (580 lines) and `local-agent-dev-bridge.ts` (345).
- Port: `dev` = Vite only; `dev:ui`, `dev:maps`, `test:browser:live` removed (`scripts/maps/dev.ts` kept, unlisted);
  `scripts/dev-cloud.ts` now starts only the renderer; `apps/app/vite.config.ts` has no bridge.
- Impact: the browser preview cannot talk to a resident agent or hold Cloud custody; developer-only.
- Fix: owner decision; if wanted, a `scripts/dev.ts` that starts `@elizaos/agent/cli` beside Vite.

### G20. MISSING: 98 removed scripts have no replacement recorded, and none exists
- 63 `scripts/test-*.ts` host test drivers and 17 `scripts/fixtures/**` (their behaviours belong to the app
  areas; `legacy-retirement.json` gives 36 of the 98 an area spec and 62 none).
- Developer/dev-bridge: `dev-local`, `dev-native-preview`, `start-local-remote`, `start-local-voice-agent`,
  `local-agent-dev-bridge`, `local-agent-dev-storage`, `browser-cloud-dev-bridge`, `browser-full-reload`,
  `gmail-agent-dev-broker`, `gmail-agent-read-host`, `runtime-profile`.
- Measurement: `native-voice-latency`, `native-voice-latency-emulator`, `aggregate-voice-latency` (issue #395
  evidence), `check-cloud-recording-signature`.
- Native Google host: `build-native-google-host`, `native-google-host-artifact`, `native-google-product-host`
  (open-items lists the missing Java-side models, not the build).
- `scripts/eval-phone-actions.ts` is listed as removed but is still present (needs `@electric-sql/pglite`, KNOWN).
- Fix: record a decision per group in `legacy-retirement.json` (`retired` with reason, or a target).

### G21. CHANGED: `scripts/legacy-retirement.json` is stale and partly wrong
- All 133 tooling tests are `mapped` with `spec: null`; 76 tests marked `mapped` are absent from the tree; 69 test
  entries, 17 Quint entries and 18 lemma entries point at spec files that do not exist (for example
  `spec/inbox/agentDrafts.md`, `spec/calendar/linkedLocal.md`, `spec/calendar/preservation.md`).
- Wrong replacements: `scripts/test-cloud-{maps,protocol,subscription,delegation,delegation-return}.ts` tested the
  renderer's Cloud client (`apps/app/src/maps/cloud-provider.ts`, `runtime/cloud-protocol.ts`,
  `runtime/subscription-entitlement.ts`); the named replacement `cloud/test/*.test.vibe` tests deployment
  profile, registration, edge and wrangler only. `run-tests.ts`/`run-node-only-tests.ts`/`typecheck-scripts.ts` →
  "vitest and vibelang typecheck" (see G3, G18). `bun-lock.ts` → really `scripts/pnpm-lock.ts`.
- Fix: regenerate the map from the tree; give tooling its own section with real targets.

### G22. KNOWN ("These tests still target removed code"), but 100× larger than listed
- Open-items names 7 files. Actual: 819 root test/spec files plus 147 `specs/quint/**` files and 3 kept scripts
  (`findings/alpha-tooling.broken-tests.txt`). The 7 tests the port did edit are still broken (for example
  `test/owner-route-parity.test.mjs` → `scripts/prepare-patched-native.ts`).

### G23. KNOWN (os-ported and harness rewrite), with one addition
- `scripts/os-ported/**` (45 files) are copies of upstream's old `.mjs` tools; `verify-apks.ts:31,57`,
  `stage-aosp.ts`, `sign-aosp-release.ts`, `aosp-pixel10a.ts` depend on them.
- Addition: `scripts/android-instrumentation.ts:140-259` names eight removed campaign scripts
  (`test-native-restart.ts`, `test-native-permissions.ts`, `test-installed-upgrade.ts`,
  `test-native-calendar-deletion-restart.ts`, `test-reminder-one-off.ts`, `test-reminder-recurrence.ts`,
  `reminder-recovery-fixture.ts`, `test-browser-storage-format.ts`), so the process-restart, permission-revoke and
  installed-upgrade device campaigns have no runner.

### G24. CHANGED: contributor docs describe commands that do not exist
- `alpha-vs/CONTRIBUTING.md:20-47` (`bun run quint:check`, `quint:tests`, `lemma:check`, `bun run verify`);
  `docs/development.md:16-47,115` ("Use Bun 1.4.2", `pnpm test:node`, `pnpm typecheck:scripts`,
  `pnpm quint:check`, `pnpm dev:ui`); AGENTS.md says "There is no Bun". Error strings in
  `stage-embedding-host.ts:163` and `generate-sbom.ts:228` tell the user to run `pnpm agent:prepare` and
  `pnpm agent:build-workflow-worker`.
- Fix: rewrite the two "Formal models"/"Setup" sections from AGENTS.md.

### G25. MISSING: develop #1453 and #1454 are not in the port
- `git -C alpha-vs merge-base --is-ancestor 2dcfd18ee HEAD` fails. #1453 ("Fix Fable-verified chat review
  findings and pin eliza 7a124190a1") changes 11 renderer files (`prototype/` 8, `runtime/` 3), the notices and 9
  tests; #1454 is docs. Open-items says "through #1449". Owner: assistant/telephony slices.

### G26. UNIMPLEMENTED: port scripts disagree on the staged file names
- Upstream stages `agent.mjs`, `manifest.json`, `inventory.json` (`runtime-payload.vibe:206,328`), which
  `verify-packaged-runtime.py:19` and `generate-licenses.ts:777` expect. But `build-android.ts:153` (decides
  whether the SBOM gets `--packaged-runtime`) and `build-android-fast.ts:36,38` (required APK entry) still test
  `assets/agent/agent-bundle.js`, and `stage-agent-runtime.ts:22` looks for `bundle-manifest.json`.
- Impact: SBOM never lists the packaged runtime; `android:build:fast` rejects every APK.
- Fix: one exported constant for the entry name in `stage-agent-runtime.ts`, imported by the other three.

### G27. KNOWN (pin must move past `c8f273cec1b`; `workflowDeviceOffer` missing at the pin)
- Confirmed: `git show c84e5d68e37:packages/agent/src/index.vibe | grep workflowDeviceOffer` = 0, while
  `scripts/resident/bridges.ts:8` imports it, so `agent:bundle` cannot build at the recorded pin.

### G28. UNVERIFIED
- `c8f273cec1b` is not an object in `eliza.git`, so the target pin could not be inspected.
- Nothing was executed: whether Quint typechecks 234 specs, how many Dafny obligations fail, and how many of the
  592 import-clean legacy tests pass are unknown.

### G29. UNMODELED: Alpha's own build and release tooling has no spec
- Upstream models its build/image programs (`spec/os/build/*.md`, `spec/os/image/*.md`, `spec/os/update/operator.md`).
  Alpha's wrappers and policies (`licence-policy.ts`, `release-blockers.ts`, `update-apk-admission.ts`,
  `cloud-deployment-policy.ts`, `aosp-sense-policy.ts`, `native-view-policy.ts`, `os-ported/**`) have neither a
  spec under `apps/app/spec` nor, after G3, a running test. `cloud/` has tests but no `spec/`.

## Confirmed OK

"Spec" is the upstream spec at the pin where the behaviour moved upstream; tooling has no `apps/app/spec` area.

| Behaviour | Legacy | Spec (pin) | Port code |
|---|---|---|---|
| Production bundle audit in `verify` | `package.json:16,19` | none | `package.json:19-20`; `scripts/audit-production-bundle.ts` (adds `testMocksFindings` :138-145) |
| APK packages only a flag-off bundle | `scripts/build-android.ts` | none | `scripts/build-android.ts:188-189`; `write-build-flags.ts` |
| Build input report, exit 2 with the command | `android-build-preflight.ts` | none | same file (worker row removed, G9) |
| Gradle dependency verification | `gradle-verification.ts` | none | same, `android:deps:check` |
| Authenticate vendor bytes at the pin | `pinned-upstream-source.ts:3` | `spec/os/build/sourceIntegrity.md` | `pinned-upstream-source.ts:15-16` → `verifyCommittedWorkspace` |
| Placeholder/short pin refused | `upstream-pin.ts` | none | `upstream-pin.ts` `pinnedCommit` |
| Android host generated from data | `android-host.ts` | `spec/os/build/androidHost.md` (+`.proof.dfy`) | `android-host.ts` → `generateAndroidHost`; `consumer-host.json` `osModules` all exist at pin |
| Agent bundle from pinned source | `prepare-local-agent.ts`, `build-mobile-agent.ts` | `spec/agent/plugins/bundle.md` | `build-agent-bundle.ts` → `@elizaos/agent/bundle` |
| Bundle load smoke | `mobile-bundle-smoke.ts` | same | upstream `build.vibe:328` `loadSmoke` |
| Runtime payload staged with inventory | `stage-local-agent-runtime.ts` | `spec/os/build/runtimePayload.md` | `stage-agent-runtime.ts:24`; `verify-packaged-runtime.py` |
| APK verification, signer, build record | `verify-apks.ts` | `spec/os/image/apk.md` | `verify-apks.ts` (28-line diff, runner and import paths) |
| Release APK signing and signer record | `sign-release-apks.ts`, `enroll-release-keys.ts` | `spec/os/image/signing.md` | same files; `release.yml` job structure unchanged |
| OTA check/apply/fallback | `aosp-ota-update.ts` | `spec/os/update/operator.md` | `aosp-ota-update.ts` → `otaMain` |
| OS OTA signing, custody proof, embedding carrier workflows | three workflows | none | byte-identical |
| Cloud deployment outputs check | `cloud-deployment.ts --check` | none | `cloud/src/deployment.vibe`, `cloud/test/deployment.test.vibe`; `verify`; Gradle admission |
| Native client registration, profile, wrangler render | `cloud-registration.ts`, `cloud-seed-registration.ts` | none | `cloud/src/{registration,profile,wrangler}.vibe` + tests |
| Launch config: on-phone embeddings, no credential | `agent-embeddings.ts`, `native-cloud-runtime-config-check.ts` | `spec/agent/host/launch.md` | `cloud/src/runtime-config.vibe` + test |
| Remembered Quint runs | `quint-cache.ts` | `SPEC.md:591-612` | upstream `vibestack/cache.ts`; `.spec-cache/` ignored |
| Quint typecheck, simulation, TS replay | `quint:check` | `SPEC.md:15-30` | `apps/app/package.json:12`; `turbo.json` `check`; `package.json:19` (wired, never run) |
| VibeLang compile/typecheck | n/a | `SPEC.md` `types` | `typecheck`, `build` in `apps/app` and `cloud` |

RETIRED (deliberate): Bun runtime acquisition (`ci/acquire-resident-bun.py`) → pinned Node (`aosp/runtime/node.lock.json`);
`upstream:prepare-client` → workspace packages; native patch receipts (`prepare-patched-native.ts`,
`assets/native-patches.json`) → upstream `osModules`, `patches: []`.

Tool wiring, in one line each: **Quint** wired into `pnpm verify` and promotion (simulation only);
**VibeLang** wired; **Dafny** wired implicitly through `check` but no proof files and no Dafny in CI;
**LemmaScript** only inside upstream's proof stage, Alpha's own use removed; **Bombadil** wired through `check`
with properties per area, no Chromium in CI. None has run.

## Not covered

- Behavioural parity of the 63 removed `scripts/test-*.ts` drivers and of the app-area tests (other slices).
- `scripts/android-host.ts` (125-line diff), `android/agent/host.json` route lists and `policy.json`.
- `scripts/os-ported/**` against the upstream originals they were copied from (45 files).
- `scripts/stage-aosp-native.py`, `verify-packaged-runtime.py` beyond the required-file list, `embedding-native-contract.ts`,
  `local-cloud.ts` (464-line diff), `cloud-deployment-policy.ts` (99), `eval-phone-actions.ts`.
- Cloud deploy semantics: Steward login Worker/tenant step and the `pricing` fill were removed
  (`cloud-deploy.yml` options `[all, api, edge]`, `prices check`); not checked against `@elizaos/cloud`.
- `android-emulator.yml` and `scripts/ci/emulator-suite.ts` step by step; the release workflow beyond the two breaks in G14.
- Whether the audit's denylist strings still match anything the new renderer could ship.
- `test/*.test.py` (8 files) and the JVM/Kotlin host tests' individual status.
- Per-spec Vibestack hygiene outside tooling (drivers: only 10 of 234 specs; `.meta.tsx`: 145 for 225 components).

## test/agent-launch-token-budget.test.mjs after the repin (2026-11-23, from the context-budget session)
- The test reads vendor/eliza/plugins/plugin-openai/models/text.ts, which does not exist on vibestack.
- Port it to where the vibestack agent sets the Cerebras rate-limit hold. Keep its intent: the launcher must not set CEREBRAS_RATE_LIMIT_MAX_HOLD_SECONDS.
- The default of a 4 s hold is being fixed on the eliza side by the context-budget session. The alpha launcher needs no change for it.
