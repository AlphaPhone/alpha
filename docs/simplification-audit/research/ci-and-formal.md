# CI, verification and formal-methods audit

Scope: `.github/workflows/*` (18 files, 2,645 lines), `scripts/ci/*` (45 files, ~5.8k lines), the `npm run verify`
chain in `package.json`, `specs/quint/**` (1,017 files, ~165k lines), `specs/lemma/**`, `LemmaScript-files.txt`,
`lemmascript.json`, `docs/formal-model-audit-2026-11/`, the runners `scripts/check-quint.ts`, `scripts/quint-lib.ts`,
`scripts/check-quint-refinement.ts`, `scripts/prepare-quint-history.ts`, `scripts/check-lemma.ts`,
`scripts/ci/check-changed-models.ts`, and the 299 `test/quint-*.test.mjs` files.

Method: every workflow and every runner was read end to end; harness files were sampled (about 40 read in full) and
the rest were classified by scripted greps (counts given with each claim). Run history and per-step timings come from
`gh run list` / `gh run view --log` (read-only) for the last 40-100 runs of each workflow, up to 2026-11-11 17:50Z.
"Dead/unused" claims were checked with `git grep` over the whole tree excluding `vendor/` (the command is named where
it matters).

---

## 1. Area overview

**CI shape.** Three PR-gating workflows each call the reusable `changes.yml`, which runs `scripts/ci/affected.ts` to
emit four booleans (`verify`, `browser`, `android`, `prepare`) and a browser shard plan:

| Workflow | Triggers | Jobs → what runs | Timeout / observed | Selection |
|---|---|---|---|---|
| `browser.yml` "Browser MVP" | push main+develop, PR, daily cron 07:23, dispatch | `changes`; **`verify` "Repository verification"** (`npm ci`, Playwright, JDK, org.json jar, Kotlin compiler, Dafny, `prepare-local-agent.ts`, `npm run verify`, proof renderer `vite build`, reachability); **`formal` "Changed-model proofs"** (`npm ci`, prepare-client, prepare-history, `quint:changed`); `browser` 1 or 6 shards (`npm ci`, Playwright, `run-browser.ts`, shard 1 also the local-agent profile specs); `production` (`npm ci`, Playwright, `quint:refinement --families=composition`, `build:test-mocks`+audit, `test:browser:production`); `result` aggregate; `storage` (dispatch-only Firefox/WebKit x2 shards) | verify 180 min, measured 113 min in `npm run verify` and then killed at 120 (run 42930847058); formal 180, measured 1 min (nothing selected) to 118 min (shared source changed); shards 60, measured 22-25 min | verify+formal: any non-doc path; browser: apps/app, test/browser, unknown paths; push events skip browser/production |
| `android.yml` "Android foundation" | push main+develop, PR, dispatch | `changes`; `build` (JDK, Gradle, SDK/NDK/CMake, `npm ci`, org.json jar, Kotlin compiler, on dispatch the **whole `npm run verify` again**, upstream `stage-launcher-overlay` test, `prepare-local-agent --source-only`, calendar-bridge, `android:build --allow-unpackaged-runtime --skip-instrumentation`, bundle audit, `aosp:stage`); `result` | 120 / 10 min | android: android/, apps/app/, unknown paths |
| `resident-prepare.yml` | PR, dispatch | `changes`; `prepare` (`agent:prepare`, cloud recording signature, `npm ci`, prepare-client, managed-Calendar rejection test, **digest-restart**, workflow-worker proof) | 70 / 6 min | prepare: unknown paths only |
| `lemma-check.yml` | PR on `apps/app/src/**`, specs/lemma, lockfile…; push main+develop; dispatch | `npm ci`, prepare-client, Dafny download, `lemma:check` | 30 / 2-23 min, **0 successes in last 40 runs** | own `paths:` filter |
| `quint-model-check.yml` | PR on `specs/quint/**`, check-quint, quint-lib; daily cron 06:17; dispatch | `npm ci`, prepare-client, `quint:verify --steps=6` over all 379 models, `quint:compare` (4 legacy models), `quint:temporal` (3 legacy models) | 240 / **never completed** in history (all cancelled at 4-63 min) | own `paths:` filter |
| `resident-android.yml` | **every push to main**, push develop / nightly only with `vars.ELIZA_RESIDENT_QUALIFICATION`, dispatch (build or publish-qualification) | `build` (~60 steps: SDK pruning, Bun, native inputs, `agent:prepare`, device-timing, worker build, workflow compiler/worker tests, Bun acquisition, `agent:stage-android`, two `build-archive.ts`, producer evidence…); `native` (emulator, `resident-native.py`); `recovery-ui` (emulator, `pending-recovery-ui.py`); `publish-qualification` (calls carrier) | 180 / 100 / 55; 0 successes in last 40 runs; longest build failed after 66 min (51 min in "Stage and archive") | none (not change-aware) |
| `android-emulator.yml` | dispatch only (suite choice) | `build` developer APKs (+ test-mocks APKs), then `instrumentation`, `browser-reading`, `fused-speech` emulator jobs | 150/90/90/60; 6 runs, 0 successes | n/a |
| `digest-restart.yml` | dispatch; weekly cron and main-push path filter gated by `vars.DIGEST_RESTART_AUTOMATIC` | `agent:prepare` + `agent:test-digest-restart` | 80 / 7 min | path filter, var-gated |
| `bun-spawn-seccomp.yml` | dispatch | glibc/musl reproduction of a Bun seccomp bug | 10; run twice on 2026-10-03, never since | n/a |
| `reproduce-paradee-model.yml` | dispatch | macOS model-conversion reproduction | 25; **never run** | n/a |
| `embedding-qualification-carrier.yml` | `workflow_call` from resident-android | validate + upload qualification receipt | 10 | n/a |
| `verify-cloud-signing-input.yml` | `workflow_call` from release-cloud-app-signing | `verify-cloud-signing-input.sh` | 10 | n/a |
| `release-app-signing.yml` | dispatch, main only, `release` env | build fixture APKs, sign with the real keystore, record a proof | 30; 2 runs | n/a |
| `release-cloud-app-signing.yml` | dispatch | admit plan (calls verify-cloud-signing-input) → sign → deliver privately | 30; 3 runs | n/a |
| `release-custody-proof.yml` | dispatch | verify key custody | 5; 2 runs | n/a |
| `release-os-ota-signing.yml` | dispatch | validate plan, GCS read, sign OTA, GCS write | 120; 6 runs | n/a |
| `publish-qualified-app-update.yml` | dispatch | admit → re-verify → publish launcher APK | 60; **never run** | n/a |

**Required checks.** `scripts/ci/required-checks-ruleset.json:19-21` lists `Repository verification`,
`Browser MVP result`, `Android foundation result`. But `browser.yml:237` says "No ruleset is installed (P-57)" and
`scripts/ci/read-required-checks.ts` exists only to diff the intended file against GitHub. `Repository verification`
is also already folded into `Browser MVP result` (`browser.yml:241,258`), so listing it separately is redundant.

**Verify chain** (`package.json` `verify`): `cloud-deployment.ts --check` → `upstream:prepare-client` →
`quint:prepare-history` (network `git fetch` of two historical upstream commits) → `quint:check` (**25 min**, 02:43→03:08
in run 42930847058) → `lemma:check` (10 s) → `typecheck` (5 s) → `npm test` (`node --test test/*.test.mjs test/*.test.ts`,
1,020 files; **still running after 88 min** at concurrency 1 when the job was killed; summed per-test time 77 min) →
`build` → `audit:bundle`. Everything is serial in one job.

**Formal layer.** 379 Quint models in four manifest families (`application` 188, `services` 78, `native` 86,
`legacy` 27; 2,855 registered scenarios; 1,060 pinned source symbols over 131 files; 825 distinct source files
referenced). `quint:check` loads every manifest and runs scenarios + simulation (+ witnesses) per model in a fresh
Node process each. Refinement ("conformance") harnesses under `specs/quint/refinement/{application,services,native,
composition,legacy}` (417 `.mjs`, 98 `.java`, ~76k lines) replay model ITF traces against real source loaded by six
different techniques (see §2.6). They run inside `npm test` through 299 `test/quint-*.test.mjs` wrappers. 23 renderer
files carry LemmaScript `//@` contracts proved by Dafny via `lemma:check`.

---

## 2. Pattern taxonomy

### 2.1 Verify Monolith ("everything is Repository verification")

*What:* one serial job runs quint:check, Dafny, typecheck, the entire 1,020-file node suite (which embeds ~300 formal
harness files, 22 Chromium-launching harnesses and 15 Vite servers), a production build and an audit. Any non-doc
path selects it (`affected.ts:25` sets `result.verify = true` for every non-reference path).

*Why it hurts:* a one-line change to a browser spec, an Android Java file, a release workflow or `docs/prd.md` costs
2+ hours of runner time and is the critical path for merge. Timeouts keep being raised instead of the work being cut:
`browser.yml:31-34` ("Clean runs measured 70-115 minutes… a loaded runner exceeded 120. Keep every check"), commit
`fc80fdcf7` "Give repository verification and changed-model proofs three hours". `ALPHA_TEST_CONCURRENCY: '1'`
(`browser.yml:76`) serialises the node suite to keep each aggregate within its deadline.

*Examples:*
- `affected.ts:9,22` — `README.md` or `docs/prd.md` select verify because `test/docs-links.test.mjs` reads them.
- `affected.ts:28-29` — a `test/browser/**` change selects verify as well as browser.
- `affected.ts:38-40` — editing `resident-android.yml`, `android-emulator.yml`… selects verify (comment says
  "Explicit qualification/diagnostics", yet `result.verify = true` was already set on line 25).
- `affected.ts:43-44` — any `android/**` file selects verify (2 h) even when no host test reads it.
- `affected.ts:48-49` — `specs/lemma/**`, `LemmaScript-files.txt`, `lemmascript.json`, every `scripts/ci/*.py`, and
  workflows other than browser/android/resident-prepare fall to the "unknown" branch and select **all four lanes**,
  including the APK build and six browser shards.
- `test/quint-application-refinement.test.mjs:6-8` — "The complete aggregate exceeded 20 minutes… allow the aggregate
  to finish", timeout 2,400,000 ms; the same comment in `test/quint-native-refinement.test.mjs:6-8` and
  `test/quint-services-refinement.test.mjs:9-11`.

*Spread:* every code PR. *Treatment:* split verify into lanes (§ Matrix) and stop running formal harnesses inside
`npm test`. *Risk:* need a reliable file→test dependency map; see §2.3 for how to derive it from existing receipts.

### 2.2 Run-it-four-times branch topology

*What:* `browser.yml`, `android.yml` and `lemma-check.yml` run on `push` to **both** `main` and `develop`, and the repo
syncs `main` into `develop` with merge PRs (run list shows "Sync reviewed PR 957 integration into develop", event
`pull_request`, head `main`). `affected.ts:95` computes the push diff from `event.before`, so a push re-selects
everything the PR already proved.

*Evidence:* `browser.yml:3-4` `push: branches: [main, develop]`; concurrency groups make push runs uncancellable
per-sha (`browser.yml:21-22`, `android.yml:13-14`); `resident-android.yml:40-41,69` builds on every main push.

*Why it hurts:* one change ⇒ PR→main run, main push run, main→develop PR run, develop push run: four 2-hour verify +
formal runs, four APK builds, plus a 3-hour resident build on main. *Treatment:* gate on PRs (or a merge queue) only;
run push builds only for artifacts (resident candidate) and skip verify on push; drop `develop` or stop gating the sync
PR. *Risk:* owner decision on whether `develop` remains.

### 2.3 Over-broad source selection in formal CI

*What:* `check-changed-models.ts:25-39` selects every model whose manifest `sources` contains a changed path. Hot
sources are listed by many models: `apps/app/src/runtime/connection-ui.tsx` (24 models), `prototype/model.js` (22),
`main.tsx` (17), `prototype/template.html` (17), `upstream.lock.json` (17), `prototype/agent-adapter.ts` (16). Each
selected model then gets an Apalache `verify` (+ `temporal`/`compare`) with a 1,800 s timeout
(`check-quint.ts:25`). Composition harnesses hash `sourcePaths()` = every file under `apps/app/src`, `apps/app/public`,
`android`, 64 named scripts and all projected upstream files (`quint-lib.ts:9-39,147-152`; used by
`refinement/composition/index.mjs:18`, `composition/controllers.mjs:18`, `application/shell-coordinator.mjs:20`).

*Why it hurts:* touching `connection-ui.tsx` costs ~2 h of symbolic checking (run 42930847058: "Check changed models"
118 min, then cancelled). `checkerInputs` (`check-changed-models.ts:22`) include `package-lock.json`, so every
dependency bump re-verifies all 379 models.

*Treatment:* keep selection but (a) drop `package-lock.json` from `checkerInputs` unless the Quint version changes,
(b) give hot shared files to the one or two models that actually model them, (c) cap verify depth for CI and run full
depth nightly. The receipts already record each harness's exact inputs (`check-traces.mjs` `captureInputs`); a nightly
job can publish `test-results/quint-refinement/*` as a path→test index that PR CI consumes.

### 2.4 Duplicate execution (same work in two places)

| Work | Place 1 | Place 2 (and 3) | Evidence |
|---|---|---|---|
| 182 refinement campaigns | per-model `test/quint-<x>.test.mjs` (176 files) | family aggregate tests `quint-application-refinement`, `-services-`, `-native-` which import the same `check*` from `refinement/<family>/index.mjs` | `refinement/application/index.mjs:116-148` adapter list contains e.g. `checkAgentCalendarRefresh`, also run by `test/quint-agent-calendar-refresh.test.mjs:7`; the app aggregate alone took **1,090 s** in the log; scripted count: 182 imports from 176 test files are also in a family index (90 application, 54 native, 36 services, 2 legacy) |
| Composition refinement | `npm test` → `test/quint-composition-refinement.test.mjs:5-9` | `browser.yml:211-214` production job `quint:refinement --families=composition` | same `runCompositionRefinement` |
| LemmaScript with Dafny | `browser.yml:58-59,74` (`prepare-dafny.sh`, `LEMMA_REQUIRE_BACKEND=1`) | `lemma-check.yml` (whole workflow) | identical command `npm run lemma:check` |
| Changed-model symbolic proofs | `browser.yml` `formal` job | `quint-model-check.yml` (all models, same `verify` phase) on any `specs/quint/**` PR | `quint-model-check.yml:45` vs `check-changed-models.ts:47-50` |
| `npm run verify` | `browser.yml:69` | `android.yml:78-82` on dispatch | identical |
| Digest restart | `resident-prepare.yml:44-49` | `digest-restart.yml:43-51` | both `agent:prepare` + `agent:test-digest-restart` |
| Recovery guard / crash diagnostic Python tests | `test/python-suites.test.mjs:26-28` (npm test) | `resident-android.yml:567-570` and `:244-245` | same scripts |
| Upstream test `stage-launcher-overlay.node.test.ts` | `android.yml:83` | `resident-android.yml:272` | tests `vendor/eliza` code — belongs to upstream CI |
| `setup-bun` | `android.yml:31-34` | `android.yml:64-67` | same step twice in one job |
| `build-tools;36.0.0` | `setup-android packages:` | `sdkmanager "build-tools;36.0.0"` | `resident-android.yml:490-495`, `:578-583` |
| `npm ci` | 11 occurrences across 6 workflows; a typical apps/app PR runs it 10× (verify, formal, 6 shards, production, android) + lemma-check | | no composite action, no `node_modules` cache |
| `upstream:prepare-client` | 7 explicit calls + `pre*` hooks (`predev`, `prebuild`, `pretypecheck`, `pretest`, …) | | `package.json` |
| `quint:conformance` alias | `node --test test/quint-conformance.test.mjs …` | these files already match `test/*.test.mjs` in `npm test` | `package.json` |
| `changes.yml` | invoked by browser, android and resident-prepare per event | | three identical diff jobs |

*Treatment:* delete the per-model wrappers *or* the family aggregates (keep the per-model ones: they parallelise and
name the failing model; the aggregates' only extra assertion — "every manifest model has a receipt" — becomes one
cheap coverage check over receipts). Delete `lemma-check.yml`, `quint:conformance`, `digest-restart.yml`, the duplicate
verify in `android.yml`, the duplicate Python runs in resident-android.

### 2.5 Never-green / unreachable workflow code

- `lemma-check.yml:46` exports `DAFNY=$RUNNER_TEMP/dafny/dafny` to `$GITHUB_ENV`, but `check-lemma.ts:90` runs
  `spawnSync('dafny', ['--version'])` from `PATH`. On the hosted runner that finds nothing, so the check records
  `skipped-no-qualified-backend` and exits 2 under `LEMMA_REQUIRE_BACKEND=1` (log of run 43066581036: "Dafny 4.11.0 is
  required; generation passed but no function proof ran… exit code 2"). 0/40 green. `prepare-dafny.sh:13` does it right
  (`>> "$GITHUB_PATH"`). Confident.
- `android-emulator.yml:72-76` fails the build job for `fused-speech` and `all`; the `fused-speech` job
  (`:267-336`) can therefore never run, and `all` always fails. `test/ci-emulator-evidence.test.mjs:175` asserts the
  refusal exists.
- `quint-model-check.yml`: 240-minute serial Apalache over 379 models; every recorded run was cancelled.
- `browser.yml`: 0 successful runs in the last 100; `resident-android.yml`: 0 in 40.
- `release-cloud-app-signing.yml:115-117` and `publish-qualified-app-update.yml:146-150` keep `.mjs`-vs-`.ts`
  fallbacks for a script rename that already happened (`scripts/apk.ts`, `scripts/deliver-app-update.ts` exist).

### 2.6 Text-anchored harnesses ("source surgery")

*What:* refinement harnesses do not import the code under test; they read source text, cut it at literal anchors
(including comments and indentation), patch it, strip types and evaluate it in `vm`/JSDOM, or re-bundle it with esbuild
`onLoad` patches. 43 `between(...)` calls in 12 files, 45 files use `stripTypeScriptTypes`, 30 files patch source by
string replacement, 22 launch Chromium, 15 start Vite, 28 use JSDOM, 98 compile production Java with `javac`.

*Examples (renaming, reformatting or even re-commenting these breaks the harness):*
- `refinement/application/composer-send.mjs:35-38` slices `apps/app/src/prototype/agent-adapter.ts` between
  `'function createdFromSlot('`…`'function selectedCloudName('`, `'function replyNotices('`…`'/** Decline one pending proposal'`,
  `'  p.send = async function'`…`'  p.agentSay = function'`, and `'this.connectionUnsubscribe = connectionController.subscribe(() => {'`…`'    // Canonical is the default;'`.
- `refinement/application/keyboard-focus.mjs:17-18` anchors `'\t\tconst free = keyboardFreeHeight();'` and
  `'\n\t};\n\tp.componentDidUpdate'` (tabs!) in `apps/app/src/main.tsx`.
- `refinement/application/calendar-form-controls.mjs:21-31` anchors `'      var dayChips = [];'`, `'    // month panel'`.
- `refinement/application/shell-core-fixture.mjs:20-23` anchors `'\n  S() {'`, `'\n  /* ---- gestures ---- */'`,
  `'\nvar BASE = {'` in `prototype/model.js`.
- `refinement/application/drawer-interaction.mjs:22-27` rewrites `InstalledAppsGridDrawer.tsx`
  (`'    opened = useRef<string | null>(null);'`, `'clearTimeout(press.current.timer)'`).
- `refinement/native/hosted-result-notices.mjs:28-33` and `request-withdrawal-platform.mjs:23-27` slice Android Java
  by member signatures (`' @PluginMethod public void withdrawOtherOwnerApprovalNotices'`, `'  JSONObject headers=call.getObject("headers");'`).
- `refinement/native/renderer-speech-chunk.mjs:44` regex-strips imports/exports from `apps/app/src/local-speech-playback.ts`.

Files most targeted by text surgery: `prototype/agent-adapter.ts`, `ElizaAgentService.java`, `AlphaDevicePlugin.java`,
`AlphaConnectionPlugin.java`, `CapacitorPlugin.java`, `runtime/alpha-client.ts`, `prototype/voice-adapter.ts`,
`prototype/model.js`, `prototype/maps-adapter.ts`, `main.tsx` (8 harnesses), `prototype/browser-adapter.ts` (6).

*Why it hurts:* the formal suite locks the current file layout, statement order, whitespace and comments of the very
files the cleanup wants to restructure. *Treatment:* before refactoring a file, run its owning harnesses (index in
§2.7); prefer exporting the function under test and `tsImport`-ing it (5 harnesses already do this) so harnesses depend
on exported names, not text. *Risk:* high — any refactor of the listed files must update harness anchors in the same
change.

### 2.7 Manifest symbol pinning

*What:* `quint-lib.ts:238-244` requires every manifest `symbols[].name` to appear (word-bounded regex) in its file, at
load time of every Quint command. 1,060 entries / 131 files; top files: `runtime/connection-ui.tsx` 59 symbols,
`prototype/browser-adapter.ts` 59, `prototype/model.js` 43, `prototype/reminder-adapter.ts` 41,
`prototype/voice-adapter.ts` 36, `prototype/workflow-adapter.ts` 31, `prototype/calendar-adapter.ts` 30,
`prototype/agent-adapter.ts` 29, `prototype/settings-adapter.ts` 28, `prototype/maps-adapter.ts` 24,
`android/.../AlphaLocalAgentPlugin.java` 23, `MainActivity.java` 19. Some "symbols" are prose or code fragments:
`'Tab limit'`, `'tabs.creation'`, `'back()'`, `'swallowed()'`, `'async function refresh'`,
`'freeHeight(width,layoutHeight,input.editing)'`, `'alpha.browser.alarm-owner'`.
Also `quint-lib.ts:233` `readFileSync`s every listed `sources` entry, so renaming/deleting any of the 825 listed
files breaks `quint:check` (and every other Quint command) before a single model runs.

*Treatment:* treat manifest `sources`/`symbols` as part of each refactor's diff (a script can rewrite paths/names);
drop `symbols` that are string fragments. Full list: regenerate with the node one-liner used for this audit
(`specs/quint/*/manifest.json` → `symbols`).

### 2.8 Evidence ceremony

*What:* every runner and harness hashes its inputs before and after, writes progress receipts, retries silent SIGSEGVs,
runs canaries, and asserts exact trace/checkpoint counts. `check-quint.ts:40-44,236-242`, `check-lemma.ts:47-50,108-114`,
`check-changed-models.ts:86-112`, `check-quint-refinement.ts:79-85,203-207`, `check-traces.mjs:1-60` (snapshot store
under `test-results/quint-refinement/input-snapshots`), and harness tests such as
`test/quint-agent-calendar-refresh.test.mjs:9-13` (`traces === 25`, `checkpoints === 237`).
*Why it hurts:* a large share of the 6k lines of runner code defends against inputs changing *during* a CI run, which
cannot happen on an ephemeral runner; exact counts make every model edit a two-file change. *Treatment:* keep pass/fail
+ output; drop mid-run input re-hashing, progress files and exact count assertions (assert `> 0`).

### 2.9 Upstream modelled in the consumer

*What:* 32 models (services/native) plus 16 `legacy/Core*` models have only `vendor/eliza/**` (or
`upstream.lock.json`) as sources, e.g. `services/CoreApprovalServiceCurrent`, `CoreServiceLifecycle`,
`CoreRuntimeShutdown`, `TaskServiceLifecycle`, `TaskSchedulerRuntime`, `CoreTurnControllers`, `CoreConnectorCustody`,
`native/NativeListenerService`, `NativeSpeechGate`, `VadSegmentation`. Pairs model the same upstream unit twice
(`services/CoreApprovalServiceCurrent.qnt` 116 lines vs `legacy/CoreApprovalService.qnt` 119; `services/CoreServiceLifecycle`
vs `legacy/CoreServiceLifecycleDesign`; `services/TaskServiceLifecycle` vs `legacy/CoreTaskService`;
`services/TaskSchedulerRuntime` vs `legacy/CoreTaskScheduler`).
*Why it hurts:* AGENTS.md says shared behaviour belongs upstream; these models can only change on a pin bump yet run
on every PR. *Treatment:* run them only when `upstream.lock.json` changes, or move them upstream.

### 2.10 Historical-evidence retention ("legacy" family)

`specs/quint/legacy` (77 files, 21k lines) holds 11 translated 2026-11 design comparisons (ChatInput, SettingsNav,
HomeLayout, GoogleConnect, SignIn, Maps, NotesView, PhotosLibrary, FilesBrowser, Calendar, CameraSession) whose
"current" design is source `ef9fbf7cd7` (`legacy/README.md:3-5`), plus 16 `Core*` conversions of upstream TLA+ at
upstream revision `4787d51a…` that must be `git fetch`ed on every verify (`prepare-quint-history.ts:7-10`,
`legacy/core/README.md:3-10`). Live dependencies on it:
- `quint-model-check.yml:50,54` — the only `compare`/`temporal` users (all legacy).
- `refinement/services/task-scheduler/index.mjs:7` reads `specs/quint/legacy/CoreTaskScheduler.qnt`.
- `refinement/application/{browser-deletion-poll,google-access-publication,resident-liveness}.mjs` import
  `deferred`/`tick` from `legacy/core/source-support.mjs` (a generic helper living in the legacy tree).
- `refinement/native/{mms,sms}-dispatch.mjs` use `legacy/core/formal-source-inventory.mjs` for the second historical
  revision `b1817660…` (`refinement/native/mms-historical-sources.json`).
- 26 test files (`test/quint-legacy-*`, `quint-historical-*`, `quint-core-*`, `quint-tla-inventory`, …) and 7
  `test/fixtures/quint/*Comparison.qnt`. Several are among the slowest tests (historical Photos 45 s, Notes 40 s,
  Files 27 s, Maps 27 s; Maps asserts six *mismatches* against the current renderer,
  `test/quint-legacy-maps-refinement.test.mjs:16-19`).
- `legacy/core/check-configurations.mjs` (217 lines) is run by nothing but its README (`git grep check-configurations`).

### 2.11 Model sprawl and audit-variant twins

379 models, most single-file and unimported (only 24 files import another; real compositions are
`native/ApplicationComposition.qnt` 1,026 lines, `ControllerComposition`, `NativeUpdateComposition`, plus `PhotosTrash→PhotosWindow`,
`InboxProviderDrafts→InboxCoordinator→InboxDelivery`, `PermanentVoiceDeletion[AuditLease]`). Six files are headed
"Complementary audit scope; the canonical model and its source correspondence remain registered separately":
`application/CredentialVaultReadback`, `PreferencesAndPresentationAuditState`, `PermanentVoiceDeletionAuditLease`,
`native/AlwaysOnListenerIndicatorReadback`, `ResidentSchedulingServiceAdmission`, `services/WorkflowExecutionAuditAdmission`
— each a second model of the same component. Families also fragment one feature into many models (application has
`AgentCalendar{EventReturn,Mutation,Refresh,SyncControl}`, `CanonicalCalendar{Draft,DraftHandoff,EditorClose}`,
`CanonicalNotes{Controller,Draft,Feedback,Mutation,View}`, `GoogleCalendar{AccessChoice,Disconnect,LinkFlow,LinkPublication}`,
`Settings{CapabilityReads,ListenerReads,PageFocus,Reads,Session}`). Services models CI/build tooling itself
(`AndroidBuildInputReadiness`, `AndroidGzipAssetStage`, `MobileBundleAdmission`, `PreparedSourceStamp`,
`WorkflowWorkerStaging`, `ClientFeaturePublication`…), which is why `scripts/**` edits touch formal CI.
*Treatment:* merge each audit twin into its canonical model; group per-feature model clusters into one module with
several invariants; drop models of build scripts (their e2e test is the build).

### 2.12 Tests that assert workflow/source text

`test/ci-required-checks.test.mjs:43-60` regex-matches `browser.yml`/`android.yml` text (concurrency groups, `on:` blocks,
step names); `test/ci-emulator-evidence.test.mjs` (411 lines, 35 workflow reads) asserts job wiring and action pins;
`test/ci-affected.test.mjs:58-80` asserts lane booleans; plus `test/app-update-candidate.test.mjs`,
`test/embedding-workflow-forwarding.test.mjs`, `test/qualified-app-update.test.mjs`. Quint registry floors
(`test/quint-checker.test.mjs:32-34`, `floors = {application: 116, services: 51, native: 65, legacy: 27}`, scenarios
≥ 1841) forbid deleting models. *Treatment:* any CI simplification must delete/rewrite these in the same PR; replace with
`actionlint` + a pin check.

### 2.13 Copy-paste workflow blocks

Emulator boot block (KVM udev rule + `android-emulator-runner` with identical options) ×5; "Provision … capacity"
shell blocks ×3 with the same seven directories (`resident-android.yml:123-187,461-481,545-565`); GCP auth block ×4;
Android toolchain install ×3; Dafny install ×2 (`prepare-dafny.sh` vs `lemma-check.yml:40-46`); `prepare-local-agent`
+ `verifySource` one-liner ×2 (`browser.yml:60-68`, `android.yml:68-77`); 150-line inline Python/Node heredocs in
YAML (`resident-android.yml:339-388`, `release-cloud-app-signing.yml:110-172`, `android.yml:116-122`).
*Treatment:* one composite action per setup (node+ci, android toolchain, emulator, gcp auth); move heredocs to scripts.

### 2.14 Dead/duplicated helpers in harnesses

`gate()` redefined in 37 files, `deferred()` in 20 (a shared one exists at `legacy/core/source-support.mjs:14`),
`flush()` in 23, `between()` in 12, Java `*Ports.java` / `*Probe.java` per harness. `AsrPipeFailureProbe.java` is
referenced by nothing (`git grep AsrPipeFailureProbe` hits only itself); `legacy/core/interaction-metadata.json` and
`lifecycle-metadata.json` likewise.

### 2.15 Stale narrative docs inside spec trees

108 `.md` files (6,073 lines) in `specs/quint`; review logs at the root (`develop-state-review.md`,
`notes-storage-getter-review-20261109.md`, `pixel-native-review-20261109.md`, `ui-return-review-20261109.md`,
`verification.md` "Historical Quint migration verification… 58 admitted model files"). `specs/quint/README.md:117` says
"259 models and 1,841 registered scenarios" (actual 379 / 2,855). `docs/formal-model-audit-2026-11/` (15 files,
1,683 lines) says "There are no LemmaScript models… 58 models" — superseded; referenced only by its own README.
`specs/lemma/README.md` contains two concatenated READMEs (lines 1-30 and the `# LemmaScript proofs` section).

---

## 3. Delete candidates

| Candidate | Evidence nothing needs it / replacement |
|---|---|
| `.github/workflows/lemma-check.yml` | Broken (§2.5) and fully duplicated by `browser.yml` verify, which installs Dafny on `PATH` and sets `LEMMA_REQUIRE_BACKEND=1`. |
| `.github/workflows/digest-restart.yml` | `resident-prepare.yml:44-49` runs the same `agent:test-digest-restart`. Its automatic triggers are var-gated off. Update `affected.ts:38` regex. |
| `.github/workflows/bun-spawn-seccomp.yml` + `scripts/ci/reproduce-bun-spawn-seccomp.py` | One-off reproduction, 2 runs on 2026-10-03; referenced only by the workflow (`git grep reproduce-bun-spawn`). |
| `.github/workflows/reproduce-paradee-model.yml` + `scripts/ci/reproduce-paradee-model.py` | Never run; references: the workflow and `test/ci-pin-bound-scripts.test.mjs` (update it). |
| `android-emulator.yml` `fused-speech` job and `all` option | Unreachable (build refuses, `:72-76`). Keep `speech-candidate.ts` only if the owner still plans hosted voice staging. |
| `android.yml` dispatch-only verify steps (`:31-34`, `:63-82`) | Duplicate of browser.yml verify. Also the second `setup-bun`. |
| `quint-model-check.yml` | Never completed. Replace with a nightly `quint:verify` over *changed-since-last-green* models, or fold `compare`/`temporal` of legacy models into the decision on §3 legacy below. |
| Family aggregate refinement tests `test/quint-{application,services,native}-refinement.test.mjs` (or the 176 per-model wrappers) | Same campaigns run twice (§2.4). |
| `browser.yml` production-job composition refinement (`:211-221`) | Same as `test/quint-composition-refinement.test.mjs`. |
| `quint:conformance`, `quint:typecheck`, `quint:test`, `quint:simulate` npm aliases | Only referenced from `specs/quint/README.md`; `quint:check` and `npm test` cover them. |
| `specs/quint/legacy/core/check-configurations.mjs` (+ `interaction-metadata.json`, `lifecycle-metadata.json`) | No caller outside its README. |
| `specs/quint/refinement/native/AsrPipeFailureProbe.java` | No reference. |
| `specs/quint/legacy/**` (11 historical design comparisons, 16 upstream Core conversions), `test/fixtures/quint/*Comparison.qnt`, 26 legacy/historical/core tests, `quint:prepare-history` + `scripts/prepare-quint-history.ts` | Historical evidence about superseded source (`ef9fbf7cd7`) and upstream TLA+; costs a network fetch per verify. **Before deleting**: move `deferred/tick` from `legacy/core/source-support.mjs` to `refinement/support`; move `CoreTaskScheduler.qnt` used by `refinement/services/task-scheduler/index.mjs:7` into `services/` (or delete with its services twin); decide on `mms-historical-sources.json` counterexample witnesses in `refinement/native/{mms,sms}-dispatch.mjs`; lower floors in `test/quint-checker.test.mjs:32`. Owner decision (§7). |
| 6 "Complementary audit scope" twin models | Merge into canonical model (§2.11). |
| `specs/quint/{develop-state-review,notes-storage-getter-review-20261109,pixel-native-review-20261109,ui-return-review-20261109,verification}.md`, `docs/formal-model-audit-2026-11/` | Point-in-time notes; stale counts; only self-referenced (manifest.json mentions in application/services are free-text, check before deleting). |
| Legacy suffix fallbacks `release-cloud-app-signing.yml:115-117`, `publish-qualified-app-update.yml:146-150` | `.mjs` scripts no longer exist (`ls scripts/apk.ts scripts/deliver-app-update.ts`). Only matters if signing old producer commits — owner to confirm the oldest commit still signable. |
| `upstream stage-launcher-overlay` test in `android.yml:83`, `resident-android.yml:272` | Tests `vendor/eliza`; upstream's CI owns it. |
| `Repository verification` entry in `required-checks-ruleset.json` | Already aggregated by `Browser MVP result`. |

---

## 4. Duplicated types and helpers

| Name | Locations | Single home |
|---|---|---|
| Quint manifest type (`ModelDefinition`/`ManifestModel`/`QuintModel`) + manifest reading + `sharedSources→vendor/eliza/` mapping | `quint-lib.ts:58-96`, re-implemented in `check-changed-models.ts:8,70-82`, `refinement/application/index.mjs:166-167` (`Array.isArray(manifest) ? manifest : manifest.models`), `test/quint-native-refinement.test.mjs:14` | export `readModelFamily(family, text?)` from `quint-lib.ts`; normalise all manifests to one shape (`application` is an array, `native` is `{models}`) |
| family list `['application','services','native','legacy']` | `quint-lib.ts:43`, `check-quint.ts:42`, `check-quint-refinement.ts:82`, `check-changed-models.ts:20`, `test/quint-checker.test.mjs:89` | export `modelFamilies` |
| Receipt / evidence shapes (`CheckEvidence`, `Receipt`, `TraceReceipt`, `ChangedModelsReceipt`, `LemmaReceipt`) | `check-quint.ts:45-82`, `check-quint-refinement.ts:9-59`, `check-changed-models.ts:9-19`, `check-lemma.ts:10-21` | one `scripts/formal-receipt.ts` if receipts survive §2.8 |
| child-process timeout/kill/output-cap runner | `check-quint.ts:96-141`, `check-lemma.ts:31-38`, `refinement/native/java.mjs:34-42`, `check-traces.mjs` | one helper (there is already `scripts/child-command.ts`) |
| `gate`, `deferred`, `flush`, `tick`, `between`, `replaceOnce` | 37 / 20 / 23 / – / 12 / 2 harness files; shared `deferred` at `legacy/core/source-support.mjs:14` | `specs/quint/refinement/support.mjs` |
| Java runtime discovery (`executable('javac')`, `javaBinary`) and org.json jar lookup | `refinement/native/java.mjs:14-32`, `refinement/native/reminder-delivery.mjs:69-72`, `specs/quint/native/conformance.mjs` | `java.mjs` |
| `affected.ts` lane object `{verify,browser,android,prepare}` literal | `affected.ts:19,92,106` | constant |
| `productionSpec` regex | `affected.ts:58` and `playwright.config.ts:10` (kept in sync by `test/ci-required-checks.test.mjs:21-25`) | export from one file and import |
| Dafny install | `scripts/ci/prepare-dafny.sh`, `lemma-check.yml:40-46` | the script |
| `prepare-local-agent` + `verifySource` inline Node | `browser.yml:62-68`, `android.yml:70-77` | `scripts/ci/prepare-sdk.sh` |
| Emulator/KVM/provision blocks | §2.13 | composite actions |
| Python sibling-import hacks | `test/python-suites.test.mjs:20` (`sys.path.insert(0,'scripts/ci')`) vs workflows running with cwd | make `scripts/ci` a package or merge `resident_*.py` modules |

---

## 5. Structure / foldering

- `specs/quint/legacy/core/source-support.mjs` and `formal-source-inventory.mjs` are generic harness utilities living
  in the legacy tree; current harnesses import them.
- `specs/quint/legacy/CoreTaskScheduler.qnt` is consumed by a *services* harness.
- Family split by "where the code runs" (application/services/native) does not match ownership: e.g. Calendar is in
  all three (`application/AgentCalendar*`, `services/CalendarSync`, `CalendarLinkedSync`, `native/NativeCalendarSyncEnable`).
  A per-feature folder (`specs/quint/calendar/…` with its harnesses beside the model) would make the path→check map trivial.
- Harnesses live under `specs/` but are tests; their test wrappers live under `test/`. One of the two is redundant —
  put the `node:test` call in the harness file and run `specs/quint/refinement/**/*.test.mjs` as its own lane.
- `scripts/ci/` mixes CI glue (`affected.ts`, `required-result.ts`), release signing (`sign-os-ota.py`,
  `seal-signed-apks.py`, `private-apk-storage.py`), resident emulator drivers (`resident_*.py`), and their tests
  (`test-*.py`, `*.test.py`). Split into `scripts/ci/`, `scripts/release/`, `scripts/resident/`.
- `resident-android.yml` (615 lines) is the monolith: build, two emulator suites, qualification publishing, unsigned
  candidate publishing, producer evidence. Split candidate build (main push) from manual qualification.
- `specs/lemma/apps/app/src/**` mirrors source paths; 15 of 23 `.dfy` files are byte-identical to their `.dfy.gen`
  (`cmp` over all pairs), so for those only the generated file carries information.

---

## 6. Worst offenders

1. `.github/workflows/browser.yml` — verify monolith + formal + duplicated composition refinement; never green in 100 runs.
2. `scripts/ci/affected.ts` — verify selected for everything; unknown branch selects all lanes for lemma/specs/scripts/ci.
3. `.github/workflows/resident-android.yml` — 615 lines, runs 3 h on every main push, 0/40 green, 3 copies of provisioning.
4. `.github/workflows/lemma-check.yml` — broken (DAFNY on env, not PATH) and duplicate.
5. `.github/workflows/quint-model-check.yml` — 240-min serial job that has never finished.
6. `package.json` `verify` — 9 serial steps, includes a network fetch of historical upstream objects.
7. `test/quint-application-refinement.test.mjs` — 18-minute duplicate of 90 per-model tests.
8. `test/quint-native-refinement.test.mjs`, `test/quint-services-refinement.test.mjs` — same duplication.
9. `specs/quint/refinement/application/index.mjs` — 116 imports, 113-entry adapter list mirrored by test files.
10. `specs/quint/refinement/application/composer-send.mjs` — slices `agent-adapter.ts` by comment anchors.
11. `specs/quint/refinement/application/keyboard-focus.mjs` — tab-indented anchors in `main.tsx`.
12. `specs/quint/refinement/application/shell-core-fixture.mjs` — slices `prototype/model.js`.
13. `specs/quint/refinement/native/hosted-result-notices.mjs`, `request-withdrawal-platform.mjs` — Java text surgery.
14. `scripts/quint-lib.ts` — 64-entry hand list of "runtime scripts" hashed into every composition receipt; symbol pinning.
15. `scripts/ci/check-changed-models.ts` — `package-lock.json` re-verifies all 379 models; minified style.
16. `specs/quint/application/manifest.json` (188 entries, 71 with symbols) — 1,060 symbol pins across families.
17. `specs/quint/legacy/**` — historical comparisons that need two upstream history fetches.
18. `.github/workflows/android-emulator.yml` — unreachable job, 0/6 green.
19. `test/ci-emulator-evidence.test.mjs`, `test/ci-required-checks.test.mjs` — assert YAML text, block CI edits.
20. `test/quint-checker.test.mjs` — registry floors forbid model deletion.
21. `docs/formal-model-audit-2026-11/` — 1.7k lines of superseded audit.
22. `.github/workflows/android.yml` — dispatch path re-runs verify; double setup-bun; upstream test.

---

## 7. Proposed simpler path → check matrix

Lanes (each its own job, parallel, with a shared composite "node + npm ci + prepare-client" action and an
`actions/cache` of `node_modules` keyed on `package-lock.json`):

- **static** — `tsc --noEmit`, `typecheck:scripts`, `actionlint`, `cloud-deployment --check` (≈2 min)
- **host** — non-formal node tests (`test/*.test.*` minus `test/quint-*`), sharded 4× with default concurrency
- **quint-model** — `quint:check --models=<selected>` (scenarios + simulation) for selected models and importers
- **quint-refinement** — `test/quint-<model>.test.mjs` for selected models (one wrapper per model, aggregates deleted)
- **lemma** — `lemma:check` with Dafny on `PATH`
- **browser** — Playwright chromium shards (existing `browserPlan`)
- **production** — `build` + `audit:bundle` + `test:browser:production` + test-mocks audit
- **android** — APK build + calendar bridge + aosp stage
- **prepare** — resident-prepare
- **nightly/main only** — `quint:verify` (Apalache) on all models, resident-android, emulator suites, cross-browser storage

| Changed path | static | host | quint-model / refinement | lemma | browser | production | android | prepare |
|---|---|---|---|---|---|---|---|---|
| `docs/**`, `design/**`, `*.md` (incl. README, prd) | – | only `docs-links` test (seconds) | – | – | – | – | – | – |
| `apps/app/src/**` | ✓ | tests importing the file | models whose `sources`/`symbols`/harness inputs include the file | only if file ∈ `LemmaScript-files.txt` | ✓ | ✓ | PR: skip (renderer bytes are covered by production build); main/merge-queue: ✓ | – |
| `apps/app/public/**`, `index.html`, `vite.config.ts` | ✓ | – | models listing them | – | ✓ | ✓ | merge-queue | – |
| `android/**` | – | Java/host tests reading the file | native models listing the file | – | only `browserReadAndroid` | – | ✓ | – |
| `specs/quint/<family>/<Model>.qnt` | – | – | that model + importers + its refinement test | – | – | – | – | – |
| `specs/quint/refinement/**/<x>.mjs|.java` | – | – | tests importing it | – | – | – | – | – |
| `specs/lemma/**`, `LemmaScript-files.txt`, `lemmascript.json` | – | – | – | ✓ | – | – | – | – |
| `test/browser/**`, `playwright.config.ts` | – | – | (refinement tests importing `test/browser/helpers/**`, e.g. legacy maps) | – | selected specs | production specs if touched | – | – |
| `test/<x>.test.*` | – | that file | – | – | – | – | – | – |
| `scripts/<x>.ts` | ✓ | tests importing it | models listing it (services build-tool models) | – | if imported by playwright config/storage-specs | if build/audit script | if android build script | if `prepare-local-agent`/`local-agent-*`/`stage-*` |
| `scripts/ci/*.py`, release workflows | – | its own `*.test.py` | – | – | – | – | – | – |
| `.github/workflows/<w>.yml` | actionlint | – | – | – | if browser.yml | – | if android.yml | if resident-prepare.yml |
| `package-lock.json`, `upstream.lock.json`, `vendor/eliza` pointer, `tsconfig*.json` | ✓ | ✓ | ✓ (all) | ✓ | ✓ | ✓ | ✓ | ✓ |
| unknown | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

Implementation path for "tests importing the file": `node --test` already loads each test file; an esbuild metafile
pass (`build({metafile:true, bundle:true, write:false})` per test entry, ~seconds) or the input lists that every
refinement receipt already records (`captureInputs`, `sourceHashesAfter`) gives a reverse index. Unknown → run all keeps
the current safety property.

Expected effect: a renderer-only PR drops from ~2 h serial verify + 2 h formal to ≈25 min wall clock (browser shards
dominate); a Java-only PR to the APK build (~10 min) plus its native harnesses; a docs PR to seconds.

---

## 8. Quint details requested

**Counts.** 379 `.qnt` models, all registered (`loadModels` fails on an unregistered or missing `.qnt`,
`quint-lib.ts:248-250`); 7 more `.qnt` fixtures under `test/fixtures/quint/` escape registration. Lines: 50,561 in
`.qnt`. Families: application 188 (1,290 scenarios, 79 with witnesses), services 78 (677), native 86 (767, 2 with
`additionalProofInit`), legacy 27 (121; 24 temporal, 11 `currentChecks`, 7 `currentTemporalChecks`).

**Composed/imported.** 24 files contain imports; cross-file imports exist only for `ApplicationComposition`
(CalendarSync, IdentitySession, InboxDelivery, ResetRecovery, ResidentRuntime, VoiceSession), `ControllerComposition`
(CalendarLinkedSync, IdentitySession, VoiceSession), `NativeUpdateComposition` (NativeUpdateActivation,
NativeUpdateStaging, RuntimeUpdatePause), `PhotosTrash→PhotosWindow`, `InboxProviderDrafts→InboxCoordinator→InboxDelivery`,
`PermanentVoiceDeletionAuditLease→PermanentVoiceDeletion`; legacy `Core*` files import modules declared in the same file.

**Checked by what.** `quint:check` (in verify): every model, scenarios + simulation (+ witnesses, + additional init).
`quint:changed` (browser.yml `formal`): Apalache `verify` + `temporal`/`compare` for changed models only. `quint-model-check.yml`:
`verify` for all, `compare` for ChatInput/SettingsNav/HomeLayout/GoogleConnect, `temporal` for SignIn/GoogleConnect/Maps
— never finished. No model is "present but unchecked" by `quint:check`; the 7 `test/fixtures/quint/*Comparison.qnt` are
only run through legacy refinement tests.

**Durations.** `quint:check` 25 min for 379 models (≈4 s/model, dominated by Node+Quint CLI start-up per phase and
2000-sample witness runs). Changed-model Apalache: up to ≥118 min. Refinement: application aggregate 18 min; slowest
per-model harnesses 60-137 s (Calendar/Notes mounted-browser campaigns).

**How harnesses bind to code** (so refactors know what they will break):
1. `sources` (825 files) — must exist (`quint-lib.ts:233`), hashed into receipts, drive `quint:changed`.
2. `symbols` (1,060, §2.7) — regex-required in the named file.
3. Text slicing / patching (§2.6) — 30+ harness files with literal anchors.
4. Vite + Playwright mounting real modules by URL path (`/src/runtime/connection-ui.tsx`, `/src/maps/cloud-maps.ts`,
   `/src/browser/device.ts`, `/src/maps/agent-navigation.ts`, … via `test/browser/helpers/page-modules.ts`) and reading
   `window.__alphaModules[path]` exports (e.g. `connectionController`, `cloudMapsDiagnostics`, `mapsConnection`) —
   `legacy/maps/check-maps-refinement.mjs:22-41`. Renaming those exports or moving those files breaks them.
5. `javac` of production Java under `android/app/src/main/java/ai/alphacompute/alphaphone/` with harness classes in
   the same package (`refinement/native/java.mjs:10,47`), so package-private members are part of the contract.
6. esbuild bundles of real modules and `tsImport` (5 files) — depend on export names only (the robust style).

**Consolidate/delete while keeping live models passing.** (a) delete aggregates or per-model wrappers; (b) remove
`legacy` after relocating the 3 shared pieces (§3); (c) merge 6 audit twins; (d) move 32 upstream-only models behind an
`upstream.lock.json` trigger; (e) drop `typecheck`-style repetition — `check` already runs `test` then `run` per model
(the audit's K1 note); run models with bounded concurrency (`--server-endpoint` already supports isolation);
(f) lower `test/quint-checker.test.mjs` floors accordingly.

## 9. LemmaScript details requested

- Inventory: `LemmaScript-files.txt` lists 23 files under `apps/app/src` (7 browser, 5 prototype, 10 runtime, 1 root).
  Verified functions (from `.dfy.gen`): e.g. `surfaceIdleForView`, `retryDelayForCount` (browser-poll), `editReceiptSettled`,
  `deletionSettled`/`settledDeletionsToTrim`, `noticeRoute`/`retainDismissed`, `admitVideoChunk`, `videoClockParts`,
  `triggerTickPlan`, `firstCalendarDayOf`, `flickSpan`/`clampSheetHeight`/`chatRelease`, `noticeCurrent`/`captureUnchanged`,
  `recordingClockParts`, `updateCheckDue`/`updateIdle`/`settingsNavigationRows`, `canvasScale`/`canvasTop`,
  `resolveCloudEnvironmentCore`, `finiteWaitSeconds`, `newestWithinBudget`, `digestTapNotice`, `coalesceDelay`,
  `regressedReceipt`, `residentBootStateLost`, `deniedSettingsChoice`, `tapRecheck`, `startupPermissionsActiveCore`/`lateReadyNotice`.
- What `lemma:check` runs (`check-lemma.ts`): validates the list (paths must match `^apps/app/src/…\.ts$`, line 42), requires
  a `//@ verify` in each (43), refuses any `//@` annotation in an *unlisted* `apps/app/src` file (55-59), refuses
  `//@ assume` / `assume` / `{:axiom}` (72), runs `lsc extract` per file and requires every contract line to be read
  (73-78), `lsc gen-check --backend=dafny` and **fails if any `.dfy`/`.dfy.gen` would change** (81-88), then
  `lsc check` with Dafny 4.11.0 and requires one "verified, 0 errors" line per file (99-101). ~10 s in CI.
- Constraints on refactoring those 23 files: (1) editing an annotated function body or its `//@` lines requires
  `npm run lemma:regen` and committing both `specs/lemma/<path>.dfy` and `.dfy.gen`; (2) moving/renaming a file means
  moving both companions and editing `LemmaScript-files.txt`; (3) splitting an annotated function out of a large file
  (`prototype/settings-adapter.ts` 1,281 lines, `chat-overlay-motion-adapter.ts` 973, `note-recorder.ts` 573) changes the
  generated module and needs regeneration; (4) annotated functions must stay inside the LemmaScript TS subset (pure,
  no closures over mutable state, number treated as int unless `//@ type x real`); (5) hand-written lemmas in the 8
  non-identical `.dfy` files (`context-selection`, `notifications`, `settings-adapter`, `hosted-digests`,
  `workflow-triggers`, `journal-retention`, `workflow-device-contract`, `canvas-geometry`) reference function names
  and must be renamed with them; (6) `lsc` 0.6.6 and Dafny 4.11.0 are pinned exactly (`check-lemma.ts:52,93`).
- CI placement: run only when one of the 23 files, `specs/lemma/**`, the inventory or config changes; it is cheap, so
  keeping it in the static lane is also fine. Delete `lemma-check.yml`.

---

## 10. Open questions / risks (owner decisions)

1. Is the required-check ruleset actually installed (`browser.yml:237` says no)? If not, nothing currently blocks merges,
   and the matrix can be changed freely; if yes, renaming jobs needs a coordinated ruleset change.
2. Keep `develop`? If yes, should the main→develop sync PR be gated at all?
3. Is historical evidence (`specs/quint/legacy`, historical MMS counterexample witnesses, upstream TLA+ conversions) still
   wanted? It is the single biggest delete and removes the network fetch from verify.
4. Should upstream-only models move upstream (AGENTS.md: shared changes belong upstream)?
5. Should `resident-android` build on every main push (3 h, never green) or only on dispatch / release?
6. Keep formal refinement as per-PR gating at all, or run it nightly against main with a path-selected PR subset?
7. Release workflows (`release-app-signing.yml` "closed signing proof", `release-custody-proof.yml`) — one-off proofs
   or recurring? They were run 2 times each.
8. `publish-qualified-app-update.yml:132` asserts `runtimeProfile == 'cloud'` while `resident-android.yml:387` writes
   `runtimeProfile: 'native'` into producer evidence — confirm which producer the publication path is meant for
   (suspicion; not traced further).
9. Text-anchored harnesses (§2.6) will fail on the first structural refactor of `agent-adapter.ts`, `main.tsx`,
   `model.js`, `connection-ui.tsx` or the Android plugins. Decide up front whether refactors may delete such harnesses
   and their models, or must port them to exported-function imports first.
