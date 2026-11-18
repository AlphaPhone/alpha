# Chunk test-31: test/fixtures (Java update/notice drivers, identity, auth contract, Android stage fixtures)

| File | Lines | Kind | Verdict | Target |
|---|---|---|---|---|
| test/fixtures/UpdateFlowTest.java | 2225 | transplant + host-JVM integration; shared support of 3 Quint native update harnesses | KEEP helpers / SIMPLIFY scenarios / PORT | split into `UpdateFixture.java` + scenarios beside `specs/quint/refinement/native/`; compile a real extracted `AppUpdateFlow` instead of the `exactUpdateMembers` text slice |
| test/fixtures/WorkflowApprovalNoticeTest.java | 232 | host-JVM integration of upstream notice ledger via Alpha pass-through wrappers (T5) | DELETE (lines 70-104 are A1 legacy bytes) | optional 4-case merge into `test/android/workflow-notices.test.mjs` |
| test/fixtures/WorkflowNoticeDeliveryTest.java | 39 | same (T5) | DELETE | optional 2 cases into the same merged driver |
| test/fixtures/WorkflowNoticeRecoveryTest.java | 23 | same, upstream `NoticeRecovery` (T5) | DELETE | none |
| test/fixtures/WorkflowNoticeTapsTest.java | 81 | same, upstream `NoticeRoutes` (T5) | DELETE | optional 1 case into the merged driver |
| test/fixtures/agent-identity-canonical.test.ts | 116 | integration (real upstream runtime + `scripts/agent-identity.ts`); test 8 source-text | KEEP 1, 4-7 / DELETE 8 / owner Q on 2-3 / MOVE | `test/agent/identity.test.ts`, run by the merged upstream-source runner in CI |
| test/fixtures/alphaphone-auth-callback-contract.json | 271 | fixture | DELETE (orphan) | or wire into the overlay sign-in test (owner Q) |
| test/fixtures/android-browser-module-stage.mjs | 189 | Quint refinement fixture (real modules) | KEEP / MOVE / SIMPLIFY | `specs/quint/refinement/services/` |
| test/fixtures/android-gzip-assets.mjs | 15 | support fixture | KEEP | optionally `test/support/android-asset-merger.mjs` |

## Coverage that would be lost by the DELETEs
- **Alpha's workflow notice wiring on the host lane.** This covers step notices, approval notices, taps and recovery. The behaviour lives in upstream `ai.eliza.plugins.notifications`, which upstream's `NoticeHostTest.java` and its consumer instrumentation test. Alpha's own emulator tests cover it too: `WorkflowApprovalNoticeInstrumentedTest`, `WorkflowApprovalNoticeProcessDeathInstrumentedTest`, `WorkflowNoticeTapInstrumentedTest`, `WorkflowNoticeProcessDeathInstrumentedTest` and `ResidentWorkflowCrashInstrumentedTest`. Those run only in `android-emulator.yml` (workflow_dispatch). After the delete, required CI has no Alpha-side check of notices. If that is not acceptable, keep the merged driver with the 7 cases listed in the four reports.
- **Alpha-specific auth callback vectors.** These are the `/alphaphone/auth/callback` path, the eliza.app / staging.eliza.app pair and the package. They are already untested, because the fixture is an orphan. Deleting it changes nothing, but the gap is real: the overlay suite runs upstream's generic `/example` vectors.
- **agent-identity-canonical.** Nothing is lost by the proposed changes, but this test never runs in CI today. Until it is wired in, it gives no protection.

## Shared helpers worth keeping
- `UpdateFlowTest`'s static fixture helpers: `installing`, `bridge`, `offered`, `committed`, `confirmation`, `dismissed`, `retireFixtureWorkers` and `serveFixtureHttps`. The three Quint native update harnesses depend on them, so they become `UpdateFixture.java`.
- `android-gzip-assets.mjs#mergeGzipAssets`, which one host test and one Quint harness use.

## Cross-file actions
1. **Correct `files/test/app-update.test.mjs.md`.** `UpdateFlowTest.java` is not "used only here". `UpdateBarrierHarness.java`, `UpdateStagingHarness.java`, `UpdateCompositionHarness.java`, `update-barrier.mjs:15`, `update-staging.mjs:152` and `update-composition.mjs:27` use it, so deleting `app-update.test.mjs` must not delete this file.
2. **Legacy binding reader (A1).** Remove the optional `(/intent)?` group in `AlphaDevicePlugin.UPDATE_BINDING` (`android/.../AlphaDevicePlugin.java:293`, comments at 294, 694 and 735) together with the `UpdateFlowTest` cases `aSessionBoundWithoutTheIntentMarkFencesUntilABoot` and the "earlier build without the mark" check at 1246-1248. Do it only after owner confirmation, because this is PackageInstaller state (compare D17).
3. **Delete the notice tests together.** Delete the four Java notice fixtures with both runners, `test/workflow-notice-delivery.test.mjs` and `test/workflow-approval-notice.test.mjs`. Afterwards check whether `noticeSources` in `test/fixtures/native-source.mjs` has any importer left.
4. **Upstream follow-up (D14).** The legacy "ownerId-only fence" reader in upstream `NoticeRoutes` is exercised at `WorkflowApprovalNoticeTest.java:220-221`.
5. **Run identity in CI.** Merge `scripts/test-local-agent-source.ts` into the single upstream-source runner (see `chunks/scripts-15.md`) and add it to a CI lane, so `test/agent/identity.test.ts` runs.
6. **Move the browser-module fixture.** Move `android-browser-module-stage.mjs` into `specs/quint/refinement/services/` and update the import at `android-browser-module-stage.mjs:6,55` in the same change.

## Owner questions
- Can Android still hold PackageInstaller sessions bound without `/intent` (builds 93f630662..fd5e9d09c7) or unbound (2bdb15408b) for the renamed package? If not, the legacy branch and its tests go.
- Do host launcher profiles from before `identityName` still need the migration in `agentIdentityConfiguration` (tests 2-3 of agent-identity-canonical)?
- Workflow notices: is upstream's suite plus the manual emulator lane enough, or should one merged Alpha host driver stay in required CI?
- Should Alpha's own auth callback vectors run against the packaged sign-in plugin, or is the orphan contract deleted outright?
