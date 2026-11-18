# specs/quint/native/RuntimeUpdatePause.qnt
- Lines: 148 | Kind: Quint model (live; imported by `NativeUpdateComposition.qnt`, referenced by `NativeUpdateStaging.qnt`) | Verdict: KEEP; harness PORT
- Covers: the durable update pause journal that fences resident starts during an APK update: exact baseline/target/signer binding, committing record, corrupt or unreadable record fences start, staged temp file owns no authority, release only on successor build or proven-ended session (API-level `zero` evidence rules), ambiguous directory sync keeps the shutdown lease. Duplicates: none (composition imports it). Callers/importers: manifest; `NativeUpdateComposition.qnt`; harnesses `runtime-update-pause.mjs` + `RuntimeUpdatePauseTraces.java`, `update-composition.mjs`/`UpdateCompositionHarness.java`, `update-barrier.mjs`, `update-staging.mjs`, `resident-platform.mjs`; mentions in `test/app-update.test.mjs`, `test/resident-start-failure-policy.test.mjs`, `test/resident-native-patch-admission.test.mjs`, `test/browser-host-source-closure.test.mjs`, `scripts/test-update-confirmation-platform.ts`, `test/fixtures/UpdateFlowTest.java`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness 21-45 | T10 | `extractWrapper` slices `AlphaDevicePlugin.java` text: from `' static final class UpdatePause {'` to `' private static final class UpdateActivation'`, regex for `static String hex(byte[] digest)`, and `' static String appSigner('` up to `" /**\n  * A session's binding:"`, then wraps them in a synthetic `AlphaDevicePlugin`. Any reformat (D9 Prettier does not touch Java, but U-A1 split does) breaks it. | PORT: Stage F U-A1 moves `UpdatePause` into `update/AppUpdater.java` (or its own package-private `UpdatePause.java`); move `hex` to `AlphaUtil` (R3) and `appSigner` next to it. Then compile those files directly with the existing `test/fixtures/app-update-jvm` stubs. | medium (coordinated with U-A1) |
| 2 | harness 59-61 | B5 | Re-reads the pinned upstream blob and asserts the compiled journal's hash equals it. The prepare step already authenticates staged native sources. | Drop. | low |
| 3 | 18-35, 110-115 | — | `apis`/`evidenceCases` enumerate SDK boundary classes (29-33, 37, 38) used by `provenUncommitted`; tied to real API-level behaviour. Keep. | none | — |
| 4 | manifest sources | — | Sources: upstream `RuntimeUpdatePause.java` + Alpha `AlphaDevicePlugin`, `AlphaApplication`, `AlphaLocalAgentPlugin`. All live; update flow is product (not on a delete list; `updateChannelCheckEnabled` deletion D8 is a different switch). | Confirm D8 deletion does not remove an `UpdatePause` caller. | low |

## Proposed end state
Model unchanged. Harness compiles the product `UpdatePause` class file directly once U-A1 extracts it, instead of
splicing three text ranges into a synthetic wrapper. Manifest paths follow the split (7 AlphaDevicePlugin entries
across the update models per cross-file-actions U-A1).
