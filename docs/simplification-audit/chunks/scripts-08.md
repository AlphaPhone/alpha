# Chunk scripts-08: summary

31 files reviewed (5 in `scripts/ci/`, 26 top-level scripts). Reports are under `files/scripts/`.

| File | Kind | Verdict | Target / note |
|---|---|---|---|
| scripts/ci/test-recovery-ui-guard.py | tooling test (Python, fake adb + captured transcripts) | MOVE | `test/ci/recovery-ui-guard.test.py` + fixtures to `test/fixtures/recovery/`; drop duplicate run in `resident-android.yml:569` |
| scripts/ci/test-resident-phase.py | tooling/integration test (real subprocess supervisor) | MOVE | `test/ci/resident-phase.test.py`; skip off Linux instead of requiring `GITHUB_ACTIONS`; run once (now in two workflows); drop result receipt |
| scripts/ci/test-resident-uid-crash-audit.py | tooling test | MOVE | `test/ci/`, run by `test/python-suites.test.mjs`; delete wrapper `test/resident-crash-diagnostics.test.mjs` |
| scripts/ci/upstream-reachability.json | data (recorded upstream compare) | KEEP | drop unread fields `baseCommit`, `command` (and maybe `pullRequests`) |
| scripts/ci/verify-cloud-signing-input.sh | CI release gate | KEEP | move inline Python into an `admit-cloud-signing-input.py` subcommand |
| scripts/cloud-deployment-policy.ts | config constant | KEEP | absorbs `cloud-sdk-authority.ts` |
| scripts/cloud-deployment.ts | generator + verify gate | KEEP + SIMPLIFY | remove `LegacyCloudRecovery` wording, single namespace constant, less self-validation |
| scripts/cloud-email-code.ts | dev-server module | KEEP | move with `browser-cloud-dev-bridge.ts` to `scripts/dev-server/` |
| scripts/cloud-readiness.ts | operator CLI (README runbook) | KEEP + SIMPLIFY | shared arg/JSON helpers, drop aliases |
| scripts/cloud-resident-host.ts | dev-server host for `dev:cloud` | KEEP + SIMPLIFY | split 1,000-char env statements, one key validator, `selectOwn` via generic op; move to `scripts/dev-server/` |
| scripts/cloud-sdk-authority.ts | derived constant | MERGE | into `cloud-deployment-policy.ts` (update 4 Quint text pins) |
| scripts/cloud-subscription-latency.ts | one-off probe | DELETE | no caller anywhere |
| scripts/combined-agent-source.ts | source snapshot hasher | KEEP / DELETE with `start-combined-agent.ts` | owner question |
| scripts/compare-prototype.py | orphan Python image diff | DELETE | no caller; undeclared numpy/Pillow |
| scripts/copy-file-clone.ts | shared copy helper | KEEP + SIMPLIFY | un-export test-only planners |
| scripts/core-state-patch.ts | build/runtime source-pin gate | KEEP + SIMPLIFY | rename (nothing is patched), derive loader filter from target list, drop duplicate check; receipt shape change only with its readers |
| scripts/core-state-preload.ts | Bun preload | KEEP + SIMPLIFY | frozen-manifest branch goes with `start-combined-agent.ts` |
| scripts/deliver-app-update.ts | release publication | KEEP + SIMPLIFY | dead `verified` flag, shared hash/gh/args/offer type; legacy-floor is an owner question |
| scripts/dev-cartesia.ts | dev helper | MERGE | into `start-local-remote.ts` with shared `readPrivateFile` |
| scripts/dev-cloud.ts | dev launcher | KEEP + SIMPLIFY | shared launcher helper with `dev-local.ts` |
| scripts/dev-local.ts | dev launcher | KEEP + SIMPLIFY | client features prepared twice under `npm run dev` (`predev` + in-script); drop `dev:local` alias |
| scripts/dev-speech-settings.ts | dev helper | KEEP + SIMPLIFY | delete RENAMED/RETIRED refusals (A1), shared private-file read |
| scripts/dev-ui-remote-host.ts | undocumented dev tool | DELETE (owner Q) | only its own test calls it |
| scripts/developer-archive.ts | manual campaign tool | KEEP (owner Q) | goes if archive-based campaigns go |
| scripts/embedding-build-remap.ts | build helper | MERGE | into `prepare-embedding-host.ts`; unused parameter |
| scripts/embedding-native-contract.ts | build/admission contract | KEEP + SIMPLIFY | delete unreachable `exported` JNI mode (pin uses RegisterNatives) |
| scripts/enroll-release-keys.ts | release ceremony tool | KEEP + SIMPLIFY | swallowed parse error weakens debug-key refusal; shared helpers |
| scripts/eval-device-action-clarification.ts | manual model eval + self-test | KEEP (owner Q) + delete self-test | delete `test/device-action-clarification-eval.test.mjs` (T5) |
| scripts/feature-manifest.ts | inventory tool | DELETE | D15, with `test/support/feature-parity.mjs` and its tests |
| scripts/fetch-alpha-os-preset-inputs.py | manual AOSP fetcher | KEEP + SIMPLIFY | `assert`-based safety checks are stripped by `-O` |
| scripts/fingerprint-voice-assets.ts | one-off evidence tool | DELETE | remove its entry from `test/llama-cpp-only.test.mjs:36` regex |

## Behaviour that would lose all coverage if the DELETEs happen
- None that matters to the product. Five deletions are tools with no caller (`cloud-subscription-latency`, `compare-prototype`, `fingerprint-voice-assets`, `dev-ui-remote-host`, `feature-manifest`). Each one covered only itself.
- `feature-manifest.ts`: the comparison of Alpha's mobile feature registration with Eliza's goes away. Nothing else checks for drift in upstream feature registration. If that check is wanted, one assertion in a product-registration integration test can replace it.
- `eval-device-action-clarification --self-test`: only harness behaviour loses coverage. The live eval stays as a manual tool.

## Shared helpers worth creating (from this chunk)
- `scripts/lib/private-file.ts`: `readPrivateFile(path,{maxBytes})`. It opens the file with O_NOFOLLOW and requires an owner-only regular file. Today the same check is written three times: `dev-cartesia.ts`, `dev-speech-settings.ts:18-33` and `cloud-resident-host.ts:93-95`.
- `scripts/lib/launcher.ts`: `assertPortFree`, preparing the source and client features, and dev profile paths. `dev-local.ts` and `dev-cloud.ts` share it.
- These copies should switch to the existing C3 targets: `sha` in `combined-agent-source`, `core-state-patch`, `deliver-app-update` and `developer-archive`; `readJson` in `cloud-readiness` and `enroll-release-keys`; `parseArgs` in `cloud-readiness`, `deliver-app-update`, `developer-archive` and `enroll-release-keys`; `git()` in `combined-agent-source`, `developer-archive` and `eval-device-action-clarification`; `gh()` in `deliver-app-update`.
- `UpdateOffer` type: export it from `update-channel.ts`. It is currently declared in both `deliver-app-update.ts` and `app-update-candidate.ts`.

## Cross-file actions
1. `package.json`: drop `dev:local` (it duplicates `dev`). Remove either the `predev` hook or the `prepareClientFeatures()` call in `dev-local.ts`, so it runs only once.
2. `.github/workflows/resident-android.yml:569`: remove the second run of `test-recovery-ui-guard.py`. Run `test-resident-phase.py` in one workflow, not in both `resident-prepare.yml:31` and `resident-android.yml:244`.
3. `test/python-suites.test.mjs`: after the moves to `test/ci/`, make this the only runner. Delete `test/resident-crash-diagnostics.test.mjs`.
4. Merging `cloud-sdk-authority.ts` means updating `specs/quint/services/manifest.json`, `refinement/application/boundaries.mjs` and `refinement/services/cloud-qa-launcher{,-probe}.mjs`. These are text and path pins (T10).
5. Moving `cloud-email-code.ts` and `cloud-resident-host.ts` to `scripts/dev-server/` means updating `scripts/quint-lib.ts` `runtimeScriptPaths` and the source and symbol pins in `specs/quint/application/manifest.json`.
6. Renaming `core-state-patch.ts` touches 16 Quint harnesses that import it, plus `verify-packaged-runtime.py` and `source-snapshot.ts` (`CORE_STATE_INPUTS` path lists). Change the receipt shape only together with `native-google-host-artifact.ts` and `verify-packaged-runtime.py`.
7. `publish-qualified-app-update.yml:146-150`: delete the fallback for `deliver-app-update.mjs`.
8. `test/llama-cpp-only.test.mjs:36`: remove `fingerprint-voice-assets` from the allow-list.
9. `speech-env.ts`: drop `RENAMED`/`RETIRED`, together with `dev-speech-settings.ts`.

## Owner questions
- Does any phone still follow the old `app-stable` update tag? `deliver-app-update.ts` `checkLegacyFloor` and `LEGACY_APP_UPDATE_TAG` protect versionCode monotonicity there. They are deletable only if no phone does.
- Do you still run `start-combined-agent.ts`? If not, delete it together with `combined-agent-source.ts`, `combinedCoreRuntime` and the frozen branch of `core-state-preload.ts`. That changes `CORE_STATE_INPUTS` once.
- Do you still use `dev-ui-remote-host.ts`, which has no npm entry and no docs? If yes, add an npm script; if not, delete it with its test.
- Do archive-based device campaigns, and so `developer-archive.ts`, stay?
- Is `eval-device-action-clarification.ts` still run by hand? If yes, add `npm run eval:clarification`; if not, delete it.
