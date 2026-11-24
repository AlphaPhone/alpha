# specs/quint/native/NativeHostedResultNotices.qnt
- Lines: 218 | Kind: Quint model (live, `native` manifest; JVM refinement harness with Java text surgery) | Verdict: KEEP; PORT the harness (worst text slice in this chunk)
- Covers: the `HostedResultNotices` ledger: no repost of an unchanged digest, exact owner readback, pending tap protected from supersession, stale tokens refused, partial owner withdrawal cannot let a foreign tap settle. Duplicates: androidTest `HostedResultNoticeInstrumentedTest`, `HostedResultsLifecycleInstrumentedTest` (A28, stub unit test). Callers/importers: `native/manifest.json` (8 tests, 5 invariants), harness `refinement/native/hosted-result-notices.mjs` (177 lines) + `HostedResultNoticeTraces.java`; `test/quint-native-hosted-result-notices.test.mjs`; native aggregate.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness | T10 | `bridgeSource()` (`hosted-result-notices.mjs:17-36`) cuts `AlphaHostedResultsPlugin.java` into six fragments by member-signature anchors (`' static final String CHANNEL='`…`' private void channel()'`, `' private void sourceForeground()'`…`nativeSourceIdentity`, `withdrawOtherOwnerApprovalNotices`…`resumeWorkflowApprovalNotice`, `' private void retryCaptures()'`…`load()`, `handleOnNewIntent`…`status`, `handleOnDestroy()`…`\n}`), strips `@PluginMethod `, and recompiles them under a fake `HostedBridgeHost` superclass. All anchors still match after stage A (the plugin lost two import lines). Research §2.6 flags this file. | PORT: move the notice handlers into a package-private `HostedNoticeBridge` (ports: foreground check, worker, notify) that the plugin delegates to; compile it whole; delete `bridgeSource` and the fake host. Any Q-HOST-2 split of the plugin is the natural moment. | H: any edit to the plugin (B29, A63 merges of `WorkflowNoticeTapsFactory`/`SourceRenewalHost`) breaks it |
| 2 | harness | C5 | The fake platform defines `WorkflowNoticeTapsFactory`, `SourceRenewalHost`, `HostedDelivery` stubs; A63 plans to merge those classes into their users, which changes what must be stubbed. | Update stubs in the same change as A63. | M |
| 3 | 1-218 | - | Model itself is clean; four fixed routes stand for identity tuples. The 200-row cap is checked by the harness separately (asserted `capacity` object). | None. | - |
| 4 | test wrapper | T4, B5 | Run twice; pins `traces 12`, `observedFields 15`. | One runner; `> 0`. | L |

## Proposed end state
Unchanged model. Harness compiles a real delegate class and the ledger whole, with no member-signature slicing of the
Capacitor plugin.
