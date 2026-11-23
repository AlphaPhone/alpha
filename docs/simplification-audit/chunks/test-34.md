# Chunk test-34: test/fixtures (google-cancel … native-source)

| File | Kind | Verdict | Target |
|---|---|---|---|
| test/fixtures/google-cancel-boundary.mjs | transplant (slices `cloud-protocol.ts` + `cloud-connection.ts`, vm eval) | DELETE | with `test/google-cancel-boundary.test.mjs`; cases → `journeys/connection-cloud.spec.ts` |
| test/fixtures/hosted-digest-refresh.jsx | Quint refinement port (real `HostedDigestPanel` in Chromium) | KEEP + SIMPLIFY, MOVE | `specs/quint/refinement/application/fixtures/`; delete if Q-HOST-5 retires hosted digests |
| test/fixtures/isolated-native-campaign.mjs | tooling fixture (fake adb/aapt SDK, spawns campaign runners) | SIMPLIFY (owner decision) | merge 7 importers into `test/tooling/native-campaign-runners.test.mjs`, or delete with the manual runners |
| test/fixtures/jvm-tools.mjs | test support (JDK, org.json, `runJvm`) | KEEP, shrink, MOVE | `test/support/jvm.mjs` |
| test/fixtures/kotlin-tools.mjs | test support + CI provisioning | KEEP, MOVE | `--prepare` → `scripts/ci/prepare-host-kotlin.ts`; `compileKotlin` → `test/support/jvm.mjs` |
| test/fixtures/legacy-cloud-recovery/LegacyCloudRecoveryTest.java | (deleted) | DELETE (done) | — |
| test/fixtures/legacy-cloud-recovery/ProviderCancellationTest.java | (deleted) | DELETE (done) | — |
| test/fixtures/legacy-cloud-recovery/ProviderConditionalClearTest.java | (deleted) | DELETE (done) | — |
| test/fixtures/legacy-cloud-recovery/ProviderOwnKeysTest.java | (deleted) | DELETE (done) | — |
| test/fixtures/legacy-cloud-recovery/RendererRecoverySlotsTest.java | (deleted) | DELETE (done) | — |
| test/fixtures/legacy-cloud-recovery/StoreIntegrationTest.java | (deleted) | DELETE (done) | — |
| test/fixtures/lifeops-scheduled-task-route.mjs | Quint refinement fixture of upstream scheduling (esbuild + PGlite) | KEEP; PORT one text slice | needs upstream exports of `selectedPersonalAssistantPolicies`/`registerDossierActivityAnchor`; drop hash/git ceremony |
| test/fixtures/mobile-uuid-build.mjs | tooling fixture (mobile bundle inputs) | KEEP | host importer merges into release-tooling suite |
| test/fixtures/modal-scrim-chromium.mjs | Chromium driver (real adapters on fake `Shell`) | KEEP for the model; host test REWRITE | `journeys/home-shell.spec.ts`; move beside harness |
| test/fixtures/native-google-host-builder-port.mjs | Quint refinement fixture (fake bun executable) | KEEP + SIMPLIFY, MOVE | `specs/quint/refinement/services/fixtures/` |
| test/fixtures/native-source.mjs | test support (patched native staging) | KEEP | absorb `sharedSpeechSource` from jvm-tools |

## Coverage lost if the DELETEs happen
- **Google sign-in cancellation races** (unconfirmed/ambiguous cancel reply keeps polling; failed cancel is retryable;
  confirmed cancel aborts poll and closes popup). Only `google-cancel-boundary` covers this. Needs a
  `journeys/connection-cloud.spec.ts` case with a fake Cloud route, or an integration test importing `CloudProtocol`
  and `BrowserCloudSignIn` with an injected `browserCloudCall`.
- Legacy Cloud recovery: intentionally gone with the feature (D1); nothing to replace.
- If the manual native campaign runners are retired, their host contract tests go with them; device acceptance evidence
  then has no host-side check of instrumentation-output parsing beyond `android-instrumentation-runner.test.mjs`.

## Shared helpers worth keeping
- `runJvm` / `javaBinary` / `jvmSkip` (jvm-tools): the one JVM runner; ~70 inline javac copies, `calendar-sync-snapshot-jvm.mjs`
  and `specs/quint/refinement/native/java.mjs` should use it.
- `prepareNativeFixture` / `noticeSources` (native-source) plus `sharedSpeechSource` moved in.
- `compileKotlin` (kotlin-tools), used by `os-defaults` and `browser-underlay` harnesses.

## Cross-file actions
- Five fixtures here serve only Quint harnesses (`hosted-digest-refresh.jsx`, `lifeops-scheduled-task-route.mjs`,
  `modal-scrim-chromium.mjs`, `native-google-host-builder-port.mjs`, and `mobile-uuid-build.mjs` once its host test
  merges): move under `specs/quint/refinement/<layer>/fixtures/` and update harness paths and bound-input lists
  (`native-google-host-artifact.mjs:40`, `hosted-digest-refresh.mjs:10`).
- Delete the host duplicates of aggregate Quint runs: `test/quint-hosted-digest-refresh.test.mjs`,
  `test/quint-lifeops-scheduled-task-route.test.mjs`, `test/modal-scrim-ownership.test.mjs` (T4).
- `.github/workflows/android.yml:62` and `browser.yml:57` call `node test/fixtures/kotlin-tools.mjs --prepare`: move to
  the Quint lane setup only (P3/P5).
- `isolated-native-campaign.mjs:18-19` duplicates the kind → androidTest class#method registry of
  `scripts/android-instrumentation.ts` and the runner scripts; export once and import.
- Kind `notes-secure-migration` (fixture, `scripts/test-native-restart.ts`, `NotesSecureStorageInstrumentedTest#secureMigrationProcessRestartPhase`)
  is a legacy localStorage-layout migration test: delete under D1.
- `hosted-digest-refresh.jsx` phase-less journal seed ties to delete-candidate B297 / Q-LEG-11 (model + Lemma
  `digestPhaseDiscardable` change together).
- Upstream follow-up (D14): export the two personal-assistant policy functions so `lifeops-scheduled-task-route.mjs`
  stops slicing `runtime-wiring.ts`.

## Owner questions
1. Do the manual native device campaign runners (`scripts/test-native-*.ts`, `test-calendar-regression.ts`,
   `test-reminder-*.ts`, `android-workflow-native.ts`) stay? That decides whether `isolated-native-campaign.mjs` and 7
   host tests are merged or deleted.
2. Q-HOST-5: are hosted digests / Cloud read delegation in PRD scope? If not, `hosted-digest-refresh.jsx`, the
   HostedDigestRefresh/HostedDigestMutation/SourceRenewalQuestion models and four host tests go together.
3. Should Quint models of upstream-only code (LifeOps scheduled-task route, personal-assistant custody) stay here or
   move upstream?
