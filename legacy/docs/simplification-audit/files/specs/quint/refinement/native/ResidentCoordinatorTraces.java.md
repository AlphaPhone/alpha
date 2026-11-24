# specs/quint/refinement/native/ResidentCoordinatorTraces.java
- Lines: 282 | Kind: Quint refinement harness (whole `AlphaLocalAgentPlugin` plus 16 app and 9 upstream classes compiled against `resident-platform.mjs` ports and `ResidentTestPorts.java`) | Verdict: KEEP
- Covers: live model `ResidentRuntime` (coordinator projection; id `ResidentRuntime-coordinator`): on-device resident agent lifecycle across renderer surfaces: start admission, stop with confirmed/unconfirmed shutdown, late stop/cancel from a destroyed surface, owned/attached/unowned start cancellation, lost pairing response not retried, last surface retirement, boot broadcast vs stop lock race. 10 scenarios. Duplicates: `ResidentTraces` (aggregate `extraGroups`) covers `NativeProviderAdmission` only; the renderer stop/cancel wrappers are covered by the local-agent replay in `index.mjs:176-180`. Runs in `test/quint-resident-refinement.test.mjs` and the aggregate (`index.mjs:187`).
- Callers/importers: `resident-coordinator.mjs` (`checkResidentCoordinator`, `generateResidentCoordinatorTraces`); `residentSources` is also imported by other native runners.

## How it is tied to product code
- Whole-file compile, no text slicing (`resident-platform.mjs` generates stubs only).
- Reflection on private statics `lifecycleEpoch`, `stopping`, `accepting`, `ownerToken`, `startRequestId`, `startRequestEpoch`, `startOwnsLaunch`, `instances` and instance fields `disposed`, `pending`, `streams`, `attachedStarts`, `cancelledStarts`, `attachUnverified`.
- Calls the product test hook `AlphaLocalAgentPlugin.launchedGenerationForTest` (100), guarded by `BuildConfig.DEBUG` (D7; Q-AND-7 open).
- Source list includes `CloudDeployment.java`, `HostedInbox.java`, `HostedResultNotices.java`, `HostedStorageFault.java`, `VoiceEventAdmission.java`: the D5 / A63 product cleanup (merge `HostedStorageFault` into `HostedInbox`, `VoiceEventAdmission` into `NativeVoiceBinding`, remove unreachable cloud paths) must edit `residentSources` in the same change.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 19-26, 45-82 | T10 (reflection) | 14 private member names of a god class pinned; the structural split of `AlphaLocalAgentPlugin` will move them. | When the plugin is split, read the lifecycle state from the extracted lifecycle class (ideally through its existing `facts` snapshot, line 165 of the plugin) instead of private fields. | Medium (coupled to the structural pass) |
| 2 | 100 | D7 | Uses `launchedGenerationForTest` from main source. | Keep until Q-AND-7 decides where test hooks live; then call it from the testMocks/test source set or set the generation through the provider-admission port. | Low |
| 3 | 40-43, 219-220 | T8 | `Thread.sleep(1-2)` polling with 5 s deadlines; condition waits. | None. | None |
| 4 | runner 9-19 | coupling | `residentSources` lists files the Android cleanup merges or deletes. | Update in the same commits as A63/D5. | Low |
| 5 | campaign | T4 | Per-model test plus aggregate. | One runner. | None |

## Proposed end state
Keep all 10 scenarios. Follow the `AlphaLocalAgentPlugin` split by observing the lifecycle class rather than private
plugin fields. Keep the compile list in step with the Android deletions. Run once from the native family runner.
