# specs/quint/refinement/native/hosted-result-notices.mjs
- Lines: 177 | Kind: Quint refinement driver that **slices** `AlphaHostedResultsPlugin.java` into a synthetic subclass, plus stub platform as strings | Verdict: PORT (compile the whole plugin)
- Covers: hosted-result notice ledger: four routes, owner tuple partition, token generations, 200-row cap with pending-tap exemption, withdrawal/consume failing after durable writes; model `NativeHostedResultNotices` (native manifest, live). Duplicates: `test/native-notification-*.test.mjs` (source-text, see their reports). Callers/importers: `test/quint-native-hosted-result-notices.test.mjs`, native aggregate `index.mjs:49,195` (T4).

## Text pins (T10)
`bridgeSource()` (17-36) reads `android/app/src/main/java/ai/alphacompute/alphaphone/AlphaHostedResultsPlugin.java` (112 lines) and
keeps six spans between these anchors (all present today, each exactly once): `' static final String CHANNEL='`→`' private void channel()'`;
`' private void sourceForeground()'`→`' @PluginMethod public void nativeSourceIdentity'`;
`' @PluginMethod public void withdrawOtherOwnerApprovalNotices'`→`' @PluginMethod public void resumeWorkflowApprovalNotice'`;
`' private void retryCaptures()'`→`' @Override public void load()'`; `' @Override protected void handleOnNewIntent'`→`' @PluginMethod public void status'`;
`' @Override protected void handleOnDestroy()'`→`'\n}'`; then strips `'@PluginMethod '`. The generated class extends a fake
`HostedBridgeHost` instead of Capacitor `Plugin`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 17-36, 147 | T10 | Text slicing of a live product file; moving a method or reformatting breaks the harness, and the slice silently drops anything between spans (so excluded methods are untested and their dependencies need not compile). | Compile the whole `AlphaHostedResultsPlugin.java` against Capacitor stubs (`Plugin`, `PluginCall`, `JSObject`, `JSArray`, `PluginMethod`, `annotation.CapacitorPlugin`) and the existing `WorkflowNoticeTapsFactory`/`SourceRenewalHost`/`HostedDelivery` ports. The plugin is 112 lines; stubbing its remaining calls (`nativeSourceIdentity`, `resumeWorkflowApprovalNotice`, `status`, `load`) is small. Product side needs no new exports. | Medium |
| 2 | 38-132 | D6 / C4 | Stub platform as a JS string, different from `hosted-inbox.mjs`' `HostedDelivery`. | `stubs/hosted-results/*.java`, share `HostedDelivery` stub. | Low |
| 3 | 141-142 | B5 | Re-asserts vendor `NoticeOwner.java` hash against the pin. | Delete. | None |
| 4 | 160 | — | Separate real-source capacity assertion (200 rows) is useful. | Keep. | — |
| 5 | — | T4 | Run by its test and the aggregate. | Aggregate goes. | None |

## Proposed end state
Whole-file compile of the real plugin and ledger with file-based stubs; no anchors; one runner.
