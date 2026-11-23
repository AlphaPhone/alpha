# Chunk test-51: voice, wallet, white-label and workflow host tests (35 files)

All 35 assigned files exist and were read in full. Per-file reports are in `docs/simplification-audit/files/test/<name>.md`.

## Files

| File | Kind | Verdict | Target |
|---|---|---|---|
| test/voice-replies.test.mjs | transplant (6 sources in vm) + cloud-voice-view fixture | DELETE | 3 cases → `journeys/voice.spec.ts` |
| test/voice-request-provenance.test.mjs | dev-module bundle with stubs + connection-ui slice | DELETE | 1 security case → `journeys/voice.spec.ts` |
| test/voice-requested-actions.test.mjs | connection-ui slice (same as above) | DELETE | ask-first case → `journeys/voice.spec.ts` |
| test/voice-selection.test.mjs | transplant + source-text + D8 switch + A1 keys | REWRITE | `test/integration/voice.test.mjs` (real import; route, holds, failure-hold table) |
| test/voice-start-failure-copy.test.mjs | marker slices of voice-adapter / cloud-voice | DELETE | copy cases → `journeys/voice.spec.ts` |
| test/voice-timing.test.mjs | unit + tooling (aggregator CLI) | MERGE | CLI part → `test/tooling/voice-latency.test.mjs` |
| test/voice-turn-routes.test.mjs | real-module integration + slices + Java regex | REWRITE | `test/integration/voice.test.mjs` (keep real-module cases) |
| test/wallet-disabled.test.mjs | transplant + source-text + upstream + always-skip | DELETE | NFC ban → `verify-apks.ts`; connector ban → agent staging |
| test/white-label-copy.test.mjs | source-text + personal-Cloud render | DELETE | "no Eliza in user copy" → `audit-production-bundle.ts` |
| test/workflow-adapter-recovery.test.mjs | adapter vm transplant + Lemma-proven tables | DELETE | version-mismatch case → `test/integration/workflows-protocol.test.mjs` |
| test/workflow-approval-notice-identity.test.mjs | unit in `node -e` | MERGE | `workflows-protocol.test.mjs` |
| test/workflow-approval-notice.test.mjs | host-JVM integration | KEEP (move) | Gradle `WorkflowNoticeTest` |
| test/workflow-approval-poster.test.mjs | unit of upstream poster | DELETE | upstream follow-up |
| test/workflow-canonical-notes.test.mjs | if-block slice; **already broken** | DELETE | 1 case → `journeys/workflows.spec.ts` |
| test/workflow-definition-bounds.test.mjs | real protocol modules, `node -e` | MERGE | `workflows-protocol.test.mjs` |
| test/workflow-device-bindings-fixture.test.mjs | test of fixture | DELETE | none |
| test/workflow-device-registration.test.mjs | unit in `node -e` | MERGE | `workflows-protocol.test.mjs` |
| test/workflow-draft-reopen.test.mjs | authoring vm transplant | DELETE | 3 cases → `journeys/workflows.spec.ts` |
| test/workflow-execution-presentation.test.mjs | transplant fixture + jsdom | DELETE | `journeys/workflows.spec.ts` |
| test/workflow-lifecycle-resend.test.mjs | transplant + real route client | MERGE (tests 8-9) | `workflows-protocol.test.mjs` |
| test/workflow-management-capability.test.mjs | adapter vm transplant | DELETE | 1 case → `journeys/workflows.spec.ts` |
| test/workflow-notice-delivery.test.mjs | host-JVM integration | KEEP (move) | Gradle `WorkflowNoticeTest` |
| test/workflow-notice-return.test.mjs | `node -e` (test 1 real, test 2 upstream) | MERGE test 1 | `workflows-protocol.test.mjs` |
| test/workflow-output-contract.test.mjs | real protocol modules, `node -e` | MERGE | `workflows-protocol.test.mjs` |
| test/workflow-presentation-probe.test.mjs | unit, Capacitor stub bundle | DELETE | with B2 cleanup of the probe |
| test/workflow-reminder-contract.test.mjs | real device-contract, `node -e` | MERGE | `workflows-protocol.test.mjs` |
| test/workflow-reminder-midnight.test.mjs | slice of dev simulator | DELETE | optional dev Playwright case |
| test/workflow-reminder-read.test.mjs | real module, `node -e` | MERGE | `workflows-protocol.test.mjs` |
| test/workflow-reply-markup.test.mjs | unit (bundled parser) | REWRITE | 2 cases → `journeys/chat.spec.ts` |
| test/workflow-scope.test.mjs | unit of upstream filter | DELETE | upstream `workflow-scope.test.ts` |
| test/workflow-source-publication.test.mjs | unit of vendor code | DELETE | upstream follow-up |
| test/workflow-trigger-detection.test.mjs | unit of dev simulator + source-text | DELETE | Lemma, Quint, dev spec already cover |
| test/workflow-typed-schedule.test.mjs | real protocol modules, `node -e` | MERGE | `workflows-protocol.test.mjs` |
| test/workflow-worker-assets.test.mjs | tooling + host-JVM | KEEP (split) | `test/tooling/workflow-worker.test.mjs` + Gradle JUnit |
| test/workspace-return-fallback.test.mjs | host-JVM integration | KEEP (move) | Gradle `GoogleWorkspaceReturnTest` |

Counts: DELETE 18, MERGE/REWRITE 13, KEEP (moved to Gradle/tooling) 4.

## Coverage that is lost unless a replacement lands
- **Voice-requested actions bound to the accepted final transcript** (`voice-request-provenance`, `voice-requested-actions`). It is security-relevant and no browser spec asserts it. A replacement is needed in `journeys/voice.spec.ts`.
- **Network-speech failure hold table** (`voice-selection` 60-103). It is kept only if the REWRITE lands; the module first needs an injectable snapshot reader.
- **Workflow Notes read refuses edited notes** (`workflow-canonical-notes`). This is already lost: the test is broken because its slice marker was removed by the legacy Notes deletion.
- **Upstream modules with no upstream test**: the `workflow-source-publication` safety cases and the `workflow-approval-poster` stale-owner and withdraw cases. These need D14 upstream follow-ups before deletion. `workflow-scope` and `notice-routes` already have upstream tests.
- **Android route allowlist for `/heard` and end-of-turn** (`voice-turn-routes` 258-274). This needs a JVM test of the `AlphaLocalAgentPlugin` route policy.
- **NFC/wallet manifest ban and wallet-connector inventory ban** (`wallet-disabled`). These need to move into `verify-apks.ts` and agent staging.
- **"No other product name in user copy"** (`white-label-copy`). This needs to move into the bundle and APK audit.
- **Draft persistence across reopen, owner change and conflict** (`workflow-draft-reopen`). `dev-workflow-authoring.spec.ts` should be checked and the three cases added.

## Shared helpers worth keeping
- `test/integration/workflows-protocol.test.mjs` (new). It imports `workflow-protocol`, `phone-workflow-authoring`, `workflow-device-contract`, `workflow-presentation` and `workflow-reminder-read` directly under tsx. It takes over the eight `node -e` and prelude files.
- `test/fixtures/workflow-worker-assets.mjs`. It survives because a Quint refinement imports it.
- `test/fixtures/jvm-tools.mjs` and `native-source.mjs`. They stay only until the JVM tests move to Gradle (they have many other importers).

## Cross-file actions
- Delete `test/fixtures/workflow-execution-fixture.mjs` and `workflow-execution-markup.mjs`. Their only importer is `workflow-execution-presentation`.
- Delete `test/fixtures/workflow-device-bindings.mjs` together with `resident-explicit-panel-startup.test.mjs` and `scripts/test-connection-history.ts`.
- `scripts/workflow-renderer-fixture.ts`: once the three adapter transplant tests here go, its remaining importers are `fixtures/workflow-execution-fixture.mjs`, four `scripts/test-workflow-*-ui-flow.ts` and `specs/quint/refinement/services/workflow-adapter-fixture.mjs` (that last one needs a T10 port).
- Product: the local `createWorkflowApprovalPoster` in `apps/app/src/runtime/workflow-device-contract.ts:123` has no importer (A2/A7). Delete it.
- Product: delete `setVoiceSendPolicyForTests` / `voiceSendPolicyForTests` in `voice-selection.ts:22-27` (D8).
- Product: the probe in `workflow-presentation.ts` treats a missing native method as protocol 1 (B2).
- The JVM wrappers (`workflow-approval-notice`, `workflow-notice-delivery`, `workspace-return-fallback`, `workflow-worker-assets` test 2) should become one Gradle `src/test` source set. There is no `android/app/src/test` today.
- Test runner: load tsx once so files stop re-spawning themselves (T9 in three files).

## Owner questions
1. Do agents without `manualSubmissionProtocol`, `typedScheduleProtocol` or lifecycle support still need supporting? This decides whether the "legacy agent" protocol branches tested in `workflow-definition-bounds` and `workflow-typed-schedule` stay.
2. Should the `WorkflowWorkerAssets` sweep of the "legacy in-tree package stamp" (`.installed-package`) be deleted under D1?
3. Is the development workflow simulator (`browser/workflow-triggers.ts`, `development-workflows.ts`) staying long term? Its Lemma proof and Quint replay keep it alive under D20.
