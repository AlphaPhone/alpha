# Host test suite audit (`test/`, excluding `test/browser/`)

Scope: `test/*.test.mjs|ts` (1004 files, 75,757 lines), `test/support/` (5 files, 909 lines),
`test/fixtures/` (204 files: 86 JS helpers about 5.5k lines, 127 Java fixtures/stubs about 7k lines, 7 `.qnt`),
`test/own-provider/` (3 Java files) and the 12 `test/*.py` files those tests spawn (2.4k lines).
Read-only research. The appendix holds the full per-file table.

Method and confidence:
- I opened and read about 125 test files (marked `[read]` in the table): roughly 70 end to end and the rest
  through their harness and first 25 to 60 lines. They cover every filename prefix and every bucket. I also
  read the helpers in `test/support/` and `test/fixtures/` (`jvm-tools`, `kotlin-tools`, `source-text`,
  `ts-source`, `strip-types`, `child-suite`, `wait-for`, `cloud-voice-view`, `native-source`, `calendar-sync-snapshot-jvm`),
  the runner `scripts/run-node-tests.ts`, and the refinement plumbing in `specs/quint/refinement/{check-traces,application/support}.mjs`.
- I classified the other files with a feature extractor plus hand-made rules. It looks at imports, `readFileSync`
  of source, `indexOf`/`slice`, `stripTypeScriptTypes` or `new Function` or `vm`, esbuild `onResolve`/`onLoad` stubs,
  `javac`/`runJvm`, child processes, HTTP/sqlite/git, and calls into `specs/quint` drivers. On a random check of 14
  unread files, 12 landed in the right bucket. I put **overall bucket accuracy at about 85%**. The A versus C and
  B versus C splits are the least reliable: many files mix them. The `+A` flag marks any file outside bucket A that
  still has three or more source-text assertions.
- Every "unused" claim was checked with `git grep` across the whole repository, excluding `vendor/`.

---

## 1. Area overview

`npm test` runs `scripts/run-node-tests.ts`, which calls
`node --test --test-concurrency=4 --test-timeout=600000 test/*.test.mjs test/*.test.ts` (`scripts/run-node-tests.ts:13-14`).
`npm run verify` runs it after `quint:check` and `lemma:check` (`package.json:18`). CI runs `verify` in
`browser.yml` (job "Repository verification", `timeout-minutes: 180`, with the comment *"Clean runs measured
70-115 minutes on main"*, `.github/workflows/browser.yml:31-34`) and again in `android.yml` on
`workflow_dispatch` (`android.yml:82`).

The suite is not one kind of test. It is about five different harnesses that share a directory:

| primary bucket | files | lines | what it is |
|---|---:|---:|---|
| E Quint refinement/conformance | 303 | 6.7k | Mostly 5-to-40-line wrappers. Each calls one driver in `specs/quint/refinement/**` (572 files, about 12k lines in `native/` alone). The driver generates ITF traces with the Quint CLI and replays them against real source that is transplanted (stripped, vm-evaluated or esbuild-stubbed) or javac-compiled. 4 aggregate files re-run every campaign. |
| C source transplant | 268 | 29.0k | Slices a source file between two text markers, or strips its types or rewrites its imports, then evaluates it in `vm`/`new Function`/`data:` URL with 5 to 30 fake globals. Includes esbuild "stub map" bundles and the `cloud-voice-view` vm fixture family. |
| B unit with stubs | 150 | 11.9k | Imports one real module (directly, through `tsImport`, or as a plain esbuild bundle) and drives it with fake ports. 38 of these are single-Java-class host-JVM tests. |
| F tests of tooling | 131 | 14.8k | Tests of `scripts/` build, release, AOSP and CI tools (often with real git, fs and child processes), Python unittests, and tests of the test helpers themselves. |
| D genuine integration | 107 | 11.1k | Multi-class javac runs against staged patched-native sources, real HTTP servers, real sqlite, real Bun or the prepared SDK, real Chromium from node:test. |
| A source-text assertion | 23 | 1.8k | Pure regex over source, manifests, workflows, or other test files. |
| G other | 21 | 0.5k | Wrappers that only run `scripts/test-*.ts` child suites (93 such scripts, 10.4k lines, live in `scripts/`), plus upstream suites re-run from here. |

Source-text assertions are far more common than bucket A alone suggests. **223 files have three or more regex or
`includes` assertions on source text** (23 pure A plus 200 flagged `+A`). 232 files slice source with `indexOf`
after `readFileSync`. 217 evaluate code through `vm` or `new Function`. 66 import a `data:text/javascript` module
built from rewritten source.

Cross-tree coupling: 134 files in `specs/` import from `test/fixtures` or `test/support`. 21 files in `scripts/` do
too, including the production tool `scripts/feature-manifest.ts`, which imports `test/support/feature-parity.mjs`.
In the other direction, 27 test files only exist to run `scripts/test-*.ts`.

---

## 2. Pattern taxonomy

### P1. Marker-slice transplant ("cut the function out of the file and eval it")
**What it looks like.** The test finds a function by `indexOf('  async function refresh() {')`, cuts up to the next
marker, strips types, and runs it in `vm` with every free variable faked.
- `test/cloud-plan-cancel.test.mjs:7-11`: `text.indexOf('        const plan=connectionController.residentPlanSettings();')` up to `"        page.groups.push(group([{...connectionHelpRow()"`, then `vm.runInNewContext(source,box)` with a 20-key box.
- `test/connection-work-lifecycle.test.mjs:3-4`: `source.indexOf('async function work(')` up to `'\n/** '`, run with 15 fake globals (`residentRecoveryReason`, `runQueuedResidentRebind`, ...).
- `test/resident-auto-retry.test.mjs:3-5`: slices `connection-ui.tsx` from `'const RESIDENT_AUTO_RETRY_MS'` to `'\n/** Start (or restart) the resident.'`.
- `test/connection-presentation-state.test.mjs:9-16`: concatenates **five** sliced sections of `connection-ui.tsx` into one vm context (1012-line test).
- `test/pending-action-background-recovery.test.mjs:6-9`: `transformSync` of an `agent-adapter.ts` slice, then `new Function('connectionController','alphaClient','document','setTimeout',...)`.
- `test/settings-refresh-text-scale.test.mjs:7-11`: slices `refresh()` from `settings-adapter.ts`, about 25 faked names.
- `test/workflow-canonical-notes.test.mjs:3-6`: slices an `if (...)` **block**, not even a function, and wraps it in `(async function(){...})`.

**Variant: the slice is of an exported function.** `test/settings-text-scale-settlement.test.mjs:7-10` slices
`export function textScaleSettlement(` by text instead of importing it. **39 files** slice an `export function|class|const` this way.

**Variant: regex extraction of JSX callbacks.** `test/settings-signout-confirm.test.mjs:8-9` regex-matches two
`onClick={()=>...}` arrow functions out of `connection-ui.tsx` and evaluates them. `test/voice-recovery-state.test.mjs:7` does the same for `onState`/`onError` in `voice-adapter.ts`.

**Variant: Java method transplant.** `test/home-role-recovery-contract.test.mjs:6-9` regex-extracts `showsHome()` from
`MainActivity.java` into a generated Java class. Line 14 even falls back through reflection to *an older*
`onLoss` signature (`catch(NoSuchMethodException old)`). `test/resident-start-failure-policy.test.mjs:3-4` brace-matches a method out of `AlphaLocalAgentPlugin.java`.

**Why it hurts.** It tests a copy that has lost its module scope, so any refactor (rename, reorder, comment move,
extracting a helper) breaks the test without any behaviour change. The real wiring between the fragment and the
rest of the module is the part most likely to be wrong, and it is never exercised. It also pushes source code
toward "sliceable" shapes.

**How widespread.** About 230 files (C bucket plus the C side of E drivers). Files most often sliced:
`connection-ui.tsx` (81 test files), `AlphaLocalAgentPlugin.java` (40), `agent-adapter.ts` (34), `prototype/model.js` (26),
`settings-adapter.ts` (25), `template.html` (25), `local-agent.ts` (21), `voice-adapter.ts` (17).

**Treatment.** Delete. Where the behaviour matters, cover it with an area integration test that imports the real
module, or with an existing Playwright spec. **Risk:** some guards (stale epoch, owner change) are only covered here.
Before deleting a cluster, list its scenario names and check each against `test/browser/*` or the planned integration suite.

### P2. Source regex as contract ("source-level guard")
**What it looks like.** `assert.match(readFileSync(x), /exact code shape/)`. Comments often admit it: *"Source shape only"*
(`test/conversation-history-refresh.test.mjs:7`), *"Source-level guards ... keep the privacy invariants from regressing
between device runs"* (`test/browser-web-features.test.mjs:5-8`), *"they stop the source drifting back while no emulator run exists"* (`test/gesture-zones-single-instance.test.mjs:7-8`).
- `test/live-asr-route-token.test.mjs:10`: `assert.match(source, /static String routeToken\(String path,String session\)\{return path\.startsWith\(.../)` matches a whole Java line, whitespace included.
- `test/renderer-recovery-budget.test.mjs:15-21`: counts occurrences of `recoveryBudget.onLoss(` and the order of `indexOf`s in `MainActivity.java`.
- `test/native-deletion-admission.test.mjs`: 40 regexes over the **vendor** `DeferredDeletionCoordinator.java`.
- `test/serial-storage-tasks.test.mjs:17-26`: regexes `AlphaConnectionPlugin.java` for `workers = Executors\.newFixedThreadPool\(4\)`.
- `test/accessibility-coverage.test.mjs:22-45`: 108 assertions over the **text of the Playwright specs** (`test/browser/accessibility-states.ts`), meaning a test of other tests.
- `test/system-bar-appearance.test.mjs:18-19`: regex on `main.tsx` and `AlphaDevicePlugin.java` after two real behaviour tests.
- `test/ci-required-checks.test.mjs:39-40`: regex over `.github/workflows/browser.yml` step text.
- Wallet: `test/wallet-disabled.test.mjs:46-48` matches `startPay: \(\) => api\.toast\('Not connected'\)` in `data-adapter.ts`.

**Why it hurts.** It pins formatting, not behaviour. It fails on harmless refactors and passes on real regressions
(code moved behind the matched line). It doubles maintenance, because every change edits both source and regex.
This is exactly what the owner has asked to remove.

**How widespread.** 23 pure files plus 200 mixed (`+A`). Inventory-style support files make it worse:
`test/support/feature-parity.mjs` (636 lines) and `test/support/login-surfaces.mjs` (216 lines) are prose inventories
asserted against source.

**Treatment.** Delete. A few invariants are real release gates: no NFC/wallet permission, no `QuickAccessWalletService`,
licences, release signers, manifest orientation. Those belong in an existing build-output audit
(`scripts/audit-production-bundle.ts`, `scripts/verify-apks.ts`) that checks the **built artifact**, not the source.

### P3. Thin per-model Quint wrappers plus aggregate re-runs (duplicated execution)
**What it looks like.** 290 `quint-*.test.mjs` files of 5 to 40 lines each call one driver and assert receipt
counts (`traces === 24`, `checkpoints === 134`). Four aggregate tests then run the same campaigns again:
- `test/quint-application-refinement.test.mjs:7-9`: `runApplicationRefinement()` with `{timeout: 2400000}`. The comment says *"The complete aggregate exceeded 20 minutes"*.
- `test/quint-services-refinement.test.mjs:11`: `runServicesRefinement()`, also 2400 s.
- `test/quint-native-refinement.test.mjs:8`: `runNativeRefinement()`, also 2400 s.
- `test/quint-composition-refinement.test.mjs:5`: 600 s.
- `specs/quint/refinement/application/index.mjs:99,149` imports and runs `checkAccessibleToastLifetime`, which `test/quint-accessible-toast-lifetime.test.mjs:3,6` also runs. `services/index.mjs:26,87` runs `runInboxCleanupRefinement`, which `test/quint-inbox-cleanup.test.mjs:8` also runs.

**Measurement.** Matching the driver modules each per-model test imports against the four `index.mjs` aggregators
shows **about 185 per-model files whose campaign also runs inside an aggregate** (a few matches are tooling false positives).
Local receipts in `test-results/quint-refinement/*.json` (401 receipts) record about 1,141 s of replay time alone,
before trace generation and compilation. So every `npm test` spends that twice.

**Why it hurts.** It is the largest avoidable CI cost in the host suite. It also creates 290 files that each encode
magic counts, which change whenever a model gains a step.

**Treatment.** Pick one mechanism. Recommended: **one manifest-driven runner** (`test/quint-refinement.test.mjs`) that
reads `specs/quint/*/manifest.json` and registers one `test()` per model. Changed-path selection
(`scripts/ci/affected.ts` / `quint:changed`) can then pass `--test-name-pattern` or a model filter. Delete the 4
aggregates and the 290 wrappers. **Risk:** wrappers assert model-specific extras (`quint-legacy-maps-refinement.test.mjs:15-18`
pins 6 expected mismatch IDs; `quint-calendar-agent-selection.test.mjs:13-18` mutates source to prove the replay fails).
Move those into the driver receipts or the manifest.

### P4. Subprocess indirection ("child suite", "self re-exec", "node -e")
- **Child suites**: 27 test files only spawn `scripts/test-*.ts`. `test/adapter-contracts.test.mjs:4-21` spawns **26 separate `node --import tsx` processes**. `test/batch-progress-stream.test.mjs:1` is the single line `import '../scripts/test-batch-progress-stream.ts';`. The real tests (93 scripts, 10.4k lines) live in `scripts/` under a `test-` prefix.
- **Self re-exec under tsx**: 24 files start with `if(!process.execArgv.some(...'tsx'))spawnSync(process.execPath,['--import','tsx',process.argv[1]])` (`test/quint-approval-decision.test.mjs:4-7`, `test/managed-calendar-broker-read-header.test.mjs:7`, `test/browser-cloud-dev-bridge.test.mjs:10`). Node 26 already strips types. The remaining need is parameter properties and enums, which `test/support/strip-types.mjs` handles with esbuild.
- **`node -e` inline programs**: 31 files embed a whole test program in a template string and run it with `spawnSync(process.execPath,['--input-type=module','-e',`...`])` (`test/quint-inbox-cleanup.test.mjs:6-20`, `test/quint-workflow-tasks-refinement.test.mjs:6-21`, `test/home-overview-cards.test.mjs:14`). Assertions inside the string are not seen by node:test.
- `test/fixtures/child-suite.mjs:5-6` and five inline copies all do `delete env.NODE_TEST_CONTEXT`.

**Why it hurts.** Each spawn adds a cold tsx and esbuild start (about 0.5 to 2 s). Failures surface as one opaque
`status 1` with captured stderr. Name filtering does not reach inside. The child process scripts sit outside the
`test/` glob, so they need wrappers to exist at all.

**Treatment.** Move the `scripts/test-*.ts` bodies into `test/<area>.integration.test.ts`. Drop self re-exec where
native stripping works, and otherwise run the whole suite with `--import tsx` once in `run-node-tests.ts`.

### P5. Testing pinned upstream code from this repository
- `test/maps-navigation.test.mjs:14` runs upstream `plugins/plugin-maps/test/navigation-client.test.mjs`.
- `test/login-surfaces.test.mjs:358` runs `vendor/eliza/plugins/plugin-native-browser-surface/test/native-host/policies.node.mjs`.
- `test/native-live-pcm.test.mjs:7-13` runs **upstream** `LiveSegmentPipeTest.java`/`BufferedStreamExchangeTest.java` fixtures.
- `test/calendar-agent-write-host.test.mjs:3` imports `vendor/eliza/plugins/plugin-calendar/src/service/managed-calendar-host.ts` and unit-tests it.
- `test/maps-route-distance.test.mjs:4` tests `distanceToRoute`, an upstream function re-exported by Alpha.
- `test/google-browser-auth.test.mjs:21-48` keeps **forked copies of upstream tests** in `test/fixtures/google-browser-auth/` with sha256 pins of the upstream originals (`upstream-base.json`).

61 test files import `vendor/eliza` or `.eliza/` modules, and 92 read vendor source text. AGENTS.md says shared
changes belong upstream, so tests of shared code belong upstream too. **Treatment:** delete the upstream-only cases.
Keep only tests that exercise Alpha's ports into upstream code.

### P6. Hand-rolled host JVM harness (javac per test)
- 70 files call `javac` directly with their own `mkdtemp`/`rmSync`/classpath (`test/sms-action-journal.test.mjs:3`, `test/hosted-notice-withdraw.test.mjs:10-14`, `test/serial-storage-tasks.test.mjs:10-14`). 54 use the shared `runJvm` (`test/fixtures/jvm-tools.mjs:49-56`).
- 7 files resolve `JAVA_HOME` themselves and bypass `jvmSkip` (`test/accessibility-visible-bounds.test.mjs:11`, `cloud-voice-profile`, `cloud-voice-limit`, `digest-pending-storage`, `cloud-sign-in-network`, `maps-notification-open`, `login-surfaces`).
- 61 files embed whole Java test classes in JS template strings (`test/home-role-recovery-contract.test.mjs:8-9,14`, `test/photos-library-patch.test.mjs:44-54`).
- 127 Java fixtures and Android stub trees (`test/fixtures/app-update-jvm/android/...`, `reviewed-copies-jvm/`, `scoped-calendar-jvm/`, `secure-store-memory/`, `android-stubs/`) re-declare Android framework classes per test family.

**Why it hurts.** Each test recompiles its classes (60 to 120 s timeouts), Android stubs drift between families,
and none of this runs where Android developers expect it (Gradle `test`). **Treatment:** move the JVM tests into a
Gradle JVM test source set with one shared stub set. Group them by native area, roughly 8 suites. Delete the
method-transplant variants (P1).

### P7. Kill-switch environment knobs that nothing sets
22 tests read a source path from an environment variable. For example,
`process.env.ALPHA_CONNECTION_SOURCE||'apps/app/src/runtime/connection-ui.tsx'` (`test/connection-work-lifecycle.test.mjs:2`),
`process.env.SETTINGS_SOURCE||...` (`test/cloud-plan-cancel.test.mjs:7`), `process.env.CONTROLLER_SOURCE` and `ALPHA_ACK_VIEW_SOURCE`.
`git grep` outside `test/*.test.*` finds **no setter** for 20 of the 27 names (`ALPHA_ACK_AGENT_SOURCE`,
`ALPHA_AGENT_ADAPTER_SOURCE`, `ALPHA_BROWSER_ADAPTER_SOURCE`, `ALPHA_CONNECTION_SOURCE`, `ALPHA_PRESENTATION_SOURCE`,
`ALPHA_READINESS_SOURCE`, `ALPHA_RECEIPT_SOURCE`, `ALPHA_RESTORE_SOURCE`, `ALPHA_SETTLEMENT_SOURCE`, `ALPHA_SHELL_MODEL_SOURCE`,
`ALPHA_SPEECH_HANDOFF_SOURCE`, `ALPHA_SYSTEMUI_TEST_SOURCE`, `ALPHA_TEST_SDK_SOURCE`, `ALPHA_VOICE_ADAPTER_SOURCE`,
`CONTROLLER_SOURCE`, `REQUIRED_SOURCE`, `SETTINGS_SOURCE`, and others). They look like leftover hooks from ad-hoc mutation
runs. **Treatment:** delete them along with the transplant tests. `ALPHA_SYSTEMUI_TEST_SOURCE` gates
`test/aosp-listener-systemui.test.mjs:45`, a test that therefore **never runs** anywhere.

### P8. Magic-count assertions
Wrappers pin exact counts from generators: `assert.equal(receipt.traces, 24); assert.equal(receipt.checkpoints, 134)`
(`test/quint-agent-calendar-mutation.test.mjs:11-12`), `assert.equal(Object.keys(catalog.ic).length,148)`
(`test/canonical-icons.test.mjs:21`), `assert.ok(subviews.length >= 25)` (`test/accessibility-coverage.test.mjs:47`).
They fail on additive change and prove nothing about correctness. Drop them in the consolidated runner.

### P9. Test-of-test-infrastructure
- `test/strip-types-compat.test.mjs` tests `test/support/strip-types.mjs`.
- `test/test-helpers.test.mjs` tests `fixtures/source-text.mjs` and `child-suite.mjs`.
- `test/node-test-runner.test.mjs` copies the 18-line `run-node-tests.ts` into a temp repo to test flag forwarding.
- `test/workflow-device-bindings-fixture.test.mjs` asserts that the vm fixture installs every import of `connection-ui.tsx`.
- `test/voice-fixture-failure-metadata.test.mjs` tests a diagnostic wrapper.
- `test/quint-refinement-harness.test.mjs` and `quint-state-inventory.test.mjs` test refinement plumbing.

These exist only because P1 and P3 exist. Delete them together with the harnesses, but keep quint tooling tests if the refinement runner stays.

### P10. Scenario test plus replay twin over the same transplanted harness
About 25 `test/fixtures/*.mjs` harnesses are used by exactly one host test **and** by a `specs/quint` driver.
Examples: `appearance-preference.mjs`, `reminder-open-intent.mjs`, `retained-reminder-tap.mjs`, `scheduled-task-controls.mjs`,
`shade-notice-question.mjs`, `first-send-draft-migration.mjs`, `chat-attachment-composer.mjs`, `use-in-email-review.mjs`,
`workflow-clock-admission.mjs`, `previous-notes-source-opening.mjs`, `browser-external-handoff.mjs`. So the same
transplanted code is covered by a hand-written scenario file and by a model replay (for example
`test/reminder-open-intent.test.mjs` and `test/quint-...` through `specs/quint/refinement/...`). Keep at most one.

### P11. Python tests behind JS wrappers, some run twice, some never
- Wrappers that only spawn one Python file: `test/packaged-runtime.test.mjs`, `aosp-apk-preparation.test.mjs`, `cloud-signing-input.test.mjs`, `resident-crash-diagnostics.test.mjs`, `qualified-app-update.test.mjs`. `test/python-suites.test.mjs` already exists as a collector.
- `test/resident-crash-diagnostic.test.py` runs in `python-suites.test.mjs:27` **and** in `.github/workflows/resident-android.yml:245`.
- **Orphans:** `test/update-channel-gradle.test.py` has no runner (`git grep update-channel-gradle` returns nothing). `test/aosp-fresh-presets.test.py` is only named in `android/aosp/branding/provision/README.md:72`.

### P12. Real Chromium launched from node:test
`test/fixtures/calendar-mounted-editor.mjs:6,273` and `test/fixtures/modal-scrim-chromium.mjs:5,29` call
`chromium.launch()` inside the host suite (used by `calendar-mounted-*.test.mjs` and `modal-scrim-ownership.test.mjs`).
That is browser e2e work hidden in the unit runner, and it forces `npx playwright install chromium` in the verify job
(`browser.yml`, step "Install browser for source-refinement checks"). Move these to `test/browser/`.

### P13. Toolchain provisioning inside test fixtures
`test/fixtures/kotlin-tools.mjs:37-38` downloads Kotlin compiler jars with `curl` from Maven Central and verifies them
against `android/gradle/verification-metadata.xml`. CI calls it as a setup step (`browser.yml`, `android.yml`:
`node test/fixtures/kotlin-tools.mjs --prepare`). `jvm-tools.mjs:25-27` scrapes `~/.gradle/caches` for `org.json`.
These are CI provisioning scripts placed under `test/fixtures`.

### P14. Defensive "never skip on CI" toggles
`test/fixtures/jvm-tools.mjs:40-44`: `jvmSkip()` returns `false` whenever `process.env.CI` is set, so CI fails instead of skipping.
SDK-backed tests use a parallel opt-in (`ALPHA_REQUIRE_PREPARED_SDK`). The result is two different skip policies,
plus about 15 ad-hoc `skip:` expressions (see section 5).

---

## 3. Duplicate coverage clusters

| cluster | files | evidence | proposal |
|---|---|---|---|
| Quint aggregate versus per-model | 4 aggregates and about 185 wrappers | P3: `application/index.mjs:149` lists `checkAccessibleToastLifetime`, which `quint-accessible-toast-lifetime.test.mjs` also runs | one manifest runner |
| Exact copy | `photos-native-order.test.mjs` and `photos-library-patch.test.mjs` | Same test title *"NewestNeverDropped: the permitted catalog pages every volume..."*. Line overlap 0.96 (43 of 45 long lines): `photos-native-order.test.mjs:20-57` matches `photos-library-patch.test.mjs:35-73` | delete `photos-native-order.test.mjs` |
| Permission coordinator, two drivers | `quint-permission-choices`, `quint-permission-coordinator-refinement` | Same test title *"actual permission coordinator traces refine the bounded walkthrough model"*. 12 of 12 scenario names in the latter appear in the former | merge |
| Password manager trio | `password-manager`, `-hidden`, `-fences` | Each builds its own esbuild stub map of `password-manager.ts`. `-hidden` and `-fences` share 49% of long lines | one integration file |
| Text scale quartet | `settings-refresh-text-scale`, `settings-text-scale-refresh`, `settings-text-scale-settlement`, `quint-native-text-scale-lifecycle` | Three slices of `settings-adapter.ts` plus a model replay of the same flow | one settings integration |
| Cloud sign-in five | `cloud-sign-in-{flow,state,network,late-readiness,readiness-retry}` plus `quint-signin-refinement` and `quint-legacy-sign-in-refinement` | All slice `connection-ui.tsx` or replay the same sign-in model. The browser has `cloud-account-panel`, `browser-cloud-bootstrap`, `connection.production` | one connection integration |
| Agent Calendar mutation | `agent-calendar-mutation.test.mjs` (child suite) and `quint-agent-calendar-mutation.test.mjs` | Same controller ("serializes writes and releases failed preservation checks") | keep the replay or the scenario, not both |
| Host versus Playwright with the same name | 23 pairs: `canonical-notes-draft-copy`, `calendar-end-after-start`, `canonical-icons`, `context-selection`, `live-voice`, `password-manager`, `photos-pending-read`, `post-sign-in-setup`, `resident-recovery`, `scan-event`, `scan-page-camera`, `settings-truth`, `voice-assistant`, `voice-composer-recovery`, `voice-timing`, `mail-preview`, `own-provider`, `agent-camera-capture`, `calendar-availability`, `local-agent-native-stream`, `voice-fixture-failure-metadata`, `quint-maps-event-return`, `quint-voice-owned-navigation` | `test/canonical-notes-draft-copy.test.mjs:19-37` and `test/browser/canonical-notes-draft-copy.spec.ts:4-41` run the same refusal-then-success copy scenario. Several host files cross-reference their spec (`calendar-end-after-start.test.mjs:6`, `canonical-icons.test.mjs:6`) | default to the Playwright spec; delete the host twin unless it covers a native-only path |
| Scenario plus replay twins | about 25 (P10) | same transplanted harness | keep one |
| Voice view family | about 40 files on `cloud-voice-view.mjs`/`shared-batch-voice.mjs` (`pixel-spoken-acks` at 1679 lines and 90 tests, `voice-calm-cloud-errors`, `voice-replies`, `private-preview-cartesia-route`, `cloud-streaming-conversation`, ...) plus `voice-assistant.test.mjs` (918 lines) plus 12 `quint-*speech*/voice` | All drive the same vm-transplanted voice views | one voice integration of roughly 3 to 5 files |
| Python suite run twice | `resident-crash-diagnostic.test.py` | `python-suites.test.mjs:27` and `resident-android.yml:245` | run once |

---

## 4. Slowest and most expensive tests

No per-test timing is recorded. Evidence comes from declared timeouts, refinement receipt durations and the CI job runtime.
- Declared budgets: `quint-application-refinement`, `quint-native-refinement`, `quint-services-refinement` at **2400 s each**.
  `quint-composition-refinement`, `quint-resident-refinement`, `quint-cloud-connection-notices` and `secure-store-memory`
  (660 s total) at 600 s. About 20 more quint wrappers at 300 to 420 s. `google-browser-auth.test.mjs` at 360 s (it runs the upstream suite twice).
- Receipt replay times (`test-results/quint-refinement/*.json`, `finishedAt - startedAt`): `NativeRequestWithdrawal` 51 s,
  `SavedSignInRecovery-forward-replay` 37 s, `NativeGmailBackground` 26.5 s, `TaskSchedulerRuntime` 24 s, `BrowserJournalRetention` 24 s,
  `PermissionChoicesCoordinator` 20 s. That is 1,141 s across 401 receipts, excluding trace generation and javac.
- Structural costs: about 70 javac compilations, 26 child processes in `adapter-contracts` alone, 37 tsx child spawns,
  24 self re-execs, 31 `node -e` programs, 2 Chromium launches, the Bun SDK collector runs, and Kotlin compilation.
- Whole job: `verify` takes 70 to 115 min on clean `main` (`browser.yml:31-33`). It runs on every change selected by
  `changes.outputs.verify`. Path-based selection inside `npm test` does not exist: the full 1004-file glob always runs.

---

## 5. Skipped and conditional tests

| condition | files | behaviour |
|---|---|---|
| `jsonJarSkip` / `jvmSkip('json'|'javac'|'sqlite3')` | about 60 tests | skip locally without JDK, org.json or sqlite3. **Never skip when `CI` is set** (`jvm-tools.mjs:41`) |
| `ALPHA_REQUIRE_PREPARED_SDK` / `ALPHA_CLOUD_COLLECTOR_SOURCE` + `ALPHA_BUN` | `calendar-managed-rejection:23`, `cloud-resident-full-profile:90`, `cloud-resident-embedding-route:12`, `development-cartesia-conversation:202` | skip unless the SDK is prepared. The verify job sets `ALPHA_CLOUD_COLLECTOR_SOURCE` (`browser.yml` "Prepare pinned SDK"). Android sets `ALPHA_REQUIRE_PREPARED_SDK` only on `workflow_dispatch` |
| `ALPHA_ELIZA_SOURCE` | `cloud-sdk-routing.test.mjs:9` | skip unless set |
| `ALPHA_SYSTEMUI_TEST_SOURCE` | `aosp-listener-systemui.test.mjs:45` | **never set anywhere, so permanently skipped** |
| `vendor/eliza not checked out` | `camera-capture-mode-patch:10`, `clock-repeat-days:33`, `owned-captures-legacy-path:14`, `photos-native-order:20`, `files-agent-patch:16`, `photos-library-patch` (6 tests) | defensive. The submodule is a hard requirement (README), so the skip should go |
| Android SDK / build-tools 36 / API36 / Capacitor sources | `photos-library-patch:97`, about 6 `t.skip(...)` in AOSP and tile tests | skip on hosts without the SDK, which includes the verify job (no Android SDK installed in `browser.yml` verify) |
| `noGroovy` / `noGrpc` | `python-suites.test.mjs:28-29` | skip without a Gradle distribution or Python grpc |
| staged runtime absent | `wallet-disabled.test.mjs:101` | `t.skip('no staged resident runtime ...')`, which always skips in verify |
| `process.platform` | `sense-packaging-ndk`, `voice-host-absent-admission` | platform-gated |

Point to verify: the verify job in `browser.yml` installs no Android SDK. So every "Android SDK/API36" conditional
test skips in CI, and its only coverage is the Gradle build itself.

---

## 6. Duplicated helpers

| helper | locations | proposed home |
|---|---|---|
| Type stripping with esbuild fallback | `test/support/strip-types.mjs:1-12` and `test/fixtures/ts-source.mjs:1-13` are **byte-for-byte the same function**. 47 more files import `stripTypeScriptTypes` straight from `node:module` | delete with P1. If anything remains, keep one |
| esbuild "source module" loader (`build` then `data:` import) | `test/quint-conformance.test.mjs:11-15`, `specs/quint/refinement/application/support.mjs:32-42` (`sourceModule`/`bundledSource`), `specs/quint/refinement/services/inbox-workflows-model-traces.mjs:118-136`, `test/google-maps-content.test.mjs:5-8`, `test/password-dev-editor.test.mjs:4-5`, plus about 60 inline `data:text/javascript;base64` constructions | one `loadModule(path,{stubs})` helper, or simply real imports |
| Section slicer (`section`/`part`/`slice`/`between`/`body`/`method`/`located`) | 47 files with local copies (`connection-presentation-state:9`, `conversation-history-refresh:5`, `native-deletion-admission:10`, `photos-native-order:16`, `resident-start-failure-policy:3`, `chat-transcript-window:11`) plus `fixtures/source-text.mjs:3` | delete with P1 and P2 |
| `deferred()` | 18 files define their own, and `fixtures/wait-for.mjs:7` exports one | `Promise.withResolvers()` (Node 26) |
| `flush`/`tick`/`settle` microtask spinners | 17 `flush` and 27 `tick` local definitions. `fixtures/wait-for.mjs:1-2` documents why microtask spins are unsafe | one `waitFor` |
| Fake clock | `voice-assistant.test.mjs:11-27` (`fakeClock`) and `fixtures/shared-batch-voice.mjs` (`voiceFakeClock`) | node:test `mock.timers` |
| javac/java runner | 70 inline `execFileSync(javaBinary('javac'),...)` with their own mkdtemp/rm, versus `runJvm` in `jvm-tools.mjs:49`, `calendar-sync-snapshot-jvm.mjs:9-19`, `specs/quint/refinement/native/java.mjs` | Gradle JVM test task |
| `JAVA_HOME` resolution | `jvm-tools.mjs:20-23` plus 7 local copies (P6) | `jvm-tools` |
| `read`/`root` path helpers | 119 files define `const read=...` / `const root=...` | n/a after consolidation |
| Child-process wrapper deleting `NODE_TEST_CONTEXT` | `fixtures/child-suite.mjs:3-9` plus 5 inline copies (`adapter-contracts.test.mjs:15-16`, `google-browser-auth.test.mjs:40`, ...) | gone once child suites move into `test/` |
| Android framework stubs | `test/fixtures/{app-update-jvm,reviewed-copies-jvm,scoped-calendar-jvm,android-stubs}/android/**` each re-declare `android.net.Uri`, `android.content.Context` and others, plus the shared `vendor/eliza/plugins/plugin-native-calendar/test/jvm/android` (`calendar-sync-snapshot-jvm.mjs:12`) | one stub set |
| Synthetic IDs | `'11111111-1111-4111-8111-111111111111'` and others repeated across `browser-cloud-dev-bridge`, `power-launch-state`, `native-google-*` | small `test/fixtures/ids.mjs`, if kept |
| `cloudVoiceViewFixture` "viewFixture" wrappers | `pixel-spoken-acks.test.mjs:18` and siblings each wrap it with `f.box.Error=Error;f.box.React={createElement:()=>null}` | part of the voice integration harness |

---

## 7. Delete candidates (with evidence)

Confident:
- `test/fixtures/development-scope-provider.mjs`: no reference anywhere (`git grep scope-provider` matches only the file itself). Last touched in `69d9d0bbb`.
- `test/photos-native-order.test.mjs`: exact duplicate of a test in `photos-library-patch.test.mjs` (section 3).
- `test/update-channel-gradle.test.py`: no runner or reference.
- `test/aosp-fresh-presets.test.py`: only named in a README command, and no runner calls it (`git grep` shows it only in `android/aosp/branding/{keyboard-dictation,provision}/README.md`).
- `test/fixtures/update-confirmation-android/` and `test/fixtures/automatic-update-android/`: used only by `scripts/test-update-confirmation-platform.ts` and `scripts/test-automatic-update-platform.ts`, which nothing references (`git grep` finds no runner or wrapper; the scripts agent should confirm).
- Two more unreferenced `scripts/test-*.ts` (the scripts agent's area): `test-native-calendar-consumer.ts` and `test-photo-filter-png-reference.ts`. The second is only named inside a JSON asset.
- `test/maps-navigation.test.mjs`, `test/maps-route-distance.test.mjs`, `test/calendar-agent-write-host.test.mjs`, the two upstream cases in `test/native-live-pcm.test.mjs`, and the upstream policy run inside `login-surfaces.test.mjs:358`: these test upstream code (P5).
- All 23 pure A files, and the A parts of the 200 `+A` files.
- The 4 quint aggregate tests, **or** the about 185 per-model wrappers they duplicate.
- The 20 environment knobs with no setter (P7).
- `test/aosp-listener-systemui.test.mjs:45` (permanently skipped).
- Test-of-harness files (P9) once the harnesses go.
- `test/password-dev-editor.test.mjs`: tests a developer-only vault surface (`apps/app/src/passwords/dev-vault.ts`). AGENTS.md: developer surfaces exist only with `ELIZA_DEV_ALLOW_TEST_MOCKS=1`.

Suspicions (verify first):
- `test/fixtures/cloud-voice-view.d.mts`: no explicit reference, but it types `cloud-voice-view.mjs` for `scripts/test-cloud-voice-*.ts` under `typecheck:scripts`. Keep it while those scripts exist.
- `test/quint-legacy-*-refinement.test.mjs` (8 files) and `test/fixtures/quint/*.qnt` (7 comparison models): these compare *historical* UIs against the current one and pin known mismatches. They fit the "legacy beside new" pattern. Deleting them is an owner decision.

---

## 8. Structure and foldering

- **Two helper directories with overlapping roles.** `test/support/` (5 files) and `test/fixtures/` (86 JS helpers, most of them executable harnesses rather than data) both hold the same kinds of helper. Duplicate files are listed in section 6.
- **Test bodies live in `scripts/`.** There are 93 `scripts/test-*.ts` (10.4k lines). `scripts/aosp-listener-systemui.ts` exports `loadListenerSystemuiTests()`, called by `test/aosp-listener.test.mjs:1-2`. Production scripts import test support (`scripts/feature-manifest.ts:6` uses `test/support/feature-parity.mjs`).
- **`specs/` depends on `test/`.** 134 spec files import `test/fixtures` or `test/support`. For example, `specs/quint/refinement/application/accessible-toast-lifetime.mjs:4` imports `../../../../test/support/strip-types.mjs`, and `test/fixtures/quint/*.qnt` is only used by `specs/quint/legacy/*`. The refinement fixtures belong with the refinement drivers.
- **CI provisioning in `test/fixtures`**: `kotlin-tools.mjs`, `jvm-tools.mjs` (cache scraping) (P13).
- **Java tests split across three places:** `test/fixtures/*Test.java` (about 60), `test/own-provider/*.java` (3), and generated inline Java in JS strings (61 files). `android/app/src/test` would be the conventional home.
- **Flat directory of 1004 files** with filename-only grouping. Prefixes such as `native-` (50), `cloud-` (35) and `browser-` (34) mix product areas with layers (`browser-` means the in-app Browser view, the browser storage layer, or the Cloud browser bridge).
- **Monoliths:** `pixel-spoken-acks.test.mjs` (1679 lines and 90 tests), `browser-cloud-dev-bridge.test.mjs` (1207), `connection-presentation-state.test.mjs` (1012), `voice-assistant.test.mjs` (918), `android-instrumentation-runner.test.mjs` (658), `google-calendar-connect.test.mjs` (629), `notes-recorder.test.mjs` (609).
- **Micro-files:** about 120 files under 15 lines, nearly all quint wrappers or one-line child-suite imports.

---

## 9. Worst offenders

1. `test/quint-application-refinement.test.mjs`, `quint-services-refinement.test.mjs`, `quint-native-refinement.test.mjs`, `quint-composition-refinement.test.mjs`: 2400/2400/2400/600 s aggregates that re-run campaigns already run per file.
2. `test/connection-presentation-state.test.mjs`: 1012 lines over five text slices of `connection-ui.tsx` in one vm.
3. `test/pixel-spoken-acks.test.mjs`: 1679 lines and 90 tests on the vm-transplanted voice views. It opens with a regex on upstream source (line 22).
4. `test/accessibility-coverage.test.mjs`: 108 regex assertions over the text of other (Playwright) tests.
5. `test/browser-web-features.test.mjs`: 63 regexes over shared and Alpha browser Java.
6. `test/native-deletion-admission.test.mjs`: 40 regexes over vendor `DeferredDeletionCoordinator.java`.
7. `test/home-role-recovery-contract.test.mjs`: regex-extracts a Java method into generated classes, with a reflection fallback for an old signature.
8. `test/resident-start-failure-policy.test.mjs`: Java method transplant plus pure `includes` assertions.
9. `test/wallet-disabled.test.mjs`: import rewriting into `data:` modules, regexes over all Java/manifests, and a test that always skips (line 101).
10. `test/adapter-contracts.test.mjs`: 26 child processes, so the real tests are invisible in `scripts/`.
11. `test/photos-native-order.test.mjs`: verbatim duplicate.
12. `test/login-surfaces.test.mjs` with `test/support/login-surfaces.mjs`: a prose inventory checked against source, plus it re-runs an upstream suite.
13. `test/feature-parity.test.mjs` with `test/support/feature-parity.mjs`: a 636-line allow-list of prose that a production script imports.
14. `test/settings-text-scale-settlement.test.mjs` and `settings-text-scale-refresh.test.mjs`: slice *exported* functions by text.
15. `test/settings-signout-confirm.test.mjs` and `voice-recovery-state.test.mjs`: regex-extract JSX/arrow callbacks and eval them.
16. `test/workflow-canonical-notes.test.mjs`: slices an `if` block out of `agent-adapter.ts`.
17. `test/quint-legacy-maps-refinement.test.mjs` and its 7 siblings: legacy comparison models that pin known mismatches.
18. `test/gesture-zones-single-instance.test.mjs`: "stop the source drifting" regexes over `model.js`, `template.html` and androidTest.
19. `test/test-helpers.test.mjs`, `strip-types-compat.test.mjs`, `node-test-runner.test.mjs`, `workflow-device-bindings-fixture.test.mjs`: they test the test machinery.
20. `test/fixtures/calendar-mounted-editor.mjs` and `modal-scrim-chromium.mjs`: Chromium e2e inside `npm test`.
21. `test/maps-navigation.test.mjs` and `test/calendar-agent-write-host.test.mjs`: test upstream code.
22. `test/fixtures/kotlin-tools.mjs`: downloads jars from Maven Central during CI setup, from inside `test/fixtures`.

---

## 10. Target shape of the host suite

Principles from the owner: no source-text tests, essentially no unit tests, integration and e2e only, no duplicate
coverage, and CI that runs only what a change can affect. The UI belongs to Playwright (`test/browser/`) and the
device belongs to instrumentation. The host suite should keep only what neither can reach cheaply: Node/TypeScript
runtime modules wired together with a real Node environment (real HTTP fixture servers, real sqlite or pglite, real
SDK), the host-JVM native logic, the model-replay runner, and the release and CI tooling.

Proposed layout (about 45 to 60 files instead of 1004):

```
test/
  integration/                         # node:test, real modules imported (no slicing, no vm), real IO
    connection-cloud.test.ts           # sign-in, account, plan, provider transport, dev bridge (browser-cloud-dev-bridge), google auth URL policy
    resident-runtime.test.ts           # local agent contracts, native events/stream, prepared SDK (ALPHA_REQUIRE_PREPARED_SDK), embeddings route
    voice.test.ts                      # VoiceAssistantSession + live segment stream + Cloud speech chunks/streaming over fake transports
    calendar.test.ts                   # adapters + recurrence + managed calendar ports (absorbs scripts/test-calendar-*.ts)
    inbox-gmail.test.ts                # inbox flows, grants, drafts, read-ahead (absorbs scripts/test-inbox-*.ts)
    notes.test.ts                      # notes store/service on a temp dir (absorbs scripts/test-notes-*.ts)
    workflows-digest.test.ts           # workflow protocol/authoring/executor, digest storage/cancellation
    maps.test.ts                       # cloud provider, saved places, navigation relay
    phone-sms-contacts.test.ts         # telephony executor, sms flows
    camera-photos-files-scan.test.ts   # scan drafts, photo library adapter, files picker
    browser-view.test.ts               # the Browser view's runtime modules only (provider transport, reading support)
    shell-settings.test.ts             # only what Playwright cannot observe (native port contracts)
  quint/
    refinement.test.mjs                # ONE manifest-driven runner: one test() per model, model filter from env/argv
    tooling.test.mjs                   # check-traces, model-state, campaigns, quint-lib (the current F quint files)
  tooling/                             # tests of scripts/, grouped per tool family, real git/fs fixtures
    release-signing.test.ts            # sign-release-apks, record-release, enroll-release-keys, publish-update-manifest, update-channel
    apk-verify-audit.test.ts           # verify-apks, audit-production-bundle, licenses/sbom/font-license
    aosp.test.ts                       # stage-aosp, pixel10a, cuttlefish, secure camera, provisioning overlay
    android-build-inputs.test.ts       # build-android preflight, runtime profile, gzip assets, voice/embedding host staging
    upstream-sources.test.ts           # prepare-patched-native, upstream-native-source, client-feature preparation, source snapshot
    ci.test.ts                         # affected selection, required-result, emulator evidence
    python.test.mjs                    # single runner for every test/*.py and scripts/ci/*.py (each once)
  fixtures/                            # data only (json, qnt for tooling tests), no executable harnesses
android/app/src/test/java/...          # host-JVM native tests run by Gradle `testDebugUnitTest`, one shared stub set,
                                       # about 8 classes by area: notices, resident/credentials, calendar sync, photos/media,
                                       # storage/secure slots, voice/speech, update/OTA, deletion
```

Rough counts: about 12 integration files, 2 quint files, about 7 tooling files, about 8 Gradle JVM test classes,
plus a few residual singletons. That is **about 30 to 60 files in total**.

What goes where:
- **A (23 plus the A parts of 200)**: deleted. The few artifact invariants move into `verify-apks`/`audit-production-bundle`, which check build output.
- **C (268)**: deleted. Each area integration file gets the distinct *behaviours* (stale-epoch fences, owner changes, retries) through real imports. Most of these modules (`connection-ui.tsx`, `agent-adapter.ts`, `settings-adapter.ts`) need small seams (exported functions with injected ports) so they can be imported instead of sliced. That source change is the real prerequisite.
- **B (150)**: pure-function cases fold into the area integration as table-driven inputs at module boundaries, or get deleted when a Playwright spec covers them. The 38 single-class JVM ones move into the Gradle JVM tests.
- **D (107)**: kept, merged by area. JVM D tests go to Gradle. Chromium-launching ones go to `test/browser/`.
- **E (303)**: one runner. Aggregates and wrappers go away. Model-specific extras move into manifest or receipt checks.
- **F (131)**: kept where they exercise a real script against real fs/git, merged per tool family. Test-of-test files and workflow-YAML regexes are deleted.
- **G (21)**: their `scripts/test-*.ts` bodies move into `test/integration/*`.

CI implications (for the CI agent):
1. `run-node-tests.ts` should take area globs. `scripts/ci/affected.ts` already computes path-based lanes for Playwright, so extend it to `test/integration/<area>`, `test/quint` (with a model filter from `quint:changed`) and `test/tooling/<family>`.
2. Removing the aggregate duplication alone saves the replay time a second time per run (at least about 19 min of measured replay, more with trace generation and javac).
3. Moving JVM tests to Gradle drops the Kotlin/org.json provisioning steps from the web verify job. Moving Chromium out drops the Playwright install there.

---

## 11. Open questions and risks

1. **Quint refinement as the primary integration layer?** The replays exercise real (transplanted) source over many interleavings. If the owner values them, the runner should import real modules through seams, not transplant. That is a large change to `specs/quint/refinement/**` (572 files). If not, most of E can go.
2. **Legacy comparison models** (`quint-legacy-*`, `test/fixtures/quint/*Comparison.qnt`): do historical UIs still need comparing?
3. **Seams in big renderer files.** Deleting C without replacement removes guard coverage for `connection-ui.tsx` (81 test files). Someone must decide which behaviours are owned by Playwright and which by new integration tests, before deleting.
4. **Upstream-only tests** (P5): agree that the pin bump process runs the upstream suites, so Alpha stops re-running them.
5. **Source-text "invariants" that are release gates** (wallet/NFC absence, licences, signer records, login-surface inventory): do they move to artifact audits, or does the owner accept losing them?
6. **Host-versus-browser twins**: for the 23 same-name pairs, confirm the Playwright spec covers the native path before deleting the host twin. Some host tests deliberately cover the native (Pixel) branch that Chromium cannot reach (`pixel-spoken-acks`).
7. **SDK-gated tests** depend on `ALPHA_CLOUD_COLLECTOR_SOURCE` being set by CI setup. If the owner wants them always on, they belong in a separate prepared-SDK lane (as `resident-prepare.yml` already does for `calendar-managed-rejection`).
8. Classification accuracy is about 85%. The table's fate column is a recommendation per file, not a verified coverage diff.

---

## Appendix: per-file classification (1004 files)

Bucket letters: A source-text, B unit with stubs, C source transplant, D integration, E Quint refinement/conformance,
F tooling, G other. `+A` means the file also has three or more source-text assertions.
`[read]` means I opened and read the file. All other rows come from the automated skim.

| file | bucket | reason | proposed fate |
|---|---|---|---|
| abort-signal-compat.test.mjs | C | [read] strips abort-signal.ts and navigation-relay.ts to data: modules and runs them with AbortSignal.any removed | delete (WebView 113 polyfill; cover once in browser integration with AbortSignal.any undefined) |
| accessibility-coverage.test.mjs | A | [read] regex over mvp-features.ts, template.html and the Playwright sweep spec text | delete (asserts the text of other tests) |
| accessibility-timeout.test.mjs | B | [read] imports runtime/accessibility-timeout.ts via tsx with a fake native port | merge-into shell integration (or delete: quint-accessible-toast-lifetime replays the same module) |
| accessibility-visible-bounds.test.mjs | B | [read] javac of androidTest AccessibilityBounds.java + fixture main; bypasses jvmSkip/runJvm | merge-into android-jvm (Gradle unit test) or delete |
| action-message-presentation.test.mjs | B | imports a real app module and drives it with stub ports | merge-into shell-settings integration |
| adapter-contracts.test.mjs | G | [read] runs 26 scripts/test-*.ts child suites, one node process each | merge (move the 26 suites into area integration files under test/) |
| agent-action-preferences.test.mjs | C | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via resident-runtime integration |
| agent-always-local.test.mjs | C+A | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via resident-runtime integration |
| agent-calendar-mutation.test.mjs | G | [read] runs scripts/test-agent-calendar-mutation-flow.ts | merge into calendar integration |
| agent-calendar-refresh-state.test.mjs | C+A | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via calendar integration |
| agent-camera-capture.test.mjs | G | [read] runChildSuite(test-agent-camera-flow.ts); same name as browser/agent-camera-capture.spec.ts | merge into camera integration; check browser spec overlap |
| agent-embedding-overrides.test.mjs | F | tests a scripts/ (build/release/CI) module | keep; merge-into release-tooling suite per tool family |
| agent-identity.test.mjs | D+A | imports real app modules and drives them with real IO (HTTP server/sqlite/git) | keep; merge-into resident-runtime integration |
| agent-model-selection.test.mjs | F+A | tests a scripts/ (build/release/CI) module with real git/fs/child processes | keep; merge-into release-tooling suite per tool family |
| agent-speech-environment.test.mjs | F | tests a scripts/ (build/release/CI) module | keep; merge-into release-tooling suite per tool family |
| agent-status-route.test.mjs | C | esbuild-bundles a real source with imports replaced by inline stub modules | delete; cover via resident-runtime integration |
| alpha-client-consumed-approvals.test.mjs | B+A | imports a real app module and drives it with stub ports | merge-into shell-settings integration |
| alpha-client-sensitive.test.mjs | B | imports a real app module and drives it with stub ports | merge-into shell-settings integration |
| alpha-system-entry.test.mjs | C+A | slices Java methods out of product source into a generated Java class and runs it on the host JVM; inline Java test source in a JS template | delete; cover via release-build-aosp integration |
| always-on-listener.test.mjs | D+A | compiles several real/staged Java classes together with javac and runs a fixture main on the host JVM; inline Java test source in a JS template | keep; merge-into android-jvm/voice-speech (Gradle) |
| android-build-path.test.mjs | F+A | tests a scripts/ (build/release/CI) module with real git/fs/child processes | keep; merge-into release-tooling suite per tool family |
| android-cloud-voice-timing.test.mjs | F | tests a scripts/ (build/release/CI) module | keep; merge-into release-tooling suite per tool family |
| android-consumer-build.test.mjs | F+A | tests a scripts/ (build/release/CI) module | keep; merge-into release-tooling suite per tool family |
| android-dependency-fingerprint.test.mjs | F | tests a scripts/ (build/release/CI) module with real git/fs/child processes | keep; merge-into release-tooling suite per tool family |
| android-gzip-assets.test.mjs | F+A | tests a scripts/ (build/release/CI) module | keep; merge-into release-tooling suite per tool family |
| android-host.test.mjs | B+A | imports a real app module and drives it with stub ports | merge-into release-build-aosp integration |
| android-instrumentation-runner.test.mjs | F+A | tests a scripts/ (build/release/CI) module with real git/fs/child processes | keep; merge-into release-tooling suite per tool family |
| android-runtime-staging-selection.test.mjs | F+A | tests a scripts/ (build/release/CI) module | keep; merge-into release-tooling suite per tool family |
| android-stage-voice-models.test.mjs | F | tests a scripts/ (build/release/CI) module | keep; merge-into release-tooling suite per tool family |
| aosp-apk-preparation.test.mjs | F | [read] wrapper spawning test/aosp-apk-preparation.py | keep; fold into python-suites runner |
| aosp-capabilities.test.mjs | D+A | compiles several real/staged Java classes together with javac and runs a fixture main on the host JVM; inline Java test source in a JS template | keep; merge-into android-jvm/release-build-aosp (Gradle) |
| aosp-cloud-power-defaults.test.mjs | A | reads source/config text and regex-matches it | delete (move any real invariant into the owning artifact audit) |
| aosp-cuttlefish.test.mjs | F | tests a scripts/ (build/release/CI) module | keep; merge-into release-tooling suite per tool family |
| aosp-image-capability.test.mjs | B+A | imports a real app module and drives it with stub ports | merge-into release-build-aosp integration |
| aosp-listener-systemui.test.mjs | F+A | tests a scripts/ (build/release/CI) module with real git/fs/child processes | keep; merge-into release-tooling suite per tool family |
| aosp-listener.test.mjs | F | [read] calls loadListenerSystemuiTests() exported by scripts/aosp-listener-systemui.ts (tests live in a script) | merge into aosp-listener-systemui.test (move test bodies out of scripts/) |
| aosp-pixel10a.test.mjs | F+A | runs a Python unittest of a scripts/ or CI tool | keep; fold into one python runner |
| aosp-product-lock.test.mjs | F+A | tests a scripts/ (build/release/CI) module | keep; merge-into release-tooling suite per tool family |
| aosp-provisioning-overlay.test.mjs | F+A | tests a scripts/ (build/release/CI) module | keep; merge-into release-tooling suite per tool family |
| aosp-release-signing.test.mjs | F+A | runs a Python unittest of a scripts/ or CI tool | keep; fold into one python runner |
| aosp-retain-known-good.test.mjs | F | tests a scripts/ (build/release/CI) module | keep; merge-into release-tooling suite per tool family |
| aosp-secure-camera-policy.test.mjs | F+A | tests a scripts/ (build/release/CI) module | keep; merge-into release-tooling suite per tool family |
| aosp-secure-camera.test.mjs | F+A | tests a scripts/ (build/release/CI) module with real git/fs/child processes | keep; merge-into release-tooling suite per tool family |
| aosp-sms.test.mjs | D+A | compiles several real/staged Java classes together with javac and runs a fixture main on the host JVM | keep; merge-into android-jvm/release-build-aosp (Gradle) |
| aosp-staging-patches.test.mjs | F | tests a scripts/ (build/release/CI) module with real git/fs/child processes | keep; merge-into release-tooling suite per tool family |
| aosp-telephony.test.mjs | B | imports a real app module and drives it with stub ports | merge-into release-build-aosp integration |
| apk-alpha-power-policy.test.mjs | F | tests a scripts/ (build/release/CI) module | keep; merge-into release-tooling suite per tool family |
| apk-alpha-tile-policy.test.mjs | F | tests a scripts/ (build/release/CI) module | keep; merge-into release-tooling suite per tool family |
| apk-keyboard-dictation.test.mjs | F | tests a scripts/ (build/release/CI) module | keep; merge-into release-tooling suite per tool family |
| apk-signer-range.test.mjs | F | tests a scripts/ (build/release/CI) module | keep; merge-into release-tooling suite per tool family |
| app-record-pending-actions.test.mjs | C+A | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via shell-settings integration |
| app-speech-route.test.mjs | C | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via voice-speech integration |
| app-update-automatic.test.mjs | C | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via shell-settings integration |
| app-update-candidate.test.mjs | F | tests a scripts/ (build/release/CI) module | keep; merge-into release-tooling suite per tool family |
| app-update-startup.test.mjs | B | imports a real app module and drives it with stub ports | merge-into resident-runtime integration |
| app-update.test.mjs | D+A | compiles several real/staged Java classes together with javac and runs a fixture main on the host JVM | keep; merge-into android-jvm/shell-settings (Gradle) |
| appearance-preference.test.mjs | C | uses a transplant fixture (appearance-preference.mjs) that strips/evals real sources in a vm | delete; cover via shell-settings integration |
| archive-scan.test.mjs | F | runs a Python unittest of a scripts/ or CI tool | keep; fold into one python runner |
| assetlinks-cloud-config.test.mjs | F+A | tests a scripts/ (build/release/CI) module with real git/fs/child processes | keep; merge-into release-tooling suite per tool family |
| assistant-draft-dispatch.test.mjs | C+A | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via shell-settings integration |
| assistant-settlement-delivery.test.mjs | C+A | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via shell-settings integration |
| auth-callback-manifest.test.mjs | F | tests a scripts/ (build/release/CI) module | keep; merge-into release-tooling suite per tool family |
| auth-copy-native-cutout.test.mjs | C | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via connection-cloud integration |
| automation-completion.test.mjs | B | drives a test/fixtures harness (browser-source.mjs) | merge-into workflows-digest integration |
| automations-transport.test.mjs | B | drives a test/fixtures harness (browser-source.mjs) | merge-into workflows-digest integration |
| automations-unified.test.mjs | C+A | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via workflows-digest integration |
| avatar-initials-audit.test.mjs | F | tests a scripts/ (build/release/CI) module | keep; merge-into release-tooling suite per tool family |
| batch-ack-shell-retirement.test.mjs | A | reads source/config text and regex-matches it | delete |
| batch-progress-stream.test.mjs | G | [read] one line: import '../scripts/test-batch-progress-stream.ts' | merge (move file into test/) |
| batch-voice-progress-ack.test.mjs | G | one line: import of scripts/test-batch-voice-progress-ack.ts | merge (move file into test/) |
| browser-bookmark-startup.test.mjs | C | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via browser-view integration |
| browser-calendar-open-source.test.mjs | C | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via calendar integration |
| browser-calendar-series.test.mjs | B | drives a test/fixtures harness (browser-daily-stores.mjs) | merge-into calendar integration |
| browser-camera-storage.test.mjs | C | esbuild-bundles a real source with imports replaced by inline stub modules | delete; cover via browser-view integration |
| browser-clock.test.mjs | B | drives a test/fixtures harness (browser-daily-stores.mjs,browser-reminder-clock.mjs) | merge-into calendar integration |
| browser-cloud-dev-bridge.test.mjs | D | [read] 1207 lines; real scripts/browser-cloud-dev-bridge.ts handler + app CloudProtocol/BrowserCloudConnection over a real HTTP server; self re-execs under tsx | keep; split into connection-cloud integration |
| browser-command-refusals.test.mjs | C | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via browser-view integration |
| browser-construction.test.mjs | B | compiles one product Java class plus a hand-written fixture main with javac (host-JVM unit test); inline Java test source in a JS template | merge-into browser-view integration |
| browser-deletion-recovery.test.mjs | C | strips types of a real source file and evals/imports it with substituted imports | delete; cover via browser-view integration |
| browser-errors.test.mjs | B | imports a real app module and drives it with stub ports | merge-into browser-view integration |
| browser-external-handoff-refinement.test.mjs | E | uses a specs/quint replay/refinement driver outside the quint- prefix | merge-into one manifest-driven quint runner |
| browser-host-modal.test.mjs | C+A | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via browser-view integration |
| browser-host-source-closure.test.mjs | F | tests a scripts/ (build/release/CI) module with real git/fs/child processes | keep; merge-into release-tooling suite per tool family |
| browser-journal-retention.test.mjs | B | drives a test/fixtures harness (browser-daily-stores.mjs) | merge-into browser-view integration |
| browser-local-transcription.test.mjs | B | imports a real app module and drives it with stub ports | merge-into browser-view integration |
| browser-navigation-creation.test.mjs | C | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via browser-view integration |
| browser-note-pending-audio.test.mjs | C | strips types of a real source file and evals/imports it with substituted imports | delete; cover via notes integration |
| browser-notification-clear.test.mjs | C | strips types of a real source file and evals/imports it with substituted imports | delete; cover via browser-view integration |
| browser-popup-opener.test.mjs | C | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via browser-view integration |
| browser-presentation-lifecycle.test.mjs | C | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via browser-view integration |
| browser-proof-export.test.mjs | A | reads source/config text and regex-matches it | delete (move any real invariant into the owning artifact audit) |
| browser-provider-transport.test.mjs | B | [read] bundles browser-cloud-resident.ts with define, stubs fetch | merge-into connection integration |
| browser-reading-capability.test.mjs | C+A | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via browser-view integration |
| browser-receipt-order.test.mjs | C+A | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via browser-view integration |
| browser-request-refusal.test.mjs | B | drives a test/fixtures harness (device-action-policy.mjs) | merge-into browser-view integration |
| browser-reviewed-link-provenance.test.mjs | C | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via browser-view integration |
| browser-saved-transcript-audio.test.mjs | C | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via browser-view integration |
| browser-session-persistence.test.mjs | C | esbuild-bundles a real source with imports replaced by inline stub modules | delete; cover via browser-view integration |
| browser-site-permissions.test.mjs | D+A | compiles several real/staged Java classes together with javac and runs a fixture main on the host JVM | keep; merge-into android-jvm/browser-view (Gradle) |
| browser-startup-permissions.test.mjs | B | imports a real app module and drives it with stub ports | merge-into browser-view integration |
| browser-streamed-speech.test.mjs | C | strips types of a real source file and evals/imports it with substituted imports | delete; cover via voice-speech integration |
| browser-tab-host-identity.test.mjs | D+A | compiles several real/staged Java classes together with javac and runs a fixture main on the host JVM; inline Java test source in a JS template | keep; merge-into android-jvm/browser-view (Gradle) |
| browser-voice-cancellation.test.mjs | C | strips types of a real source file and evals/imports it with substituted imports | delete; cover via voice-speech integration |
| browser-web-features.test.mjs | A | [read] 63 regexes over shared and Alpha browser Java ('Source-level guards') | delete (instrumented BrowserWebFeaturesInstrumentedTest covers behaviour) |
| calendar-agent-review.test.mjs | B | imports a real app module and drives it with stub ports | merge-into calendar integration |
| calendar-agent-write-host.test.mjs | B | [read] imports vendor/eliza managed-calendar-host.ts directly and unit-tests it | delete (upstream code; upstream tests) |
| calendar-approval-client.test.mjs | B | imports a real app module and drives it with stub ports | merge-into calendar integration |
| calendar-approval-ui.test.mjs | C | esbuild-bundles a real source with imports replaced by inline stub modules | delete; cover via calendar integration |
| calendar-availability-reader.test.mjs | D | compiles several real/staged Java classes together with javac and runs a fixture main on the host JVM | keep; merge-into android-jvm/calendar (Gradle) |
| calendar-availability.test.mjs | G | thin wrapper that runs scripts/test-*.ts child suite(s) | merge (move scripts/test-*.ts body into calendar integration) |
| calendar-confirmation.test.mjs | C | [read] new Function() over calendar-confirmation.ts with imports/exports regex-stripped | delete; cover via calendar integration |
| calendar-connect-policy.test.mjs | C | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via calendar integration |
| calendar-connection-scope.test.mjs | C | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via calendar integration |
| calendar-day-context.test.mjs | B | drives a test/fixtures harness (browser-source.mjs) | merge-into calendar integration |
| calendar-delete-latch.test.mjs | C | strips types of a real source file and evals/imports it with substituted imports | delete; cover via calendar integration |
| calendar-deletion-identity.test.mjs | B | compiles one product Java class plus a hand-written fixture main with javac (host-JVM unit test); inline Java test source in a JS template | merge-into calendar integration |
| calendar-deletions.test.mjs | B | imports a real app module and drives it with stub ports | merge-into calendar integration |
| calendar-empty-bootstrap-repro.test.mjs | C | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via calendar integration |
| calendar-end-after-start.test.mjs | B | [read] imports calendarFormTimeProblem; browser spec of same name covers the rendered path and points back here | merge-into calendar integration or delete |
| calendar-form-inputs.test.mjs | B | imports a real app module and drives it with stub ports | merge-into calendar integration |
| calendar-linked-provider.test.mjs | G | thin wrapper that runs scripts/test-*.ts child suite(s) | merge (move scripts/test-*.ts body into calendar integration) |
| calendar-linked-store.test.mjs | C+A | strips types of a real source file and evals/imports it with substituted imports | delete; cover via calendar integration |
| calendar-managed-rejection.test.mjs | D | conditional on ALPHA_REQUIRE_PREPARED_SDK / prepared SDK graph; resident-prepare.yml runs it alone | keep; connection/calendar integration |
| calendar-mounted-draft-handoff.test.mjs | B | drives a test/fixtures harness (calendar-draft-handoff.mjs) | merge-into calendar integration |
| calendar-mounted-edit-admission.test.mjs | D | launches real Chromium from node:test via a fixture (calendar-mounted-editor.mjs,calendar-draft-handoff.mjs) | move to test/browser |
| calendar-mounted-editor.test.mjs | D | launches real Chromium from node:test via a fixture (calendar-mounted-editor.mjs,calendar-draft-handoff.mjs) | move to test/browser |
| calendar-mounted-preservation.test.mjs | D | launches real Chromium from node:test via a fixture (calendar-mounted-editor.mjs) | move to test/browser |
| calendar-range-reader.test.mjs | D | compiles several real/staged Java classes together with javac and runs a fixture main on the host JVM | keep; merge-into android-jvm/calendar (Gradle) |
| calendar-read-timing.test.mjs | B | imports a real app module and drives it with stub ports | merge-into calendar integration |
| calendar-recurrence.test.mjs | B | [read] pure expandCalendarSeries DST cases | merge-into calendar integration |
| calendar-regression-runner.test.mjs | B | drives a test/fixtures harness (isolated-native-campaign.mjs) | merge-into release-build-aosp integration |
| calendar-review-parse-cache.test.mjs | C+A | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via calendar integration |
| calendar-settings-simplicity.test.mjs | C+A | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via calendar integration |
| calendar-sync-cloud-refusal.test.mjs | B | compiles one product Java class plus a hand-written fixture main with javac (host-JVM unit test); inline Java test source in a JS template | merge-into calendar integration |
| calendar-sync-consent.test.mjs | D | compiles several real/staged Java classes together with javac and runs a fixture main on the host JVM | keep; merge-into android-jvm/calendar (Gradle) |
| calendar-sync-mutation.test.mjs | D | compiles several real/staged Java classes together with javac and runs a fixture main on the host JVM | keep; merge-into android-jvm/calendar (Gradle) |
| calendar-sync-receipt-recovery.test.mjs | D+A | compiles several real/staged Java classes together with javac and runs a fixture main on the host JVM | keep; merge-into android-jvm/calendar (Gradle) |
| calendar-sync-settings-navigation.test.mjs | C | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via calendar integration |
| calendar-sync-snapshot.test.mjs | D | [read] javac CalendarSyncSnapshot against a SQLite-backed provider stand-in | keep; merge-into android-jvm/calendar |
| calendar-view-rules.test.mjs | C | strips types of a real source file and evals/imports it with substituted imports | delete; cover via calendar integration |
| camera-capture-mode-patch.test.mjs | F+A | tests a scripts/ (build/release/CI) module | keep; merge-into release-tooling suite per tool family |
| camera-preview-recovery.test.mjs | C+A | strips types of a real source file and evals/imports it with substituted imports | delete; cover via camera-photos-files-scan integration |
| camera-rapid-leave.test.mjs | D | launches real Chromium from node:test via a fixture (calendar-mounted-editor.mjs,camera-preview-port.mjs) | move to test/browser |
| camera-resume.test.mjs | B+A | imports a real app module and drives it with stub ports | merge-into camera-photos-files-scan integration |
| camera-scan-keep.test.mjs | C | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via camera-photos-files-scan integration |
| camera-scanned-note.test.mjs | C | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via notes integration |
| campaign-speech-routes.test.mjs | A | scans source trees and regex-matches files (lint-like) | delete |
| canonical-calendar-draft-ownership.test.mjs | C | uses a transplant fixture (canonical-calendar-draft-owner.mjs) that strips/evals real sources in a vm | delete; cover via calendar integration |
| canonical-icons.test.mjs | C+A | [read] hashes icon assets against source.json and vm-evals the IC literal sliced from model.js | delete (asset provenance belongs in the licence/asset audit script) |
| canonical-maps-return.test.mjs | C | strips types of a real source file and evals/imports it with substituted imports | delete; cover via maps integration |
| canonical-note-calendar-admission.test.mjs | C | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via calendar integration |
| canonical-notes-draft-copy.test.mjs | C | [read] reuses the quint canonical-notes fixture compiler; identical scenario to browser/canonical-notes-draft-copy.spec.ts | delete (browser spec of same name) |
| canonical-notes-webview-abort.test.mjs | C+A | strips types of a real source file and evals/imports it with substituted imports | delete; cover via notes integration |
| canonical-notification-navigation.test.mjs | G | thin wrapper that runs scripts/test-*.ts child suite(s) | merge (move scripts/test-*.ts body into resident-runtime integration) |
| canonical-notification-security.test.mjs | C+A | slices Java methods out of product source into a generated Java class and runs it on the host JVM; inline Java test source in a JS template | delete; cover via resident-runtime integration |
| canonical-recording-audio-save.test.mjs | C | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via shell-settings integration |
| canvas-geometry.test.mjs | C | strips types of a real source file and evals/imports it with substituted imports | delete; cover via shell-settings integration |
| chat-attachment-composer.test.mjs | C | uses a transplant fixture (chat-attachment-composer.mjs) that strips/evals real sources in a vm | delete; cover via shell-settings integration |
| chat-navigation-detent.test.mjs | C | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via shell-settings integration |
| chat-release.test.mjs | C | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via shell-settings integration |
| chat-stop-controls.test.mjs | C | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via shell-settings integration |
| chat-transcript-window.test.mjs | C | [read] slices dc-lite renderer/template/shell methods into JSDOM | delete (browser chat specs) |
| chat-ui-failed-turn.test.mjs | C+A | strips types of a real source file and evals/imports it with substituted imports | delete; cover via shell-settings integration |
| checkin-choice-presentation.test.mjs | C | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via shell-settings integration |
| chooser-direct-entry.test.mjs | C+A | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via shell-settings integration |
| ci-affected.test.mjs | F | tests scripts/ci/affected.ts selection with a git fixture | keep (ci-tooling) |
| ci-emulator-evidence.test.mjs | F+A | tests a scripts/ (build/release/CI) module | merge-into ci tooling suite or delete |
| ci-pin-bound-scripts.test.mjs | F | runs a Python unittest of a scripts/ or CI tool | keep; fold into one python runner |
| ci-required-checks.test.mjs | F+A | [read] imports scripts/ci/required-result.ts and affected.ts (real), plus regexes over browser.yml and playwright.config.ts | keep the function cases in ci-tooling; drop workflow-YAML regexes |
| ci-ruleset-readback.test.mjs | F+A | tests a scripts/ (build/release/CI) module | merge-into ci tooling suite or delete |
| client-feature-preparation.test.mjs | F | [read] 372 lines; scripts/prepare-client-features.ts against git fixture repos | keep; release-tooling |
| client-observation-handshake.test.mjs | B | drives a test/fixtures harness (browser-source.mjs) | merge-into shell-settings integration |
| clock-native-contract.test.mjs | D+A | compiles several real/staged Java classes together with javac and runs a fixture main on the host JVM | keep; merge-into android-jvm/calendar (Gradle) |
| clock-repeat-days.test.mjs | B | imports a real app module and drives it with stub ports | merge-into calendar integration |
| cloud-conversation-chunks.test.mjs | C | uses a transplant fixture (shared-batch-voice.mjs,cloud-voice-view.mjs) that strips/evals real sources in a vm | delete; cover via connection-cloud integration |
| cloud-delegation-callback.test.mjs | C | esbuild-bundles a real source with imports replaced by inline stub modules | delete; cover via connection-cloud integration |
| cloud-deployment.test.mjs | D+A | compiles several real/staged Java classes together with javac and runs a fixture main on the host JVM; inline Java test source in a JS template | keep; merge-into android-jvm/connection-cloud (Gradle) |
| cloud-email-deployment.test.mjs | F | tests a scripts/ (build/release/CI) module | keep; merge-into release-tooling suite per tool family |
| cloud-email-resend.test.mjs | D+A | compiles several real/staged Java classes together with javac and runs a fixture main on the host JVM; inline Java test source in a JS template | keep; merge-into android-jvm/inbox-gmail-google (Gradle) |
| cloud-environment-selection.test.mjs | C+A | strips types of a real source file and evals/imports it with substituted imports | delete; cover via connection-cloud integration |
| cloud-maps-session.test.mjs | C | esbuild-bundles a real source with imports replaced by inline stub modules | delete; cover via maps integration |
| cloud-membership-presentation.test.mjs | D | imports real app modules and drives them with real IO (HTTP server/sqlite/git) | keep; merge-into connection-cloud integration |
| cloud-membership-ui.test.mjs | B | [read] esbuild cjs bundle + new Function require shim; renders CloudMembershipControls to markup | delete if browser cloud-account-panel spec covers |
| cloud-personal-protocol.test.mjs | B | drives a test/fixtures harness (browser-source.mjs) | merge-into connection-cloud integration |
| cloud-phone-login.test.mjs | D | imports real app modules and drives them with real IO (HTTP server/sqlite/git) | keep; merge-into phone-sms-contacts integration |
| cloud-plan-cancel.test.mjs | C | [read] slices settings-adapter.ts between two literal lines and runs it in vm | delete |
| cloud-prewarm.test.mjs | C+A | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via connection-cloud integration |
| cloud-protocol-error-copy.test.mjs | C | strips types of a real source file and evals/imports it with substituted imports | delete; cover via connection-cloud integration |
| cloud-qa-launcher.test.mjs | F | tests a scripts/ (build/release/CI) module | keep; merge-into release-tooling suite per tool family |
| cloud-reachability.test.mjs | B | imports a real app module and drives it with stub ports | merge-into connection-cloud integration |
| cloud-readiness.test.mjs | F+A | tests a scripts/ (build/release/CI) module | keep; merge-into release-tooling suite per tool family |
| cloud-resident-authority.test.mjs | C | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via connection-cloud integration |
| cloud-resident-embedding-route.test.mjs | D | real SDK host config; skipped unless prepared SDK | keep; native-resident integration |
| cloud-resident-full-profile.test.mjs | D | real pinned SDK collector under Bun; skipped without ALPHA_CLOUD_COLLECTOR_SOURCE+ALPHA_BUN | keep; native-resident integration |
| cloud-resident-host.test.mjs | C | uses a transplant fixture (product-character-host.mjs) that strips/evals real sources in a vm | delete; cover via connection-cloud integration |
| cloud-sdk-routing.test.mjs | F | tests a scripts/ (build/release/CI) module | keep; merge-into release-tooling suite per tool family |
| cloud-service-info.test.mjs | B | [read] pure parser | merge-into connection integration or delete |
| cloud-sign-in-flow.test.mjs | D+A | compiles several real/staged Java classes together with javac and runs a fixture main on the host JVM | keep; merge-into android-jvm/connection-cloud (Gradle) |
| cloud-sign-in-late-readiness.test.mjs | C | strips types of a real source file and evals/imports it with substituted imports | delete; cover via connection-cloud integration |
| cloud-sign-in-network.test.mjs | B | compiles one product Java class plus a hand-written fixture main with javac (host-JVM unit test); inline Java test source in a JS template | merge-into connection-cloud integration |
| cloud-sign-in-readiness-retry.test.mjs | C | strips types of a real source file and evals/imports it with substituted imports | delete; cover via connection-cloud integration |
| cloud-sign-in-state.test.mjs | C+A | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via connection-cloud integration |
| cloud-signing-input.test.mjs | F | [read] wrapper spawning test/cloud-signing-input.test.py; also run by verify-cloud-signing-input.yml? | keep; fold into python-suites runner |
| cloud-speech-chunks.test.mjs | B | [read] pure planCloudSpeechChunks | merge-into voice integration |
| cloud-speech-stream.test.mjs | D+A | compiles several real/staged Java classes together with javac and runs a fixture main on the host JVM; inline Java test source in a JS template | keep; merge-into android-jvm/voice-speech (Gradle) |
| cloud-speech-timing.test.mjs | D | compiles several real/staged Java classes together with javac and runs a fixture main on the host JVM | keep; merge-into android-jvm/voice-speech (Gradle) |
| cloud-streaming-conversation.test.mjs | C+A | strips types of a real source file and evals/imports it with substituted imports | delete; cover via connection-cloud integration |
| cloud-voice-limit.test.mjs | B+A | compiles one product Java class plus a hand-written fixture main with javac (host-JVM unit test) | merge-into voice-speech integration |
| cloud-voice-profile.test.mjs | C+A | slices Java methods out of product source into a generated Java class and runs it on the host JVM; inline Java test source in a JS template | delete; cover via voice-speech integration |
| committed-device-changes.test.mjs | B | drives a test/fixtures harness (browser-source.mjs) | merge-into shell-settings integration |
| committed-view-observation.test.mjs | C | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via shell-settings integration |
| comms-settings.test.mjs | C+A | esbuild-bundles a real source with imports replaced by inline stub modules | delete; cover via phone-sms-contacts integration |
| composer-send-ownership.test.mjs | C | strips types of a real source file and evals/imports it with substituted imports | delete; cover via shell-settings integration |
| connection-action-reconcile.test.mjs | C | strips types of a real source file and evals/imports it with substituted imports | delete; cover via connection-cloud integration |
| connection-background-restore.test.mjs | C | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via connection-cloud integration |
| connection-browser-return.test.mjs | C | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via connection-cloud integration |
| connection-chooser-focus.test.mjs | C | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via connection-cloud integration |
| connection-contracts.test.mjs | G | thin wrapper that runs scripts/test-*.ts child suite(s) | merge (move scripts/test-*.ts body into connection-cloud integration) |
| connection-presentation-state.test.mjs | C | [read] 1012 lines; five indexOf sections of connection-ui.tsx concatenated and run in one vm context | delete; replace with connection integration over the real module |
| connection-recovery-state.test.mjs | C | strips types of a real source file and evals/imports it with substituted imports | delete; cover via connection-cloud integration |
| connection-routes.test.mjs | D+A | compiles several real/staged Java classes together with javac and runs a fixture main on the host JVM | keep; merge-into android-jvm/connection-cloud (Gradle) |
| connection-step-contracts.test.mjs | C+A | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via connection-cloud integration |
| connection-work-lifecycle.test.mjs | C | [read] slices work() out of connection-ui.tsx, vm with 15 fake globals | delete; cover via connection integration |
| contacts-adapter.test.mjs | C | esbuild-bundles a real source with imports replaced by inline stub modules | delete; cover via phone-sms-contacts integration |
| context-selection.test.mjs | C+A | slices a source file between text markers, strips types and evals it with fake globals | delete (browser spec of same name) |
| conversation-history-refresh.test.mjs | A | [read] one regex on connection-ui.tsx (comment says 'Source shape only') | delete |
| conversation-restore-safety.test.mjs | C+A | strips types of a real source file and evals/imports it with substituted imports | delete; cover via shell-settings integration |
| core-runtime-transform.test.mjs | E | uses a specs/quint replay/refinement driver outside the quint- prefix | merge-into one manifest-driven quint runner |
| core-state-patch.test.mjs | F+A | runs a Python unittest of a scripts/ or CI tool | keep; fold into one python runner |
| credential-owner-admission.test.mjs | D | compiles several real/staged Java classes together with javac and runs a fixture main on the host JVM; inline Java test source in a JS template | keep; merge-into android-jvm/connection-cloud (Gradle) |
| credential-slot-lock-order.test.mjs | D | compiles several real/staged Java classes together with javac and runs a fixture main on the host JVM; inline Java test source in a JS template | keep; merge-into android-jvm/connection-cloud (Gradle) |
| credential-stop-dispatch.test.mjs | D | compiles several real/staged Java classes together with javac and runs a fixture main on the host JVM; inline Java test source in a JS template | keep; merge-into android-jvm/connection-cloud (Gradle) |
| cuttlefish-launcher-postboot.test.mjs | F | [read] scripts/verify-cuttlefish-launcher.ts with a fake adb runner | keep; release-tooling |
| dc-lite-keys.test.mjs | D | imports real app modules and drives them with real IO (HTTP server/sqlite/git) | keep; merge-into shell-settings integration |
| deletion-notice-policy.test.mjs | B | imports a real app module and drives it with stub ports | merge-into resident-runtime integration |
| deletion-window.test.mjs | B+A | compiles one product Java class plus a hand-written fixture main with javac (host-JVM unit test); inline Java test source in a JS template | merge-into resident-runtime integration |
| deliver-app-update.test.mjs | F | tests a scripts/ (build/release/CI) module | keep; merge-into release-tooling suite per tool family |
| demo-copy.test.mjs | F | tests a scripts/ (build/release/CI) module | keep; merge-into release-tooling suite per tool family |
| dev-cartesia.test.mjs | F | tests a scripts/ (build/release/CI) module | keep; merge-into release-tooling suite per tool family |
| dev-local-launcher.test.mjs | C | strips types of a real source file and evals/imports it with substituted imports | delete; cover via shell-settings integration |
| dev-speech-settings.test.mjs | F | tests a scripts/ (build/release/CI) module | keep; merge-into release-tooling suite per tool family |
| dev-surface-gates.test.mjs | C | strips types of a real source file and evals/imports it with substituted imports | delete; cover via shell-settings integration |
| dev-ui-remote-host.test.mjs | A | reads source/config text and regex-matches it | delete |
| developer-archive.test.mjs | F+A | tests a scripts/ (build/release/CI) module with real git/fs/child processes | keep; merge-into release-tooling suite per tool family |
| development-cartesia-conversation.test.mjs | D+C | real SDK Cartesia path (prepared SDK only) plus stripped-source cases | keep SDK cases; drop transplant cases |
| development-cloud-voice.test.mjs | C | strips types of a real source file and evals/imports it with substituted imports | delete; cover via voice-speech integration |
| development-conversation-stream.test.mjs | F | tests a scripts/ (build/release/CI) module with real git/fs/child processes | keep; merge-into release-tooling suite per tool family |
| development-voice-navigation.test.mjs | C | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via voice-speech integration |
| device-action-clarification-eval.test.mjs | F | [read] runs scripts/eval-device-action-clarification.ts --self-test | keep or delete with the eval harness |
| device-capability-selection.test.mjs | B | imports a real app module and drives it with stub ports | merge-into resident-runtime integration |
| device-plugin-diagnostics.test.mjs | A | reads source/config text and regex-matches it | delete |
| device-record-presentation.test.mjs | B | imports a real app module and drives it with stub ports | merge-into shell-settings integration |
| diagnostics-export.test.mjs | C+A | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via shell-settings integration |
| digest-capabilities.test.mjs | B | imports a real app module and drives it with stub ports (in a tsx child process) | merge-into workflows-digest integration |
| digest-delegation-host.test.mjs | A | reads source/config text and regex-matches it | delete |
| digest-missed-run-now.test.mjs | D+A | compiles several real/staged Java classes together with javac and runs a fixture main on the host JVM | keep; merge-into android-jvm/workflows-digest (Gradle) |
| digest-occurrence-delivery.test.mjs | D+A | imports real app modules and drives them with real IO (HTTP server/sqlite/git) (in a tsx child process) | keep; merge-into workflows-digest integration |
| digest-pending-storage.test.mjs | D+A | compiles several real/staged Java classes together with javac and runs a fixture main on the host JVM; inline Java test source in a JS template | keep; merge-into android-jvm/workflows-digest (Gradle) |
| digest-restart-input.test.mjs | G+A | thin wrapper that runs scripts/test-*.ts child suite(s) | merge (move scripts/test-*.ts body into workflows-digest integration) |
| digest-route-registration.test.mjs | D+A | imports real app modules and drives them with real IO (HTTP server/sqlite/git) (in a tsx child process) | keep; merge-into workflows-digest integration |
| direct-browser-grounding.test.mjs | B | drives a test/fixtures harness (device-action-policy.mjs) | merge-into browser-view integration |
| direct-browser-transcription.test.mjs | C | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via browser-view integration |
| direct-provider-module-budget.test.mjs | C | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via ci-test-tooling integration |
| direct-transcription-proxy.test.mjs | C+A | strips types of a real source file and evals/imports it with substituted imports | delete; cover via shell-settings integration |
| docs-links.test.mjs | A | reads source/config text and regex-matches it | delete (move any real invariant into the owning artifact audit) |
| embedding-host-admission.test.mjs | F | tests a scripts/ (build/release/CI) module with real git/fs/child processes | keep; merge-into release-tooling suite per tool family |
| embedding-host-preparation.test.mjs | F+A | tests a scripts/ (build/release/CI) module | keep; merge-into release-tooling suite per tool family |
| embedding-host-producer-closure.test.mjs | F+A | tests a scripts/ (build/release/CI) module | keep; merge-into release-tooling suite per tool family |
| embedding-library-source.test.mjs | F | tests a scripts/ (build/release/CI) module | keep; merge-into release-tooling suite per tool family |
| embedding-native-contract.test.mjs | F | tests a scripts/ (build/release/CI) module with real git/fs/child processes | keep; merge-into release-tooling suite per tool family |
| embedding-workflow-forwarding.test.mjs | F+A | runs a Python unittest of a scripts/ or CI tool | keep; fold into one python runner |
| enabled-view-transport.test.mjs | F | tests a scripts/ (build/release/CI) module with real git/fs/child processes | keep; merge-into release-tooling suite per tool family |
| enroll-release-keys.test.mjs | F+A | tests a scripts/ (build/release/CI) module | keep; merge-into release-tooling suite per tool family |
| error-boundary-home-escape.test.mjs | D | imports real app modules and drives them with real IO (HTTP server/sqlite/git) | keep; merge-into shell-settings integration |
| feature-parity.test.mjs | F+A | tests a scripts/ (build/release/CI) module | merge-into ci tooling suite or delete |
| files-agent-patch.test.mjs | F+A | tests a scripts/ (build/release/CI) module | keep; merge-into release-tooling suite per tool family |
| files-browser-atomic-placement.test.mjs | D | imports real app modules and drives them with real IO (HTTP server/sqlite/git) | keep; merge-into camera-photos-files-scan integration |
| files-browser.test.mjs | D+A | compiles several real/staged Java classes together with javac and runs a fixture main on the host JVM | keep; merge-into android-jvm/camera-photos-files-scan (Gradle) |
| files-index.test.mjs | C | strips types of a real source file and evals/imports it with substituted imports | delete; cover via camera-photos-files-scan integration |
| files-legacy-storage.test.mjs | B+A | imports a real app module and drives it with stub ports | merge-into camera-photos-files-scan integration |
| files-picker-lifecycle.test.mjs | C | strips types of a real source file and evals/imports it with substituted imports | delete; cover via camera-photos-files-scan integration |
| files-reviewed-proposal.test.mjs | B | imports a real app module and drives it with stub ports | merge-into camera-photos-files-scan integration |
| files-storage-refusal.test.mjs | C+A | slices Java methods out of product source into a generated Java class and runs it on the host JVM | delete; cover via camera-photos-files-scan integration |
| final-ui-lifecycle.test.mjs | C | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via shell-settings integration |
| first-send-draft-migration.test.mjs | C | uses a transplant fixture (first-send-draft-migration.mjs) that strips/evals real sources in a vm | delete; cover via shell-settings integration |
| flag-off-navigation-protocol.test.mjs | C | strips types of a real source file and evals/imports it with substituted imports | delete; cover via shell-settings integration |
| font-license.test.mjs | F+A | tests a scripts/ (build/release/CI) module | keep; merge-into release-tooling suite per tool family |
| gesture-zones-single-instance.test.mjs | A | [read] regexes over model.js swipe(), template.html and androidTest sources ('stop the source drifting back') | delete |
| gmail-agent-read-host.test.mjs | B | imports a real app module and drives it with stub ports (in a tsx child process) | merge-into inbox-gmail-google integration |
| gmail-background-binding.test.mjs | D+A | compiles several real/staged Java classes together with javac and runs a fixture main on the host JVM | keep; merge-into android-jvm/inbox-gmail-google (Gradle) |
| gmail-background-lock-contention.test.mjs | D | compiles several real/staged Java classes together with javac and runs a fixture main on the host JVM | keep; merge-into android-jvm/inbox-gmail-google (Gradle) |
| gmail-grants.test.mjs | B | [read] pure functions of runtime gmail grants | merge-into inbox integration (or delete as unit) |
| gmail-lifecycle-custody.test.mjs | D | compiles several real/staged Java classes together with javac and runs a fixture main on the host JVM; inline Java test source in a JS template | keep; merge-into android-jvm/inbox-gmail-google (Gradle) |
| gmail-read-ahead.test.mjs | G | thin wrapper that runs scripts/test-*.ts child suite(s) | merge (move scripts/test-*.ts body into inbox-gmail-google integration) |
| google-accounts.test.mjs | G | [read] one line: import '../scripts/test-google-accounts.ts' | merge (move file into test/) |
| google-agent-access.test.mjs | C | strips types of a real source file and evals/imports it with substituted imports | delete; cover via inbox-gmail-google integration |
| google-authorization.test.mjs | B | [read] pure URL allow-list | merge-into connection integration (security boundary: keep the cases) |
| google-browser-auth.test.mjs | D | [read] copies patched upstream auth/android + Alpha overlay tests and runs the upstream node suite twice (360 s) | keep but question: Alpha forks upstream tests (fixtures/google-browser-auth) |
| google-calendar-connect.test.mjs | C | uses a transplant fixture (google-account-panel.mjs) that strips/evals real sources in a vm | delete; cover via calendar integration |
| google-calendar-link-status.test.mjs | B | imports a real app module and drives it with stub ports | merge-into calendar integration |
| google-calendar-selection.test.mjs | G | thin wrapper that runs scripts/test-*.ts child suite(s) | merge (move scripts/test-*.ts body into calendar integration) |
| google-cancel-boundary.test.mjs | C | uses a transplant fixture (google-cancel-boundary.mjs) that strips/evals real sources in a vm | delete; cover via inbox-gmail-google integration |
| google-cancel-committed-key.test.mjs | C | strips types of a real source file and evals/imports it with substituted imports | delete; cover via inbox-gmail-google integration |
| google-connection-return.test.mjs | C+A | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via inbox-gmail-google integration |
| google-connections-resource-budget.test.mjs | C+A | strips types of a real source file and evals/imports it with substituted imports | delete; cover via inbox-gmail-google integration |
| google-maps-content.test.mjs | B | [read] bundles maps cloud-provider/saved-places/state | merge-into maps integration |
| google-native-mfa.test.mjs | C+A | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via inbox-gmail-google integration |
| google-workspace-return-flow.test.mjs | D | compiles several real/staged Java classes together with javac and runs a fixture main on the host JVM; inline Java test source in a JS template | keep; merge-into android-jvm/inbox-gmail-google (Gradle) |
| google-workspace-return-native.test.mjs | D+A | compiles several real/staged Java classes together with javac and runs a fixture main on the host JVM; inline Java test source in a JS template | keep; merge-into android-jvm/inbox-gmail-google (Gradle) |
| google-workspace-return.test.mjs | B | drives a test/fixtures harness (browser-source.mjs) | merge-into inbox-gmail-google integration |
| gradle-verification.test.mjs | F+A | tests a scripts/ (build/release/CI) module | keep; merge-into release-tooling suite per tool family |
| history-initial-state.test.mjs | C | strips types of a real source file and evals/imports it with substituted imports | delete; cover via shell-settings integration |
| home-agent-navigation.test.mjs | C | strips types of a real source file and evals/imports it with substituted imports | delete; cover via resident-runtime integration |
| home-calendar-selection.test.mjs | C | strips types of a real source file and evals/imports it with substituted imports | delete; cover via calendar integration |
| home-cards.test.mjs | C+A | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via shell-settings integration |
| home-google-connection-source.test.mjs | C | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via inbox-gmail-google integration |
| home-inset-layout.test.mjs | C+A | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via shell-settings integration |
| home-overview-cards.test.mjs | B | [read] esbuild-bundles home-overview-cards.ts + upstream cards, renders static markup, regex on markup | delete if browser Home specs cover; else merge-into shell integration |
| home-role-recovery-contract.test.mjs | C+A | [read] regex-extracts showsHome() from MainActivity.java into inline Java classes; reflection fallback for an older onLoss signature | delete |
| home-shell.test.mjs | B | [read] tsImport home-shell.ts + upstream navigation, renders React to static markup and regex-matches markup | delete if browser home/launcher specs cover; else merge-into shell integration |
| home-views-model.test.mjs | C+A | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via shell-settings integration |
| host-speech-admission.test.mjs | F | tests a scripts/ (build/release/CI) module with real git/fs/child processes | keep; merge-into release-tooling suite per tool family |
| hosted-digest-mutation-ownership.test.mjs | E | uses a specs/quint replay/refinement driver outside the quint- prefix | merge-into one manifest-driven quint runner |
| hosted-digest-panel.test.mjs | B | imports a real app module and drives it with stub ports (in a tsx child process) | merge-into workflows-digest integration |
| hosted-digest-refresh-ownership.test.mjs | E | uses a specs/quint replay/refinement driver outside the quint- prefix | merge-into one manifest-driven quint runner |
| hosted-notice-question.test.mjs | C | esbuild-bundles a real source with imports replaced by inline stub modules | delete; cover via workflows-digest integration |
| hosted-notice-withdraw.test.mjs | D | [read] stages patched native, javac NoticeOwner + HostedResultNotices + fixture | keep; merge-into android-jvm/notices |
| hosted-result-notices.test.mjs | D | compiles several real/staged Java classes together with javac and runs a fixture main on the host JVM | keep; merge-into android-jvm/workflows-digest (Gradle) |
| image-contacts-admission.test.mjs | B | imports a real app module and drives it with stub ports | merge-into camera-photos-files-scan integration |
| image-sms.test.mjs | C | esbuild-bundles a real source with imports replaced by inline stub modules | delete; cover via camera-photos-files-scan integration |
| inbox-draft-copies.test.mjs | C | esbuild-bundles a real source with imports replaced by inline stub modules | delete; cover via inbox-gmail-google integration |
| inbox-operation-guards.test.mjs | C | esbuild-bundles a real source with imports replaced by inline stub modules | delete; cover via inbox-gmail-google integration |
| inbox-retention-cases.test.mjs | G | thin wrapper that runs scripts/test-*.ts child suite(s) | merge (move scripts/test-*.ts body into inbox-gmail-google integration) |
| inbox.test.mjs | G+C | [read] 3 child suites + one esbuild stub-bundle case of inbox-unsaved.ts | merge into inbox integration |
| installed-upgrade-runner.test.mjs | A | scans source trees and regex-matches files (lint-like) | delete (move any real invariant into the owning artifact audit) |
| instrumentation-outcome-status.test.mjs | F | tests a scripts/ (build/release/CI) module | keep; merge-into release-tooling suite per tool family |
| invocation-owner-cache.test.mjs | C+A | slices Java methods out of product source into a generated Java class and runs it on the host JVM; inline Java test source in a JS template | delete; cover via resident-runtime integration |
| keyboard-dictation.test.mjs | D+A | compiles several real/staged Java classes together with javac and runs a fixture main on the host JVM; inline Java test source in a JS template | keep; merge-into android-jvm/voice-speech (Gradle) |
| launcher-orientation.test.mjs | A | [read] regex over launcher/standalone AndroidManifest.xml | delete (manifest merge is verified by the APK build/verify-apks) |
| legacy-cloud-recovery.test.mjs | C+A | slices Java methods out of product source into a generated Java class and runs it on the host JVM; inline Java test source in a JS template | delete; cover via connection-cloud integration |
| legacy-hosted-selection.test.mjs | C+A | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via workflows-digest integration |
| lemma-check.test.mjs | A | reads source/config text and regex-matches it | delete |
| lemma-checker.test.mjs | F+A | tests a scripts/ (build/release/CI) module | keep (quint tooling) |
| licenses.test.mjs | F+A | tests a scripts/ (build/release/CI) module | keep; merge-into release-tooling suite per tool family |
| live-asr-route-token.test.mjs | A | [read] three regexes over AlphaLocalAgentPlugin.java | delete |
| live-capture-resource.test.mjs | D+A | compiles several real/staged Java classes together with javac and runs a fixture main on the host JVM | keep; merge-into android-jvm/voice-speech (Gradle) |
| live-voice.test.mjs | D+A | compiles several real/staged Java classes together with javac and runs a fixture main on the host JVM | keep; merge-into android-jvm/voice-speech (Gradle) |
| llama-cpp-only.test.mjs | F | tests a scripts/ (build/release/CI) module with real git/fs/child processes | keep; merge-into release-tooling suite per tool family |
| local-agent-contracts.test.mjs | G | [read] 6 child suites (scripts/test-local-agent*.ts etc.), each a separate node+tsx process | merge into native-resident integration |
| local-agent-feature-starting.test.mjs | C | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via resident-runtime integration |
| local-agent-native-events.test.mjs | C | strips types of a real source file and evals/imports it with substituted imports | delete; cover via resident-runtime integration |
| local-agent-native-stream.test.mjs | B | drives a test/fixtures harness (browser-source.mjs) | delete (browser spec of same name) |
| local-agent-provider-admission.test.mjs | D+A | compiles several real/staged Java classes together with javac and runs a fixture main on the host JVM | keep; merge-into android-jvm/connection-cloud (Gradle) |
| local-agent-selection.test.mjs | F | tests a scripts/ (build/release/CI) module | keep; merge-into release-tooling suite per tool family |
| local-agent-voice-bridge.test.mjs | F | tests a scripts/ (build/release/CI) module with real git/fs/child processes | keep; merge-into release-tooling suite per tool family |
| local-conversation-cleanup.test.mjs | C | strips types of a real source file and evals/imports it with substituted imports | delete; cover via shell-settings integration |
| local-reply-speech.test.mjs | C | strips types of a real source file and evals/imports it with substituted imports | delete; cover via voice-speech integration |
| local-speech-native-drain.test.mjs | C | strips types of a real source file and evals/imports it with substituted imports | delete; cover via voice-speech integration |
| local-speech-playback.test.mjs | C | strips types of a real source file and evals/imports it with substituted imports | delete; cover via voice-speech integration |
| local-speech-text.test.mjs | C | strips types of a real source file and evals/imports it with substituted imports | delete; cover via voice-speech integration |
| locale-time-usage.test.mjs | A | [read] scans apps/app/src for bare toLocaleTimeString with a shrinking allow-list (lint) | replace with an ESLint rule or delete |
| locale-time.test.mjs | B+A | imports a real app module and drives it with stub ports | merge-into shell-settings integration |
| login-surfaces.test.mjs | F+A | tests a scripts/ (build/release/CI) module | keep; merge-into release-tooling suite per tool family |
| mail-html.test.mjs | G | thin wrapper that runs scripts/test-*.ts child suite(s) | merge (move scripts/test-*.ts body into inbox-gmail-google integration) |
| mail-preview.test.mjs | D | imports real app modules and drives them with real IO (HTTP server/sqlite/git) | keep; merge-into inbox-gmail-google integration |
| mail-sender-image.test.mjs | B | [read] pure sender-icon domain mapping | merge-into inbox integration |
| managed-calendar-broker-read-header.test.mjs | B | [read] self re-execs under tsx; imports .eliza/client-features contracts and plugin-calendar (upstream code) | delete or move upstream |
| managed-google-agent-broker.test.mjs | D | imports real app modules and drives them with real IO (HTTP server/sqlite/git) | keep; merge-into inbox-gmail-google integration |
| managed-google-broker-diagnostic.test.mjs | B | imports a real app module and drives it with stub ports | merge-into inbox-gmail-google integration |
| managed-google-stage-diagnostic.test.mjs | B | imports a real app module and drives it with stub ports | merge-into inbox-gmail-google integration |
| managed-google-transport-code.test.mjs | B | imports a real app module and drives it with stub ports | merge-into inbox-gmail-google integration |
| managed-service-routes.test.mjs | C | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via inbox-gmail-google integration |
| map-theme-colors.test.mjs | C+A | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via maps integration |
| maps-chat-markup.test.mjs | C | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via maps integration |
| maps-dataset-manifest.test.mjs | F | runs a Python unittest of a scripts/ or CI tool | keep; fold into one python runner |
| maps-navigation.test.mjs | G | [read] runs upstream plugin-maps navigation-client.test.mjs from the prepared tree | delete (upstream suite runs upstream) |
| maps-notification-open.test.mjs | B+A | compiles one product Java class plus a hand-written fixture main with javac (host-JVM unit test) | merge-into maps integration |
| maps-reroute-freshness.test.mjs | G | thin wrapper that runs scripts/test-*.ts child suite(s) | merge (move scripts/test-*.ts body into maps integration) |
| maps-route-distance.test.mjs | B | [read] pure distanceToRoute re-exported from prepared upstream plugin-maps | delete (upstream function; upstream tests own it) |
| message-draft.test.mjs | B | imports a real app module and drives it with stub ports | merge-into shell-settings integration |
| mobile-uuid-build.test.mjs | F+A | tests a scripts/ (build/release/CI) module | keep; merge-into release-tooling suite per tool family |
| modal-scrim-ownership.test.mjs | D | launches real Chromium from node:test via a fixture (modal-scrim-chromium.mjs) | move to test/browser |
| native-adapter-activity.test.mjs | C | [read] esbuild stub map of 6 relative imports | delete; cover via native adapter integration |
| native-browser-view-binding.test.mjs | B | drives a test/fixtures harness (browser-source.mjs) | merge-into resident-runtime integration |
| native-calendar-sync-port.test.mjs | D | compiles several real/staged Java classes together with javac and runs a fixture main on the host JVM | keep; merge-into android-jvm/calendar (Gradle) |
| native-campaign-evidence.test.mjs | B | drives a test/fixtures harness (isolated-native-campaign.mjs) | merge-into release-build-aosp integration |
| native-cloud-control-jvm.test.mjs | D+A | compiles several real/staged Java classes together with javac and runs a fixture main on the host JVM; inline Java test source in a JS template | keep; merge-into android-jvm/connection-cloud (Gradle) |
| native-cloud-permission-handoff.test.mjs | C | slices Java methods out of product source into a generated Java class and runs it on the host JVM; inline Java test source in a JS template | delete; cover via connection-cloud integration |
| native-cloud-streaming.test.mjs | C | strips types of a real source file and evals/imports it with substituted imports | delete; cover via connection-cloud integration |
| native-connection-headers.test.mjs | C | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via connection-cloud integration |
| native-credential-read.test.mjs | D | compiles several real/staged Java classes together with javac and runs a fixture main on the host JVM; inline Java test source in a JS template | keep; merge-into android-jvm/connection-cloud (Gradle) |
| native-deletion-admission.test.mjs | A | [read] 40 regexes over DeferredDeletionCoordinator (vendor) and Alpha Java | delete |
| native-deletion-review-admission.test.mjs | B | compiles one product Java class plus a hand-written fixture main with javac (host-JVM unit test); inline Java test source in a JS template | merge-into resident-runtime integration |
| native-deletion-review-fence.test.mjs | D | compiles several real/staged Java classes together with javac and runs a fixture main on the host JVM; inline Java test source in a JS template | keep; merge-into android-jvm/resident-runtime (Gradle) |
| native-digest-sources.test.mjs | D | compiles several real/staged Java classes together with javac and runs a fixture main on the host JVM | keep; merge-into android-jvm/workflows-digest (Gradle) |
| native-embedding-profile.test.mjs | C+A | slices Java methods out of product source into a generated Java class and runs it on the host JVM; inline Java test source in a JS template | delete; cover via resident-runtime integration |
| native-enrollment-commit-order.test.mjs | C | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via resident-runtime integration |
| native-google-agent-host-access.test.mjs | B | compiles one product Java class plus a hand-written fixture main with javac (host-JVM unit test) | merge-into inbox-gmail-google integration |
| native-google-agent-host.test.mjs | D | [read] self re-execs under tsx; starts real native Google agent host (scripts/native-google-product-host.ts) with temp access files | keep; merge-into google integration |
| native-google-fetch-input.test.mjs | B | [read] createNativeGoogleCloudPort with fake fetch | merge-into google integration |
| native-google-port-capability.test.mjs | C | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via inbox-gmail-google integration |
| native-live-pcm.test.mjs | B | [read] runJvm on upstream LiveSegmentPipe/BufferedStreamExchange with upstream fixtures, plus one Alpha class | delete the two upstream cases (upstream owns them); merge Alpha binding case into android-jvm |
| native-live-start-cancellation.test.mjs | B | imports a real app module and drives it with stub ports | merge-into resident-runtime integration |
| native-navigation-client-header.test.mjs | B | compiles one product Java class plus a hand-written fixture main with javac (host-JVM unit test); inline Java test source in a JS template | merge-into resident-runtime integration |
| native-network-lifecycle.test.mjs | C | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via resident-runtime integration |
| native-network.test.mjs | B | imports a real app module and drives it with stub ports | merge-into resident-runtime integration |
| native-notification-device-slot.test.mjs | D | compiles several real/staged Java classes together with javac and runs a fixture main on the host JVM; inline Java test source in a JS template | keep; merge-into android-jvm/resident-runtime (Gradle) |
| native-notification-diagnostics.test.mjs | D | compiles several real/staged Java classes together with javac and runs a fixture main on the host JVM; inline Java test source in a JS template | keep; merge-into android-jvm/resident-runtime (Gradle) |
| native-notification-session.test.mjs | D | compiles several real/staged Java classes together with javac and runs a fixture main on the host JVM | keep; merge-into android-jvm/resident-runtime (Gradle) |
| native-patch-admission.test.mjs | F | tests a scripts/ (build/release/CI) module | keep; merge-into release-tooling suite per tool family |
| native-permission-runner.test.mjs | B | drives a test/fixtures harness (isolated-native-campaign.mjs) | merge-into release-build-aosp integration |
| native-plugin-teardown.test.mjs | D+A | compiles several real/staged Java classes together with javac and runs a fixture main on the host JVM | keep; merge-into android-jvm/resident-runtime (Gradle) |
| native-popover-back.test.mjs | C | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via resident-runtime integration |
| native-read-epoch.test.mjs | D+A | compiles several real/staged Java classes together with javac and runs a fixture main on the host JVM; inline Java test source in a JS template | keep; merge-into android-jvm/resident-runtime (Gradle) |
| native-reading-voice-profile.test.mjs | C | strips types of a real source file and evals/imports it with substituted imports | delete; cover via voice-speech integration |
| native-recovery-admission-order.test.mjs | C+A | strips types of a real source file and evals/imports it with substituted imports | delete; cover via resident-runtime integration |
| native-reminder-recovery-runner.test.mjs | B | drives a test/fixtures harness (isolated-native-campaign.mjs) | merge-into release-build-aosp integration |
| native-reminder-runner.test.mjs | B | drives a test/fixtures harness (isolated-native-campaign.mjs) | merge-into release-build-aosp integration |
| native-request-cancel.test.mjs | D+A | compiles several real/staged Java classes together with javac and runs a fixture main on the host JVM; inline Java test source in a JS template | keep; merge-into android-jvm/resident-runtime (Gradle) |
| native-resident-capture.test.mjs | B | imports a real app module and drives it with stub ports | merge-into resident-runtime integration |
| native-resident-request-deadline.test.mjs | D | compiles several real/staged Java classes together with javac and runs a fixture main on the host JVM; inline Java test source in a JS template | keep; merge-into android-jvm/resident-runtime (Gradle) |
| native-restart-runner.test.mjs | B | drives a test/fixtures harness (isolated-native-campaign.mjs) | merge-into release-build-aosp integration |
| native-runtime-identity-boot.test.mjs | D+A | compiles several real/staged Java classes together with javac and runs a fixture main on the host JVM; inline Java test source in a JS template | keep; merge-into android-jvm/resident-runtime (Gradle) |
| native-secure-slots.test.mjs | B+A | imports a real app module and drives it with stub ports | merge-into resident-runtime integration |
| native-start-cancel.test.mjs | C | esbuild-bundles a real source with imports replaced by inline stub modules | delete; cover via resident-runtime integration |
| native-stream-admission.test.mjs | D | compiles several real/staged Java classes together with javac and runs a fixture main on the host JVM; inline Java test source in a JS template | keep; merge-into android-jvm/resident-runtime (Gradle) |
| native-view-fallback-installation.test.mjs | C | strips types of a real source file and evals/imports it with substituted imports | delete; cover via resident-runtime integration |
| native-view-host-integration.test.mjs | C | esbuild-bundles a real source with imports replaced by inline stub modules | delete; cover via resident-runtime integration |
| native-voice-event-worker.test.mjs | D | compiles several real/staged Java classes together with javac and runs a fixture main on the host JVM; inline Java test source in a JS template | keep; merge-into android-jvm/voice-speech (Gradle) |
| native-voice-latency.test.mjs | D+A | compiles several real/staged Java classes together with javac and runs a fixture main on the host JVM | keep; merge-into android-jvm/voice-speech (Gradle) |
| native-voice-listener-rules.test.mjs | A | reads source/config text and regex-matches it | delete |
| native-webview-admission.test.mjs | B | drives a test/fixtures harness (isolated-native-campaign.mjs) | merge-into release-build-aosp integration |
| navigation-voice-pause.test.mjs | C | strips types of a real source file and evals/imports it with substituted imports | delete; cover via voice-speech integration |
| navigation-voice.test.mjs | C | strips types of a real source file and evals/imports it with substituted imports | delete; cover via voice-speech integration |
| node-test-runner.test.mjs | F | [read] copies run-node-tests.ts into a temp repo and checks name-filter/exit forwarding | delete (tests an 18-line wrapper) |
| note-origin.test.mjs | C | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via notes integration |
| note-recorder-permission-recovery.test.mjs | C | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via notes integration |
| note-source-references.test.mjs | A | reads source/config text and regex-matches it | delete |
| notes-capacity-fixture.test.mjs | B | compiles one product Java class plus a hand-written fixture main with javac (host-JVM unit test) | merge-into notes integration |
| notes-deletion-lease.test.mjs | D+A | compiles several real/staged Java classes together with javac and runs a fixture main on the host JVM | keep; merge-into android-jvm/notes (Gradle) |
| notes-empty-close.test.mjs | C | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via notes integration |
| notes-logical-revision.test.mjs | E | uses a specs/quint replay/refinement driver outside the quint- prefix | merge-into one manifest-driven quint runner |
| notes-organize.test.mjs | B | imports a real app module and drives it with stub ports | merge-into notes integration |
| notes-owner-retirement.test.mjs | C+A | strips types of a real source file and evals/imports it with substituted imports | delete; cover via notes integration |
| notes-pending-editor.test.mjs | C | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via notes integration |
| notes-recorder-controls.test.mjs | C+A | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via notes integration |
| notes-recorder-media-admission.test.mjs | E | uses a specs/quint replay/refinement driver outside the quint- prefix | merge-into one manifest-driven quint runner |
| notes-recorder.test.mjs | D+A | compiles several real/staged Java classes together with javac and runs a fixture main on the host JVM | keep; merge-into android-jvm/notes (Gradle) |
| notes-replay-identity.test.mjs | E | [read] reuses specs quint notes-store fixture to run NotesStore/NotesService on a temp dir | merge-into notes integration |
| notes-state-trash-compat.test.mjs | B | imports a real app module and drives it with stub ports | merge-into notes integration |
| notes-store-lifecycle.test.mjs | E | uses a specs/quint replay/refinement driver outside the quint- prefix | merge-into one manifest-driven quint runner |
| notes-trash-read.test.mjs | C | uses a transplant fixture (notes-trash-read.mjs) that strips/evals real sources in a vm | delete; cover via notes integration |
| notes-view-defaults.test.mjs | C | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via notes integration |
| notes-view.test.mjs | B+A | imports a real app module and drives it with stub ports | merge-into notes integration |
| notice-owner-coordinator.test.mjs | B | imports a real app module and drives it with stub ports | merge-into resident-runtime integration |
| notice-owner-startup.test.mjs | C+A | strips types of a real source file and evals/imports it with substituted imports | delete; cover via resident-runtime integration |
| notification-installation-root.test.mjs | D | compiles several real/staged Java classes together with javac and runs a fixture main on the host JVM; inline Java test source in a JS template | keep; merge-into android-jvm/resident-runtime (Gradle) |
| notification-persist-owner-branches.test.mjs | D | compiles several real/staged Java classes together with javac and runs a fixture main on the host JVM; inline Java test source in a JS template | keep; merge-into android-jvm/resident-runtime (Gradle) |
| offline-signed-out-speech.test.mjs | C | strips types of a real source file and evals/imports it with substituted imports | delete; cover via voice-speech integration |
| one-runtime-profile.test.mjs | F+A | runs a Python unittest of a scripts/ or CI tool | keep; fold into one python runner |
| optional-view-channel-chat.test.mjs | C | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via shell-settings integration |
| os-update-enrollment.test.mjs | F | tests a scripts/ (build/release/CI) module | keep; merge-into release-tooling suite per tool family |
| own-notice-question.test.mjs | G | thin wrapper that runs scripts/test-*.ts child suite(s) | merge (move scripts/test-*.ts body into resident-runtime integration) |
| own-provider-cancel-readback.test.mjs | C | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via connection-cloud integration |
| own-provider-host.test.mjs | C | uses a transplant fixture (product-character-host.mjs) that strips/evals real sources in a vm | delete; cover via connection-cloud integration |
| own-provider-service-restore.test.mjs | C+A | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via connection-cloud integration |
| own-provider.test.mjs | B | [read] runJvm on vendor/eliza classes with test/own-provider/*.java; last test reads consumer-host.json | merge-into android-jvm or upstream; same name as a browser spec |
| owned-captures-legacy-path.test.mjs | C+A | slices Java methods out of product source into a generated Java class and runs it on the host JVM; inline Java test source in a JS template | delete; cover via release-build-aosp integration |
| owner-branch-integrity.test.mjs | F | tests a scripts/ (build/release/CI) module | merge-into ci tooling suite or delete |
| owner-emulator-campaign-check.test.mjs | F | tests a scripts/ (build/release/CI) module | merge-into ci tooling suite or delete |
| owner-incident-response.test.mjs | F+A | tests a scripts/ (build/release/CI) module with real git/fs/child processes | merge-into ci tooling suite or delete |
| owner-merge-review.test.mjs | F | tests a scripts/ (build/release/CI) module | merge-into ci tooling suite or delete |
| owner-route-native-import.test.mjs | D | [read] spawns plain node to import owner-route-policy.ts (native TS+JSON loader regression) | keep (cheap loader regression) or fold into typecheck |
| owner-route-parity.test.mjs | D | compiles several real/staged Java classes together with javac and runs a fixture main on the host JVM; inline Java test source in a JS template | keep; merge-into android-jvm/ci-test-tooling (Gradle) |
| owner-sign-aosp-release-edges.test.mjs | F+A | runs a Python unittest of a scripts/ or CI tool | keep; fold into one python runner |
| packaged-runtime.test.mjs | F | [read] wrapper spawning test/packaged-runtime.test.py (real ZIP fixtures) | keep; fold into python-suites runner |
| paired-speech-contract.test.mjs | B | compiles one product Java class plus a hand-written fixture main with javac (host-JVM unit test) | merge-into voice-speech integration |
| paradee-local-adapter.test.mjs | B | compiles one product Java class plus a hand-written fixture main with javac (host-JVM unit test) | merge-into shell-settings integration |
| paradee-runtime.test.mjs | F | tests a scripts/ (build/release/CI) module with real git/fs/child processes | keep; merge-into release-tooling suite per tool family |
| password-dev-editor.test.mjs | B | [read] bundles dev-vault.ts (a developer-only surface) and asserts openEditor refuses | delete (dev-only surface) |
| password-manager-fences.test.mjs | C | esbuild stub-bundle of password-manager.ts (twin of -hidden) | merge with password-manager-hidden/password-manager |
| password-manager-hidden.test.mjs | C | [read] esbuild stub-bundle of password-manager.ts; 49% line overlap with password-manager-fences | merge the three password-manager files into one |
| password-manager.test.mjs | C | [read] esbuild stub map; part of a 3-file password-manager cluster | merge into one password-manager integration |
| pending-action-background-recovery.test.mjs | C | [read] esbuild transformSync of an agent-adapter.ts slice + new Function with 8 injected names | delete |
| pending-action-failure-boundary.test.mjs | C+A | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via shell-settings integration |
| phone-adapter.test.mjs | C+A | esbuild-bundles a real source with imports replaced by inline stub modules | delete; cover via phone-sms-contacts integration |
| phone-dial-agent-flow.test.mjs | B | imports a real app module and drives it with stub ports | merge-into phone-sms-contacts integration |
| phone-info-page.test.mjs | B | imports a real app module and drives it with stub ports | merge-into phone-sms-contacts integration |
| photo-library-permission-owner.test.mjs | D+A | compiles several real/staged Java classes together with javac and runs a fixture main on the host JVM; inline Java test source in a JS template | keep; merge-into android-jvm/camera-photos-files-scan (Gradle) |
| photo-library.test.mjs | B+A | imports a real app module and drives it with stub ports (in a tsx child process) | merge-into camera-photos-files-scan integration |
| photo-selection-cancel.test.mjs | C | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via camera-photos-files-scan integration |
| photo-viewport.test.mjs | B | imports a real app module and drives it with stub ports | merge-into camera-photos-files-scan integration |
| photos-debug-diagnostics.test.mjs | D+A | compiles several real/staged Java classes together with javac and runs a fixture main on the host JVM; inline Java test source in a JS template | keep; merge-into android-jvm/camera-photos-files-scan (Gradle) |
| photos-library-patch.test.mjs | D+A | [read] 393 lines; javac of patched PermittedMediaCatalog against android.jar + sqlite, plus regexes on patched source | keep the JVM/sqlite cases; drop regex cases |
| photos-native-order.test.mjs | D | [read] verbatim copy of the NewestNeverDropped test in photos-library-patch.test.mjs (javac + node:sqlite) | delete (exact duplicate) |
| photos-pending-read.test.mjs | C | slices a source file between text markers, strips types and evals it with fake globals | delete (browser spec of same name) |
| photos-thumbnail-refresh.test.mjs | C | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via camera-photos-files-scan integration |
| photos-view-contract.test.mjs | B | imports a real app module and drives it with stub ports | merge-into camera-photos-files-scan integration |
| photos-view.test.mjs | B+A | imports a real app module and drives it with stub ports | merge-into camera-photos-files-scan integration |
| pilot-rotation-journal.test.mjs | F | tests a scripts/ (build/release/CI) module | keep; merge-into release-tooling suite per tool family |
| pilot-units.test.mjs | F+A | tests a scripts/ (build/release/CI) module | keep; merge-into release-tooling suite per tool family |
| pilot-update-export.test.mjs | F+A | tests a scripts/ (build/release/CI) module | keep; merge-into release-tooling suite per tool family |
| pinned-voice-build.test.mjs | F | tests a scripts/ (build/release/CI) module | keep; merge-into release-tooling suite per tool family |
| pixel-spoken-acks.test.mjs | C | [read] 1679 lines, 90 tests; cloudVoiceViewFixture strips and vm-evals voice views; first test regexes upstream session source | merge-into voice integration; cut to the distinct batch/stream/live cases |
| pixel10a-image.test.mjs | F | tests a scripts/ (build/release/CI) module | keep; merge-into release-tooling suite per tool family |
| pixel10a-source.test.mjs | F | tests a scripts/ (build/release/CI) module with real git/fs/child processes | keep; merge-into release-tooling suite per tool family |
| playwright-projects.test.mjs | F | tests a scripts/ (build/release/CI) module | merge-into ci tooling suite or delete |
| plugin-worker-guard.test.mjs | D+A | compiles several real/staged Java classes together with javac and runs a fixture main on the host JVM | keep; merge-into android-jvm/resident-runtime (Gradle) |
| polish-automation-when.test.mjs | B | imports a real app module and drives it with stub ports | merge-into workflows-digest integration |
| post-sign-in-setup.test.mjs | C+A | slices a source file between text markers, strips types and evals it with fake globals | delete (browser spec of same name) |
| power-cold-native-pin.test.mjs | D | compiles several real/staged Java classes together with javac and runs a fixture main on the host JVM; inline Java test source in a JS template | keep; merge-into android-jvm/resident-runtime (Gradle) |
| power-launch-state.test.mjs | B | [read] pure state function | merge-into native-resident integration or delete |
| power-sense-entry.test.mjs | D+A | compiles several real/staged Java classes together with javac and runs a fixture main on the host JVM; inline Java test source in a JS template | keep; merge-into android-jvm/resident-runtime (Gradle) |
| prepare-local-agent-requalify.test.mjs | A | reads source/config text and regex-matches it | delete (move any real invariant into the owning artifact audit) |
| prepared-navigation-route.test.mjs | C | [read] new Function over stripped prepared-view-navigation.ts + JVM half | delete TS half; JVM half to android-jvm |
| prepared-workflow-worker.test.mjs | F | tests a scripts/ (build/release/CI) module | keep; merge-into release-tooling suite per tool family |
| previous-notes-source-opening.test.mjs | E | uses a specs/quint replay/refinement driver outside the quint- prefix | merge-into one manifest-driven quint runner |
| private-cloud-restore.test.mjs | C+A | strips types of a real source file and evals/imports it with substituted imports | delete; cover via connection-cloud integration |
| private-preview-cartesia-route.test.mjs | C+A | strips types of a real source file and evals/imports it with substituted imports | delete; cover via voice-speech integration |
| product-character-host.test.mjs | C+A | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via shell-settings integration |
| product-identity.test.mjs | B+A | imports a real app module and drives it with stub ports | merge-into release-build-aosp integration |
| production-bundle-audit.test.mjs | F | tests a scripts/ (build/release/CI) module | keep; merge-into release-tooling suite per tool family |
| provider-configuration-cancellation.test.mjs | B+A | imports a real app module and drives it with stub ports | merge-into connection-cloud integration |
| provider-key-manager-bridge.test.mjs | C | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via connection-cloud integration |
| provider-key-release-drain.test.mjs | C | strips types of a real source file and evals/imports it with substituted imports | delete; cover via connection-cloud integration |
| publish-update-manifest.test.mjs | C | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via release-build-aosp integration |
| python-suites.test.mjs | F | [read] runs 5 Python unittests; resident-crash-diagnostic.test.py also runs in resident-android.yml | keep as one tooling runner; run each Python suite once |
| qualified-app-update.test.mjs | F+A | runs a Python unittest of a scripts/ or CI tool | keep; fold into one python runner |
| qualify-head.test.mjs | F | tests a scripts/ (build/release/CI) module with real git/fs/child processes | merge-into ci tooling suite or delete |
| quint-accessible-toast-lifetime.test.mjs | E | [read] driver slices model.js ShellTimers + strips accessibility-timeout.ts into vm, replays 12 traces; also in application aggregate | merge-into one manifest-driven quint runner |
| quint-account-sheet-refinement.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-address-input.test.mjs | E | [read] corpus + model submissions against AddressInput | merge-into one manifest-driven quint runner |
| quint-agent-calendar-event-return.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-agent-calendar-mutation.test.mjs | E | [read] 24 traces/134 checkpoints; same controller as agent-calendar-mutation.test.mjs child suite | merge-into one manifest-driven quint runner |
| quint-agent-calendar-refresh.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-agent-calendar-sync-control.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-android-browser-module-stage.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-android-build-input-readiness.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-android-gzip-asset-stage.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-app-info-handoff-composition.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-app-update-candidate.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-application-refinement.test.mjs | E | [read] AGGREGATE: runApplicationRefinement() runs every application campaign (2400 s budget) that per-model quint-* files also run | delete (duplicate execution) or keep only this and delete the per-model wrappers |
| quint-approval-decision.test.mjs | E | [read] re-execs itself under tsx, then runs approval-decision replay cases | merge-into one manifest-driven quint runner |
| quint-asr-pipe.test.mjs | E | calls a specs/quint refinement/replay driver (Java replay via host JVM) | merge-into one manifest-driven quint runner |
| quint-automatic-app-update-schedule.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-automation-request-settlement.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-back-dispatch.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-batch-capture-completion.test.mjs | E | calls a specs/quint refinement/replay driver (Java replay via host JVM) | merge-into one manifest-driven quint runner |
| quint-bookmarks-hydration.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-browser-album-storage.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-browser-cloud-request-custody.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-browser-deletion-poll.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-browser-files-trash-refinement.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-browser-hosted-result-notice.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-browser-journal-retention-refinement.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-browser-note-recording-journal.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-browser-owner-reminder-action.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-browser-owner-reminder-read.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-browser-reminder-orphan-refinement.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-browser-reviews.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-browser-session-persistence.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-browser-surface-navigation.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-browser-surface-presentation.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-browser-tab-lifecycle.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-calendar-agent-selection.test.mjs | E | [read] replays 38 traces on calendar-adapter.ts; second test mutates the source guard to prove the replay fails (mutation check) | merge-into one manifest-driven quint runner |
| quint-calendar-approval-review.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-calendar-preservation-confirmation.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-camera-focus-writes.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-camera-preview-retirement.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-canonical-calendar-draft-handoff.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-canonical-calendar-draft.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-canonical-calendar-editor-close.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-canonical-notes-controller.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-canonical-notes-draft.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-canonical-notes-feedback.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-canonical-notes-mutation.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-canonical-notes-refinement.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-canonical-notes-view.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-canonical-notification-tap-admission.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-canonical-notification-tap-refinement.test.mjs | E | calls a specs/quint refinement/replay driver (Java replay via host JVM) | merge-into one manifest-driven quint runner |
| quint-capture-frames.test.mjs | E | calls a specs/quint refinement/replay driver (Java replay via host JVM) | merge-into one manifest-driven quint runner |
| quint-changed-models.test.mjs | F | tests scripts/ci changed-model selection | keep (quint tooling) |
| quint-chat-dock.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-checker.test.mjs | F | tests scripts/quint-lib.ts / check-quint.ts | keep (quint tooling) |
| quint-client-feature-publication.test.mjs | E | [read] spawns node -e under tsx to run client-feature-publication conformance | merge-into one manifest-driven quint runner |
| quint-client-observation-support.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-cloud-connection-notices.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-cloud-plan-recheck.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-cloud-qa-launcher.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-combined-agent-launcher-refinement.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-committed-view-observation.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-composer-send.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-composition-refinement.test.mjs | E | [read] AGGREGATE: runCompositionRefinement() (600 s) | delete (duplicate execution) or keep only this |
| quint-conformance.test.mjs | E | [read] own sourceModule() esbuild helper (third copy) + quint CLI trace generation + JSDOM | merge-into one manifest-driven quint runner |
| quint-connection-controller.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-contacts-session.test.mjs | E | [read] bundles contacts-adapter.ts with esbuild stubs and replays ContactsSession traces | merge-into one manifest-driven quint runner |
| quint-copy-receipt.test.mjs | E | calls a specs/quint refinement/replay driver (Java replay via host JVM) | merge-into one manifest-driven quint runner |
| quint-core-approval-service.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-core-interaction-session.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-core-interactive-task-traces.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-core-plugin-lifecycle-refinement.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-core-retirement.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-core-runtime-lifecycle-refinement.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-core-service-lifecycle-design-refinement.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-core-service-lifecycle.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-core-shutdown.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-core-task-scheduling.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-core-task-service-refinement.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-core-turns.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-credential-leases.test.mjs | E | calls a specs/quint refinement/replay driver (Java replay via host JVM) | merge-into one manifest-driven quint runner |
| quint-current-approval-service.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-day-anchor.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-delegation-receiver.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-development-digest-pending.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-device-action-review.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-dock-clearance-ownership.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-domain-document-creation.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-drawer-interaction.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-email-suggestion-review.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-embedding-sql-refinement.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-embedding-store-identity.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-fact-write-dedupe-refinement.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-fact-write-scope.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-files-browser-controller.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-files-filter.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-files-recent-index.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-find-in-page.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-fixture-busy-latch.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-forward-receipts.test.mjs | F | tests the Quint/refinement tooling itself | keep; merge-into release-tooling suite per tool family |
| quint-gmail-agent-mailbox-recovery.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-google-access-publication.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-google-browser-return-claim.test.mjs | E | calls a specs/quint refinement/replay driver (Java replay via host JVM) | merge-into one manifest-driven quint runner |
| quint-google-calendar-access-choice.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-google-calendar-disconnect.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-google-calendar-link-flow.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-google-calendar-link-publication.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-google-consent-admission.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-historical-calendar-navigation.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-historical-camera-session.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-home-failure-notice.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-home-gesture.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-home-instance-handoff.test.mjs | E | [read] replays HomeInstanceHandoff traces on real MainActivity compiled with javac (jvmSkip) | merge-into one manifest-driven quint runner |
| quint-home-surface.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-hosted-background-admission.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-hosted-digest-mutation.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-hosted-digest-refresh.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-hosted-notice-question.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-inbox-cleanup.test.mjs | E | [read] spawns `node -e` that runs services/inbox-cleanup refinement; also in services aggregate | merge-into one manifest-driven quint runner |
| quint-inbox-coordinator.test.mjs | E | spawns a node child that runs a specs/quint refinement driver | merge-into one manifest-driven quint runner |
| quint-inbox-edit-coalescer.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-inbox-list-paging.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-inbox-provider-drafts.test.mjs | E | spawns a node child that runs a specs/quint refinement driver | merge-into one manifest-driven quint runner |
| quint-indicator-provider.test.mjs | E+A | calls a specs/quint refinement/replay driver (Java replay via host JVM) | merge-into one manifest-driven quint runner |
| quint-inert-hold.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-inline-modal-focus.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-keyboard-detectors.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-keyboard-dictation-cloud.test.mjs | E | calls a specs/quint refinement/replay driver (Java replay via host JVM) | merge-into one manifest-driven quint runner |
| quint-keyboard-geometry.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-launcher-favorites.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-launcher-observer.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-launcher-ownership.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-legacy-campaign-report.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-legacy-chat-input-refinement.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-legacy-files-browser-refinement.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-legacy-google-connect-refinement.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-legacy-home-layout-refinement.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-legacy-maps-refinement.test.mjs | E | [read] compares historical Maps against current mounted browser; asserts the exact list of 6 known mismatches | delete with the legacy comparison models (owner decision) |
| quint-legacy-notes-view-refinement.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-legacy-photos-library-refinement.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-legacy-settings-nav-refinement.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-legacy-sign-in-refinement.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-lifeops-scheduled-task-route.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-list-focus-refinement.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-listener-input.test.mjs | E | calls a specs/quint refinement/replay driver (Java replay via host JVM) | merge-into one manifest-driven quint runner |
| quint-listener-service.test.mjs | E | calls a specs/quint refinement/replay driver (Java replay via host JVM) | merge-into one manifest-driven quint runner |
| quint-listener-store.test.mjs | E | calls a specs/quint refinement/replay driver (Java replay via host JVM) | merge-into one manifest-driven quint runner |
| quint-live-capture.test.mjs | E | calls a specs/quint refinement/replay driver (Java replay via host JVM) | merge-into one manifest-driven quint runner |
| quint-map-plane-ownership.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-maps-connection.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-maps-event-return.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-maps-guidance-voice.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-maps-reroute-ownership.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-maps-screen-source.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-maps-share-choice.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-media-copy-intent.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-mms-compose.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-mobile-bundle-admission.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-modal-toast-forwarding.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-mounted-update-admission.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-named-embedding-provenance.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-native-action-recovery.test.mjs | E | calls a specs/quint refinement/replay driver (Java replay via host JVM) | merge-into one manifest-driven quint runner |
| quint-native-app-info-handoff.test.mjs | E | calls a specs/quint refinement/replay driver (Java replay via host JVM) | merge-into one manifest-driven quint runner |
| quint-native-assistant-entry.test.mjs | E | calls a specs/quint refinement/replay driver (Java replay via host JVM) | merge-into one manifest-driven quint runner |
| quint-native-calendar-scoped-review.test.mjs | E | calls a specs/quint refinement/replay driver (Java replay via host JVM) | merge-into one manifest-driven quint runner |
| quint-native-calendar-sync-enable.test.mjs | E | calls a specs/quint refinement/replay driver (Java replay via host JVM) | merge-into one manifest-driven quint runner |
| quint-native-clock-review.test.mjs | E | calls a specs/quint refinement/replay driver (Java replay via host JVM) | merge-into one manifest-driven quint runner |
| quint-native-conformance.test.mjs | E | [read] spawns specs/quint/native/conformance.mjs; asserts stdout matches /conformance/assertions/states/i | merge-into one manifest-driven quint runner |
| quint-native-crash-journal.test.mjs | E | calls a specs/quint refinement/replay driver (Java replay via host JVM) | merge-into one manifest-driven quint runner |
| quint-native-deletion-review-admission.test.mjs | E | calls a specs/quint refinement/replay driver (Java replay via host JVM) | merge-into one manifest-driven quint runner |
| quint-native-digest-consent.test.mjs | E | calls a specs/quint refinement/replay driver (Java replay via host JVM) | merge-into one manifest-driven quint runner |
| quint-native-gmail-background.test.mjs | E | calls a specs/quint refinement/replay driver (Java replay via host JVM) | merge-into one manifest-driven quint runner |
| quint-native-google-access-file.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-native-google-host-artifact.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-native-hosted-inbox.test.mjs | E | calls a specs/quint refinement/replay driver (Java replay via host JVM) | merge-into one manifest-driven quint runner |
| quint-native-hosted-result-notices.test.mjs | E | calls a specs/quint refinement/replay driver (Java replay via host JVM) | merge-into one manifest-driven quint runner |
| quint-native-maps-location.test.mjs | E | calls a specs/quint refinement/replay driver (Java replay via host JVM) | merge-into one manifest-driven quint runner |
| quint-native-mms-dispatch.test.mjs | E | calls a specs/quint refinement/replay driver (Java replay via host JVM) | merge-into one manifest-driven quint runner |
| quint-native-navigation-ownership.test.mjs | E | calls a specs/quint refinement/replay driver (Java replay via host JVM) | merge-into one manifest-driven quint runner |
| quint-native-recording.test.mjs | E | calls a specs/quint refinement/replay driver (Java replay via host JVM) | merge-into one manifest-driven quint runner |
| quint-native-refinement.test.mjs | E | [read] AGGREGATE: runNativeRefinement() over all native campaigns (2400 s) | delete (duplicate execution) or keep only this |
| quint-native-reminder-delivery.test.mjs | E | calls a specs/quint refinement/replay driver (Java replay via host JVM) | merge-into one manifest-driven quint runner |
| quint-native-request-withdrawal.test.mjs | E | calls a specs/quint refinement/replay driver (Java replay via host JVM) | merge-into one manifest-driven quint runner |
| quint-native-settings-handoff.test.mjs | E | calls a specs/quint refinement/replay driver (Java replay via host JVM) | merge-into one manifest-driven quint runner |
| quint-native-sms-dispatch.test.mjs | E | calls a specs/quint refinement/replay driver (Java replay via host JVM) | merge-into one manifest-driven quint runner |
| quint-native-source-renewal.test.mjs | E | calls a specs/quint refinement/replay driver (Java replay via host JVM) | merge-into one manifest-driven quint runner |
| quint-native-stream-bridge.test.mjs | E | calls a specs/quint refinement/replay driver (Java replay via host JVM) | merge-into one manifest-driven quint runner |
| quint-native-text-scale-lifecycle.test.mjs | E | calls a specs/quint refinement/replay driver (Java replay via host JVM) | merge-into one manifest-driven quint runner |
| quint-native-update-activation.test.mjs | E | calls a specs/quint refinement/replay driver (Java replay via host JVM) | merge-into one manifest-driven quint runner |
| quint-native-update-composition.test.mjs | E | calls a specs/quint refinement/replay driver (Java replay via host JVM) | merge-into one manifest-driven quint runner |
| quint-native-update-staging.test.mjs | E | calls a specs/quint refinement/replay driver (Java replay via host JVM) | merge-into one manifest-driven quint runner |
| quint-native-view-subscription.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-native-voice-draft.test.mjs | E | calls a specs/quint refinement/replay driver (Java replay via host JVM) | merge-into one manifest-driven quint runner |
| quint-navigation-progress.test.mjs | E | calls a specs/quint refinement/replay driver (Java replay via host JVM) | merge-into one manifest-driven quint runner |
| quint-note-permission.test.mjs | E | calls a specs/quint refinement/replay driver (Java replay via host JVM) | merge-into one manifest-driven quint runner |
| quint-note-source-dialog.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-note-web-source-dialog.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-notes-coordinator-refinement.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-notes-document-transfer.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-observation-turn-dispatch.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-on-device-recognizer.test.mjs | E | calls a specs/quint refinement/replay driver (Java replay via host JVM) | merge-into one manifest-driven quint runner |
| quint-os-application-refinement.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-own-notice-question.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-password-provider-dialog.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-pending-action-recovery.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-permission-choices.test.mjs | E | [read] runs permission-choices refinement; same test title and 12 shared scenario names as quint-permission-coordinator-refinement | merge with quint-permission-coordinator-refinement (one driver) |
| quint-permission-coordinator-refinement.test.mjs | E | [read] runs startup-permissions-coordinator refinement; scenario list is a subset of quint-permission-choices | merge with quint-permission-choices |
| quint-personal-assistant-scheduled-task-custody.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-phone-recents.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-phone-session.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-photos-owned-album.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-photos-trash.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-photos-window.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-pilot-update-refinement.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-piped-capture.test.mjs | E | calls a specs/quint refinement/replay driver (Java replay via host JVM) | merge-into one manifest-driven quint runner |
| quint-plan-admission-grace.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-plugin-connector-custody.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-prepared-source-stamp.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-prepared-workflow-worker.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-previous-notes-availability.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-provider-execution-refinement.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-quiet-voice-retry.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-recognizer-availability.test.mjs | E | calls a specs/quint refinement/replay driver (Java replay via host JVM) | merge-into one manifest-driven quint runner |
| quint-recovery-ui-refinement.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-recovery-vad-conformance.test.mjs | E | calls a specs/quint refinement/replay driver (Java replay via host JVM) | merge-into one manifest-driven quint runner |
| quint-refinement-campaigns.test.mjs | F | [read] tests campaigns.mjs failure retention with synthetic campaigns | keep (quint tooling) |
| quint-refinement-harness.test.mjs | F | [read] tests check-traces.mjs literal/collection encoding | keep (quint tooling) |
| quint-reminder-decision.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-reminder-intents.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-reminder-refresh.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-reminder-tap-tokens.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-reminder-todo-attempt.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-renderer-background-rebuild.test.mjs | E | calls a specs/quint refinement/replay driver (Java replay via host JVM) | merge-into one manifest-driven quint runner |
| quint-renderer-digest-queue.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-renderer-hosted-inbox.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-renderer-refinement.test.mjs | E | calls a specs/quint refinement/replay driver (Java replay via host JVM) | merge-into one manifest-driven quint runner |
| quint-renderer-speech-chunk.test.mjs | E | calls a specs/quint refinement/replay driver (Java replay via host JVM) | merge-into one manifest-driven quint runner |
| quint-resident-java-source-stage.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-resident-liveness.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-resident-maps-relay-offer.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-resident-refinement.test.mjs | E | calls a specs/quint refinement/replay driver (Java replay via host JVM) | merge-into one manifest-driven quint runner |
| quint-resident-scheduling-admission.test.mjs | E | calls a specs/quint refinement/replay driver (Java replay via host JVM) | merge-into one manifest-driven quint runner |
| quint-resident-start-cancel.test.mjs | E | calls a specs/quint refinement/replay driver (Java replay via host JVM) | merge-into one manifest-driven quint runner |
| quint-retained-home-brief.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-reviewed-copies-refinement.test.mjs | E | calls a specs/quint refinement/replay driver (Java replay via host JVM) | merge-into one manifest-driven quint runner |
| quint-reviewed-workflow-launcher-refinement.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-room-handler-queue.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-runtime-update-pause-refinement.test.mjs | E | calls a specs/quint refinement/replay driver (Java replay via host JVM) | merge-into one manifest-driven quint runner |
| quint-saved-service-read.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-saved-sign-in-recovery.test.mjs | E | calls a specs/quint refinement/replay driver (Java replay via host JVM) | merge-into one manifest-driven quint runner |
| quint-scan-conformance.test.mjs | E | spawns a node child that runs a specs/quint refinement driver | merge-into one manifest-driven quint runner |
| quint-scan-review-dialogs.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-scheduled-snooze-admission.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-screen-focus-ownership.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-selected-document-viewer.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-service-read-cache.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-services-refinement.test.mjs | E | [read] AGGREGATE: spawns runServicesRefinement() over all service campaigns (2400 s) | delete (duplicate execution) or keep only this |
| quint-settings-capability-reads.test.mjs | E+A | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-settings-listener-reads.test.mjs | E+A | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-settings-session.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-shade-pull.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-shade-row-custody.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-share-panel-admission.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-shared-recording.test.mjs | E | calls a specs/quint refinement/replay driver (Java replay via host JVM) | merge-into one manifest-driven quint runner |
| quint-shell-screen.test.mjs | E+A | [read] replays ShellScreen traces on shell methods; also regex-asserts template/model text | merge-into quint runner; drop regex assertions |
| quint-signin-refinement.test.mjs | E | spawns a node child that runs a specs/quint refinement driver | merge-into one manifest-driven quint runner |
| quint-single-flight-refinement.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-sms-send.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-source-bundle-capture.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-source-renewal-question.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-speech-cleanup-latch.test.mjs | E | calls a specs/quint refinement/replay driver (Java replay via host JVM) | merge-into one manifest-driven quint runner |
| quint-speech-gate.test.mjs | E | calls a specs/quint refinement/replay driver (Java replay via host JVM) | merge-into one manifest-driven quint runner |
| quint-speech-output-preparation.test.mjs | E | calls a specs/quint refinement/replay driver (Java replay via host JVM) | merge-into one manifest-driven quint runner |
| quint-speech-warmup.test.mjs | E | calls a specs/quint refinement/replay driver (Java replay via host JVM) | merge-into one manifest-driven quint runner |
| quint-startup-update-admission.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-state-inventory.test.mjs | F | [read] unit tests of specs/quint/refinement/model-state.mjs on temp .qnt files | keep (quint tooling) |
| quint-system-picker-visibility.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-task-scheduler-refinement.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-task-scheduler-runtime-refinement.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-task-service-refinement.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-tla-inventory.test.mjs | F | tests quint-lib / prepare-quint-history with a git fixture | keep (quint tooling) |
| quint-trigger-cursor.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-vault-coordinator-refinement.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-video-edit-review.test.mjs | E | calls a specs/quint refinement/replay driver (Java replay via host JVM) | merge-into one manifest-driven quint runner |
| quint-video-recorder.test.mjs | E | calls a specs/quint refinement/replay driver (Java replay via host JVM) | merge-into one manifest-driven quint runner |
| quint-view-admission.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-voice-owned-navigation.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-voice-transcript-follow-refinement.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-web-reading-review.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-workflow-clock-admission.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-workflow-engine-refinement.test.mjs | E | spawns a node child that runs a specs/quint refinement driver | merge-into one manifest-driven quint runner |
| quint-workflow-execution-audit-admission.test.mjs | E | spawns a node child that runs a specs/quint refinement driver | merge-into one manifest-driven quint runner |
| quint-workflow-lifecycle-change.test.mjs | E | spawns a node child that runs a specs/quint refinement driver | merge-into one manifest-driven quint runner |
| quint-workflow-local-source.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-workflow-notice-delivery-refinement.test.mjs | E | calls a specs/quint refinement/replay driver (Java replay via host JVM) | merge-into one manifest-driven quint runner |
| quint-workflow-request-recovery-admission.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| quint-workflow-tasks-refinement.test.mjs | E | [read] spawns `node -e` running workflow-scheduler/registration refinement | merge-into one manifest-driven quint runner |
| quint-workflow-wakeups-refinement.test.mjs | E | spawns a node child that runs a specs/quint refinement driver | merge-into one manifest-driven quint runner |
| quint-workflow-worker-staging.test.mjs | E | calls a specs/quint refinement/replay driver | merge-into one manifest-driven quint runner |
| read-aloud-direct.test.mjs | C | strips types of a real source file and evals/imports it with substituted imports | delete; cover via voice-speech integration |
| reading-capability-probe.test.mjs | B | [read] createReadingSupport with fake bridge | merge-into browser integration |
| recently-deleted.test.mjs | C+A | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via notes integration |
| record-release.test.mjs | F | [read] scripts/record-release.ts against a temp checkout | keep; release-tooling |
| recovery-restart-action.test.mjs | C | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via resident-runtime integration |
| recovery-restart-presentation.test.mjs | C+A | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via resident-runtime integration |
| redaction-connection-switch.test.mjs | B | imports a real app module and drives it with stub ports | merge-into connection-cloud integration |
| redeemed-plan-end.test.mjs | C | strips types of a real source file and evals/imports it with substituted imports | delete; cover via connection-cloud integration |
| release-signing.test.mjs | F+A | tests a scripts/ (build/release/CI) module | keep; merge-into release-tooling suite per tool family |
| reminder-capability-negotiation.test.mjs | B | imports a real app module and drives it with stub ports (in a tsx child process) | merge-into calendar integration |
| reminder-card-presentation.test.mjs | B | imports a real app module and drives it with stub ports | merge-into calendar integration |
| reminder-deletions.test.mjs | B | imports a real app module and drives it with stub ports | merge-into calendar integration |
| reminder-lifecycle-pure.test.mjs | C+A | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via calendar integration |
| reminder-open-intent.test.mjs | C | uses a transplant fixture (reminder-open-intent.mjs) that strips/evals real sources in a vm | delete; cover via calendar integration |
| renderer-recovery-budget.test.mjs | B+A | [read] runJvm(RendererRecoveryBudget + fixture); second test regexes MainActivity.java | merge-into android-jvm; drop regex test |
| renderer-slot-deployment-namespace.test.mjs | D | compiles several real/staged Java classes together with javac and runs a fixture main on the host JVM; inline Java test source in a JS template | keep; merge-into android-jvm/resident-runtime (Gradle) |
| renderer-slot-policy.test.mjs | C | slices Java methods out of product source into a generated Java class and runs it on the host JVM; inline Java test source in a JS template | delete; cover via resident-runtime integration |
| reset-cloud-revocation.test.mjs | D | compiles several real/staged Java classes together with javac and runs a fixture main on the host JVM; inline Java test source in a JS template | keep; merge-into android-jvm/connection-cloud (Gradle) |
| reset-startup.test.mjs | D+A | compiles several real/staged Java classes together with javac and runs a fixture main on the host JVM; inline Java test source in a JS template | keep; merge-into android-jvm/connection-cloud (Gradle) |
| reset-wiring.test.mjs | C+A | slices Java methods out of product source into a generated Java class and runs it on the host JVM; inline Java test source in a JS template | delete; cover via connection-cloud integration |
| resident-admission-outcome.test.mjs | B | imports a real app module and drives it with stub ports | merge-into resident-runtime integration |
| resident-agent-fixture-provider-status.test.mjs | C | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via connection-cloud integration |
| resident-android-json-compile.test.mjs | D | compiles several real/staged Java classes together with javac and runs a fixture main on the host JVM | keep; merge-into android-jvm/resident-runtime (Gradle) |
| resident-attachment.test.mjs | D+A | compiles several real/staged Java classes together with javac and runs a fixture main on the host JVM | keep; merge-into android-jvm/resident-runtime (Gradle) |
| resident-auto-retry.test.mjs | C+A | [read] slices connection-ui.tsx into vm; one test also regex-matches the source | delete; cover via connection integration |
| resident-binding-guard-return.test.mjs | C | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via resident-runtime integration |
| resident-build-output.test.mjs | D | [read] runs tsc declaration emit over vendor knowledge sources in a temp dir | move upstream or delete |
| resident-crash-diagnostics.test.mjs | F | [read] spawns scripts/ci/test-resident-uid-crash-audit.py | keep; fold into python-suites runner |
| resident-credential-shutdown-retry.test.mjs | C+A | slices Java methods out of product source into a generated Java class and runs it on the host JVM; inline Java test source in a JS template | delete; cover via connection-cloud integration |
| resident-explicit-panel-startup.test.mjs | C | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via resident-runtime integration |
| resident-native-ci-admission.test.mjs | F+A | runs a Python unittest of a scripts/ or CI tool | keep; fold into one python runner |
| resident-native-patch-admission.test.mjs | F+A | tests a scripts/ (build/release/CI) module with real git/fs/child processes | keep; merge-into release-tooling suite per tool family |
| resident-prebind-stop.test.mjs | C | [read] section() slices from local-agent.ts and connection-ui.tsx concatenated into a data: module | delete |
| resident-recovery-review.test.mjs | D+A | compiles several real/staged Java classes together with javac and runs a fixture main on the host JVM; inline Java test source in a JS template | keep; merge-into android-jvm/resident-runtime (Gradle) |
| resident-recovery.test.mjs | C+A | slices a source file between text markers, strips types and evals it with fake globals | delete (browser spec of same name) |
| resident-result-transport.test.mjs | D | compiles several real/staged Java classes together with javac and runs a fixture main on the host JVM; inline Java test source in a JS template | keep; merge-into android-jvm/resident-runtime (Gradle) |
| resident-retirement-cleanup.test.mjs | C | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via resident-runtime integration |
| resident-start-failure-policy.test.mjs | C+A | [read] brace-matches a Java method out of AlphaLocalAgentPlugin.java into a generated class; second test is pure regex/includes | delete |
| restored-history-limits.test.mjs | C | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via shell-settings integration |
| retained-reminder-tap-admission.test.mjs | C | uses a transplant fixture (retained-reminder-tap.mjs) that strips/evals real sources in a vm | delete; cover via calendar integration |
| retired-shell-work.test.mjs | C | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via shell-settings integration |
| runtime-licenses.test.mjs | F+A | tests a scripts/ (build/release/CI) module | keep; merge-into release-tooling suite per tool family |
| runtime-source-clone.test.mjs | F+A | runs a Python unittest of a scripts/ or CI tool | keep; fold into one python runner |
| saved-note-speech-policy.test.mjs | D | compiles several real/staged Java classes together with javac and runs a fixture main on the host JVM; inline Java test source in a JS template | keep; merge-into android-jvm/voice-speech (Gradle) |
| saved-note-transcript.test.mjs | B | imports a real app module and drives it with stub ports | merge-into notes integration |
| sbom.test.mjs | F+A | tests a scripts/ (build/release/CI) module with real git/fs/child processes | keep; merge-into release-tooling suite per tool family |
| scan-all-day-draft.test.mjs | B | [read] pure scan-event draft functions | merge-into camera/scan integration |
| scan-document-draft-ownership.test.mjs | F | tests a scripts/ (build/release/CI) module | keep; merge-into release-tooling suite per tool family |
| scan-document-drafts.test.mjs | C | esbuild-bundles a real source with imports replaced by inline stub modules | delete; cover via camera-photos-files-scan integration |
| scan-event.test.mjs | B | imports a real app module and drives it with stub ports | delete (browser spec of same name) |
| scan-page-camera.test.mjs | C | strips types of a real source file and evals/imports it with substituted imports | delete (browser spec of same name) |
| scan-review-pdf-errors.test.mjs | C+A | esbuild-bundles a real source with imports replaced by inline stub modules | delete; cover via camera-photos-files-scan integration |
| scanned-calendar-handoff.test.mjs | C+A | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via calendar integration |
| scheduled-task-controls.test.mjs | C | uses a transplant fixture (scheduled-task-controls.mjs) that strips/evals real sources in a vm | delete; cover via workflows-digest integration |
| scoped-calendar-snapshot.test.mjs | D | compiles several real/staged Java classes together with javac and runs a fixture main on the host JVM; inline Java test source in a JS template | keep; merge-into android-jvm/calendar (Gradle) |
| scripts-typescript.test.mjs | A | [read] git ls-files scripts, asserts no .js/.mjs and that each .ts strips on Node 26 (lint) | delete (typecheck already enforces) |
| secure-store-memory.test.mjs | D | compiles several real/staged Java classes together with javac and runs a fixture main on the host JVM | keep; merge-into android-jvm/resident-runtime (Gradle) |
| selection-ask-readiness.test.mjs | C | esbuild-bundles a real source with imports replaced by inline stub modules | delete; cover via resident-runtime integration |
| sense-packaging-ndk.test.mjs | A | reads source/config text and regex-matches it | delete (move any real invariant into the owning artifact audit) |
| serial-storage-tasks.test.mjs | B+A | [read] javac SerialStorageTasks + fixture; second test regexes AlphaConnectionPlugin.java | merge-into android-jvm; drop regex test |
| service-read-cache.test.mjs | B | imports a real app module and drives it with stub ports | merge-into shell-settings integration |
| settings-refresh-text-scale.test.mjs | C | [read] slices refresh() from settings-adapter.ts into vm with ~25 fake globals | delete; one settings integration covers text scale |
| settings-signout-confirm.test.mjs | C | [read] regex-extracts two onClick arrow functions from connection-ui.tsx JSX and runs them in vm | delete |
| settings-text-scale-refresh.test.mjs | C | [read] slices exported mergeDeviceFacts by text instead of importing it | delete; merge into settings integration |
| settings-text-scale-settlement.test.mjs | C | [read] slices exported textScaleSettlement by text instead of importing it | delete; merge into settings integration |
| settings-truth.test.mjs | C+A | slices a source file between text markers, strips types and evals it with fake globals | delete (browser spec of same name) |
| shade-notice-question.test.mjs | C | uses a transplant fixture (shade-notice-question.mjs) that strips/evals real sources in a vm | delete; cover via resident-runtime integration |
| shade-row-custody.test.mjs | C | uses a transplant fixture (shade-row-custody.mjs) that strips/evals real sources in a vm | delete; cover via shell-settings integration |
| shade-tile-facts.test.mjs | C+A | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via shell-settings integration |
| share-panel-adapter.test.mjs | C | strips types of a real source file and evals/imports it with substituted imports | delete; cover via camera-photos-files-scan integration |
| share-panel-watch.test.mjs | C | strips types of a real source file and evals/imports it with substituted imports | delete; cover via camera-photos-files-scan integration |
| shared-deletion-window.test.mjs | D+A | compiles several real/staged Java classes together with javac and runs a fixture main on the host JVM | keep; merge-into android-jvm/resident-runtime (Gradle) |
| shared-onboarding-account-return.test.mjs | C | [read] slices update() from connection-ui.tsx (CONTROLLER_SOURCE override knob) | delete |
| shell-navigation-detent.test.mjs | C | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via shell-settings integration |
| sign-in-incomplete-queue.test.mjs | C | strips types of a real source file and evals/imports it with substituted imports | delete; cover via connection-cloud integration |
| sign-release-apks.test.mjs | F+A | tests a scripts/ (build/release/CI) module | keep; merge-into release-tooling suite per tool family |
| sms-action-journal.test.mjs | D | [read] javac shared SmsSendJournal + product SmsActionJournalResult + fixture | keep; merge-into android-jvm/phone |
| sms-agent-flow.test.mjs | B | imports a real app module and drives it with stub ports | merge-into phone-sms-contacts integration |
| sms-incomplete-rows.test.mjs | C | esbuild-bundles a real source with imports replaced by inline stub modules | delete; cover via phone-sms-contacts integration |
| source-renewal-notices.test.mjs | D | compiles several real/staged Java classes together with javac and runs a fixture main on the host JVM | keep; merge-into android-jvm/resident-runtime (Gradle) |
| source-renewal-question.test.mjs | C | esbuild-bundles a real source with imports replaced by inline stub modules | delete; cover via shell-settings integration |
| source-snapshot.test.mjs | F | [read] runs scripts/source-snapshot.ts in temp roots | keep; release-tooling |
| speech-output-warmup.test.mjs | D+A | compiles several real/staged Java classes together with javac and runs a fixture main on the host JVM | keep; merge-into android-jvm/voice-speech (Gradle) |
| startup-access-flow.test.mjs | B | imports a real app module and drives it with stub ports | merge-into resident-runtime integration |
| startup-permission-completion.test.mjs | D | imports real app modules and drives them with real IO (HTTP server/sqlite/git) | keep; merge-into resident-runtime integration |
| startup-warning-retention.test.mjs | C | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via resident-runtime integration |
| stopped-reply-match.test.mjs | B+A | imports a real app module and drives it with stub ports | merge-into shell-settings integration |
| stopped-reply-outcome.test.mjs | C | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via shell-settings integration |
| streaming-speech.test.mjs | D+A | compiles several real/staged Java classes together with javac and runs a fixture main on the host JVM | keep; merge-into android-jvm/voice-speech (Gradle) |
| strict-build-inputs.test.mjs | F+A | tests a scripts/ (build/release/CI) module | keep; merge-into release-tooling suite per tool family |
| strip-types-compat.test.mjs | F | [read] tests test/support/strip-types.mjs itself | delete with transplant helpers |
| subscription-entitlement.test.mjs | C+A | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via connection-cloud integration |
| system-bar-appearance.test.mjs | B+A | [read] imports system-bar-appearance.ts with fake shell; third test regexes main.tsx and AlphaDevicePlugin.java | merge-into shell integration; drop the regex test |
| system-notice-collapse.test.mjs | C+A | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via resident-runtime integration |
| system-shade-timeout.test.mjs | C | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via shell-settings integration |
| system-shade.test.mjs | B+A | imports a real app module and drives it with stub ports | merge-into shell-settings integration |
| task-service-sql-concurrency.test.mjs | E | uses a specs/quint replay/refinement driver outside the quint- prefix | merge-into one manifest-driven quint runner |
| task-service-stop.test.mjs | F | tests a scripts/ (build/release/CI) module | keep; merge-into release-tooling suite per tool family |
| telephony-agent-flow.test.mjs | B | imports a real app module and drives it with stub ports | merge-into phone-sms-contacts integration |
| telephony-attention-lifecycle.test.mjs | C | esbuild-bundles a real source with imports replaced by inline stub modules | delete; cover via phone-sms-contacts integration |
| telephony-executor.test.mjs | B | [read] esbuild bundle of telephony-executor.ts against recording ports | merge-into phone integration |
| telephony-presenters.test.mjs | B | imports a real app module and drives it with stub ports | merge-into phone-sms-contacts integration |
| template-style-cache.test.mjs | C | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via shell-settings integration |
| test-helpers.test.mjs | F | [read] tests test/fixtures/source-text.mjs and child-suite.mjs | delete with the helpers they test |
| theme-palette.test.mjs | B | imports a real app module and drives it with stub ports | merge-into shell-settings integration |
| toast-undo-offer.test.mjs | C | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via shell-settings integration |
| trigger-cursor-isolation.test.mjs | E | uses a specs/quint replay/refinement driver outside the quint- prefix | merge-into one manifest-driven quint runner |
| trusted-worker-prelude.test.mjs | B | imports pinned upstream (vendor/eliza) code directly and unit-tests it | merge-into resident-runtime integration |
| tts-worker-lifecycle.test.mjs | G | thin wrapper that runs scripts/test-*.ts child suite(s) | merge (move scripts/test-*.ts body into voice-speech integration) |
| update-apk-admission.test.mjs | F | tests a scripts/ (build/release/CI) module | keep; merge-into release-tooling suite per tool family |
| update-channel.test.mjs | F | tests scripts/update-channel.ts | keep; release-tooling |
| upstream-native-source.test.mjs | F | tests a scripts/ (build/release/CI) module with real git/fs/child processes | keep; merge-into release-tooling suite per tool family |
| upstream-owner-gate-compat.test.mjs | B+A | imports a real app module and drives it with stub ports | merge-into release-build-aosp integration |
| upstream-pin-guard.test.mjs | F | tests a scripts/ (build/release/CI) module with real git/fs/child processes | keep; merge-into release-tooling suite per tool family |
| upstream-reachability.test.mjs | F | tests a scripts/ (build/release/CI) module | keep; merge-into release-tooling suite per tool family |
| use-in-email-review.test.mjs | C | uses a transplant fixture (use-in-email-review.mjs) that strips/evals real sources in a vm | delete; cover via inbox-gmail-google integration |
| verify-apks.test.mjs | F+A | runs a Python unittest of a scripts/ or CI tool | keep; fold into one python runner |
| video-capture-limit.test.mjs | C | strips types of a real source file and evals/imports it with substituted imports | delete; cover via camera-photos-files-scan integration |
| view-navigation-settle.test.mjs | B | drives a test/fixtures harness (browser-source.mjs) | merge-into shell-settings integration |
| voice-assistant.test.mjs | B | [read] 918 lines; real VoiceAssistantSession + live-segment-stream with fake clock/capture/speaker | keep as voice integration core (rename); same name as a browser spec |
| voice-call-interrupted-capture.test.mjs | C | [read] cloudVoiceViewFixture (vm transplant of voice views) | merge-into voice integration |
| voice-calm-cloud-errors.test.mjs | C | uses a transplant fixture (cloud-voice-view.mjs,shared-batch-voice.mjs) that strips/evals real sources in a vm | delete; cover via voice-speech integration |
| voice-capture-lifecycle.test.mjs | C | strips types of a real source file and evals/imports it with substituted imports | delete; cover via voice-speech integration |
| voice-capture-retirement.test.mjs | B | imports a real app module and drives it with stub ports | merge-into voice-speech integration |
| voice-completed-action-context.test.mjs | C | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via voice-speech integration |
| voice-composer-recovery.test.mjs | B | imports a real app module and drives it with stub ports | delete (browser spec of same name) |
| voice-context-loss.test.mjs | C | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via voice-speech integration |
| voice-copy-presentation.test.mjs | C+A | uses a transplant fixture (cloud-voice-view.mjs) that strips/evals real sources in a vm | delete; cover via voice-speech integration |
| voice-credit-terminal.test.mjs | C | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via voice-speech integration |
| voice-denied-recovery.test.mjs | C+A | strips types of a real source file and evals/imports it with substituted imports | delete; cover via voice-speech integration |
| voice-entry-timing.test.mjs | C | uses a transplant fixture (cloud-voice-view.mjs,cloud-voice-view.mjs) that strips/evals real sources in a vm | delete; cover via voice-speech integration |
| voice-fixture-failure-metadata.test.mjs | F | [read] tests the observeVoiceFixture diagnostic wrapper (test fixture tooling) | delete |
| voice-host-absent-admission.test.mjs | F | tests a scripts/ (build/release/CI) module | keep; merge-into release-tooling suite per tool family |
| voice-host-record.test.mjs | F+A | tests a scripts/ (build/release/CI) module | keep; merge-into release-tooling suite per tool family |
| voice-in-chat-only.test.mjs | C+A | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via voice-speech integration |
| voice-owned-capture-cleanup.test.mjs | C | uses a transplant fixture (cloud-voice-view.mjs) that strips/evals real sources in a vm | delete; cover via voice-speech integration |
| voice-prepared-navigation.test.mjs | C | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via voice-speech integration |
| voice-progress-presentation.test.mjs | C | uses a transplant fixture (cloud-voice-view.mjs) that strips/evals real sources in a vm | delete; cover via voice-speech integration |
| voice-progress-state-forwarding.test.mjs | C | esbuild-bundles a real source with imports replaced by inline stub modules | delete; cover via voice-speech integration |
| voice-recovery-state.test.mjs | C | [read] regex-extracts onState/onError callbacks from voice-adapter.ts and evals them | delete |
| voice-repeated-interim.test.mjs | C | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via voice-speech integration |
| voice-replies.test.mjs | C | strips types of a real source file and evals/imports it with substituted imports | delete; cover via voice-speech integration |
| voice-request-provenance.test.mjs | C | esbuild-bundles a real source with imports replaced by inline stub modules | delete; cover via voice-speech integration |
| voice-requested-actions.test.mjs | C | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via voice-speech integration |
| voice-selection.test.mjs | C+A | strips types of a real source file and evals/imports it with substituted imports | delete; cover via voice-speech integration |
| voice-start-failure-copy.test.mjs | C+A | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via voice-speech integration |
| voice-timing.test.mjs | B | imports a real app module and drives it with stub ports | delete (browser spec of same name) |
| voice-turn-routes.test.mjs | C+A | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via voice-speech integration |
| wallet-disabled.test.mjs | C+A | [read] strips/rewrites mvp-features.ts and aosp-image.ts imports into data: modules, plus regex over manifests, Java and data-adapter.ts | delete; move the NFC/wallet manifest+plugin ban into scripts/audit-production-bundle.ts or verify-apks |
| white-label-copy.test.mjs | B+A | imports a real app module and drives it with stub ports | merge-into release-build-aosp integration |
| workflow-adapter-recovery.test.mjs | C+A | strips types of a real source file and evals/imports it with substituted imports | delete; cover via workflows-digest integration |
| workflow-approval-notice-identity.test.mjs | B | imports a real app module and drives it with stub ports (in a tsx child process) | merge-into workflows-digest integration |
| workflow-approval-notice.test.mjs | D | compiles several real/staged Java classes together with javac and runs a fixture main on the host JVM | keep; merge-into android-jvm/workflows-digest (Gradle) |
| workflow-approval-poster.test.mjs | B | imports a real app module and drives it with stub ports | merge-into workflows-digest integration |
| workflow-canonical-notes.test.mjs | C | [read] slices an if-block out of agent-adapter.ts and wraps it in an async function | delete; cover via workflows integration |
| workflow-definition-bounds.test.mjs | B | imports a real app module and drives it with stub ports (in a tsx child process) | merge-into workflows-digest integration |
| workflow-device-bindings-fixture.test.mjs | F | [read] asserts the vm fixture installs every connection-ui import (test of a transplant fixture) | delete with the transplant harnesses |
| workflow-device-registration.test.mjs | B | imports a real app module and drives it with stub ports (in a tsx child process) | merge-into workflows-digest integration |
| workflow-draft-reopen.test.mjs | C+A | strips types of a real source file and evals/imports it with substituted imports | delete; cover via workflows-digest integration |
| workflow-execution-presentation.test.mjs | C | uses a transplant fixture (workflow-execution-fixture.mjs) that strips/evals real sources in a vm | delete; cover via workflows-digest integration |
| workflow-lifecycle-resend.test.mjs | C+A | strips types of a real source file and evals/imports it with substituted imports | delete; cover via workflows-digest integration |
| workflow-management-capability.test.mjs | C | strips types of a real source file and evals/imports it with substituted imports | delete; cover via workflows-digest integration |
| workflow-notice-delivery.test.mjs | D | compiles several real/staged Java classes together with javac and runs a fixture main on the host JVM | keep; merge-into android-jvm/workflows-digest (Gradle) |
| workflow-notice-return.test.mjs | B | imports a real app module and drives it with stub ports (in a tsx child process) | merge-into workflows-digest integration |
| workflow-output-contract.test.mjs | B | [read] spawns tsx children that import three runtime workflow modules | merge-into workflows integration |
| workflow-presentation-probe.test.mjs | C | esbuild-bundles a real source with imports replaced by inline stub modules | delete; cover via workflows-digest integration |
| workflow-reminder-contract.test.mjs | B | imports a real app module and drives it with stub ports (in a tsx child process) | merge-into calendar integration |
| workflow-reminder-midnight.test.mjs | C | slices a source file between text markers, strips types and evals it with fake globals | delete; cover via calendar integration |
| workflow-reminder-read.test.mjs | B | imports a real app module and drives it with stub ports (in a tsx child process) | merge-into calendar integration |
| workflow-reply-markup.test.mjs | B | imports a real app module and drives it with stub ports | merge-into workflows-digest integration |
| workflow-scope.test.mjs | B | imports a real app module and drives it with stub ports | merge-into workflows-digest integration |
| workflow-source-publication.test.mjs | B | imports pinned upstream (vendor/eliza) code directly and unit-tests it | merge-into workflows-digest integration |
| workflow-trigger-detection.test.mjs | B+A | imports a real app module and drives it with stub ports | merge-into workflows-digest integration |
| workflow-typed-schedule.test.mjs | B | imports a real app module and drives it with stub ports (in a tsx child process) | merge-into workflows-digest integration |
| workflow-worker-assets.test.mjs | B | compiles one product Java class plus a hand-written fixture main with javac (host-JVM unit test); inline Java test source in a JS template | merge-into release-build-aosp integration |
| workspace-return-fallback.test.mjs | D | compiles several real/staged Java classes together with javac and runs a fixture main on the host JVM; inline Java test source in a JS template | keep; merge-into android-jvm/shell-settings (Gradle) |
