# specs/quint/native/NativeSourceRenewal.qnt
- Lines: 204 | Kind: Quint model, live (listed in `specs/quint/native/manifest.json`, read by `scripts/check-quint.ts` and `scripts/check-quint-refinement.ts`); harness compiles `SourceRenewalNotices`, `SourceRenewalHost`, `HostedNoticePoster` whole plus five text sections of `AlphaHostedResultsPlugin` | Verdict: KEEP (harness: PORT)
- Covers: Hosted-source renewal alerts: durable row phases, a visible alert always has its routes, one exact pending tap token, owner/revision/online/revocation checks retire stale rows, interrupted final saves reuse the tag (8 runs, 2 invariants). Duplicates: none (renderer side `apps/app/src/runtime/hosted-digest-ui.tsx` calls `pendingSourceRenewal`; no journey reaches the native alert). Callers/importers: manifest; `specs/quint/refinement/native/source-renewal.mjs` (+`source-renewal-platform.mjs`); `test/quint-native-source-renewal.test.mjs`; also re-run by the family aggregate `specs/quint/refinement/native/index.mjs` (`test/quint-native-refinement.test.mjs`); `native/README.md`

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | `source-renewal-platform.mjs:10-27` | T10 | Slices `AlphaHostedResultsPlugin.java` (modified by stage A in this worktree) at ` static final String CHANNEL=`, ` private void channel()`, ` private void sourceForeground()`, ` @PluginMethod public void nativeSourceIdentity`, ` @PluginMethod public void pendingSourceRenewal(`, ` @Override public void load()`, ` @Override protected void handleOnNewIntent(`, ` /** The page reports`, ` @Override protected void handleOnDestroy()`; it also strips `@PluginMethod `. All anchors present today. | PORT: move the renewal bridge methods into `SourceRenewalNotices` (cross-file-actions already merges `SourceRenewalHost` into it, delete-candidates A63) and compile it whole; the plugin keeps thin delegating methods. | Medium |
| 2 | manifest `sources` | A7 | `SourceRenewalHost.java` is a single-method file slated for merge (A63). | Update `sources` when it merges. | None |
| 3 | 200-201 | owner question (D16) | `failedClearCancelsBeforeSavingAsBuiltTest` pins that a refused clear write still cancels the visible alert while the row stays `posted` (as-built inconsistency). | Owner question; keep. | — |
| 4 | — | D5 check | "Hosted" here is the agent's connected sources (Gmail digest), which ship; not the deleted hosted-agent pairing. | Keep. | — |
| 5 | test + `index.mjs` | T4 | Runs twice. | One runner. | None |

## Proposed end state
Model unchanged. Harness compiles `SourceRenewalNotices` (with the merged host and bridge logic) whole; no slicing of `AlphaHostedResultsPlugin`. One runner, path-filtered.
