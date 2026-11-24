# specs/quint/refinement/native/source-renewal-platform.mjs
- Lines: 247 | Kind: refinement fixture; **slices product text** (T10) | Verdict: PORT
- Covers: ports for `source-renewal.mjs` (notification manager with tap identity, PendingIntent, Activity focus, credential slots, resident describe) plus five excerpts of `AlphaHostedResultsPlugin.java`. Callers/importers: `source-renewal.mjs` only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-28 | T10 | Cuts `AlphaHostedResultsPlugin.java` at five ranges: `' static final String CHANNEL='`→`' private void channel()'`; `' private void sourceForeground()'`→`' @PluginMethod public void nativeSourceIdentity'`; `' @PluginMethod public void pendingSourceRenewal('`→`' @Override public void load()'`; `' @Override protected void handleOnNewIntent('`→`' /** The page reports'`; `' @Override protected void handleOnDestroy()'`→`'\n}'` (end of file), and strips `@PluginMethod `. All anchors exist today. | Product: move the renewal bridge members (schedule/clear/pending/settle, intent claim, destroy release) into `SourceRenewalNotices` (A63 already merges `SourceRenewalHost` into it) or a small `SourceRenewalBridge` class taking `Plugin`-free ports; the plugin forwards. Harness compiles it whole; drop the extraction. Q-HOST-2 (plugin split) is compatible. | M |
| 2 | 29-52 | – | Fake `AlphaCredentialStore`, `NativeDigestHost`, `HostedDelivery`, and a package-local `System` clock. `HostedDelivery.get` throws: the ordinary hosted lane is explicitly out of scope. | Keep. | – |
| 3 | 53-242 | C5 | Generic Android/Capacitor stubs duplicated with other platforms. | Shared support stubs. | M |

## Proposed end state
Stubs only; product renewal class compiled whole. The feature is production-reachable (`MainActivity.java:353`
registers the plugin; `hosted-digest-ui.tsx` calls `pendingSourceRenewal`), so the model stays.
