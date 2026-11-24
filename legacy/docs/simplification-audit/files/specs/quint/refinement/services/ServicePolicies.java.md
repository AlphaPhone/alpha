# specs/quint/refinement/services/ServicePolicies.java
- Lines: 81 | Kind: formal harness JVM driver for three models (`IdentitySession`, `BrowserSiteState`, `BrowserDownloads`) | Verdict: KEEP (owner question on the two upstream-only campaigns)
- Covers: `identity()` - pending sign-in serialisation round-trip, callback state matching and pending expiry (upstream `CloudSignInFlow`); `sites()` - site-permission record persistence for normal/private tabs (upstream `BrowserSitePermissions`/`BrowserSitePermissionRecord`); `downloads()` - cookie origin check across redirect and ephemeral-tab history (upstream `BrowserDownloadPolicy`). Duplicates: `SignInCoordinatorTraces.java` drives the full plugin but never the pending-expiry boundary, so `identity()` is not redundant. Importers: `policies.mjs` only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2-8, 42-80 | §2.9 | Every executed class is upstream (`vendor/eliza/packages/auth`, `plugins/plugin-native-browser-surface`); the only Alpha code is `CloudDeployment` constants. The manifest lists `AlphaBrowserPlugin.java` as the source of `BrowserSiteState`/`BrowserDownloads`, which this harness never runs, so edits to `AlphaBrowserPlugin.java` reselect models whose evidence does not touch it (P1). | Owner/upstream decision: move `sites()`/`downloads()` and their models upstream (D14 follow-up) or run them only when `upstream.lock.json` changes; correct the manifest sources to the upstream files. | Low |
| 2 | 67 | A8 | Comment "WebView construction is an environmental precondition..." explains the stub step; keep. | None. | — |
| 3 | 13-14 | C6 | `"/alphaphone/auth/callback"`, client and product names re-typed here; product has them in `AlphaCloudSignInPlugin.REGISTRATION`. | Use `AlphaCloudSignInPlugin.REGISTRATION` (as `SignInTestPorts` does) so the trace runs the product configuration. | Low |

## Proposed end state
Same three campaigns; identity config taken from `AlphaCloudSignInPlugin.REGISTRATION`. If the owner agrees, `sites()`/`downloads()` move upstream with their models and this file keeps only `identity()` (~30 lines).
