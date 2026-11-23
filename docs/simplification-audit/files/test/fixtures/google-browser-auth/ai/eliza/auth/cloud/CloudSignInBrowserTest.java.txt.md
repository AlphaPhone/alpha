# test/fixtures/google-browser-auth/ai/eliza/auth/cloud/CloudSignInBrowserTest.java.txt
- Lines: 127 | Kind: transplant (Java template; `ACTUAL_BROWSER_PACKAGE/START/LIFECYCLE` sliced from upstream `CloudSignInPlugin.java`, fake Intent/PackageManager/CustomTabs) | Verdict: MERGE into upstream `packages/auth/android/test/ai/eliza/auth/cloud/` (upstream follow-up); keep here until the pin carries it, then DELETE
- Covers: browser-mode Google start: guarded pending record written before the UI launch, Custom Tabs browser preferred over a non-CT default, stock-AOSP fallback to the default HTTPS browser (webview shell), host never its own browser, refusal when no browser/App Link/Asset Links, cancel or supersede before/after persistence, resume grace and `browser-closed`, stale resume timer cannot cancel a successor.
- Duplicates: none upstream (`upstream-base.json` records `null`). Partial overlap with `CloudSignInChainTest.java.txt` browser lifecycle (`browserCallbackRaces`, resume grace) and with Quint `GoogleBrowserReturnClaim` (return claim/grace only, not start or browser selection).
- Callers: `native-sign-in.test.mjs:331-360` (fork) only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 64, 73-74 | T2 / T10 | Bodies injected by literal anchors; fake Android API classes re-declared (~45 lines). | Acceptable only upstream, next to the code it slices. | Low |
| 2 | 1-127 | T5 | Tests unpatched upstream code from Alpha's repo. But Alpha ships browser mode (`AlphaCloudSignInPlugin.java:31`) and AOSP images without Custom Tabs, so these cases protect a real Alpha path that upstream does not test. | Upstream it; do not just delete. | High if deleted without replacement |
| 3 | 77-123 | D8 | `main` is one 46-line wall of chained statements. | Reformat when upstreamed. | None |

## Proposed end state
Moved upstream as `CloudSignInBrowserTest.java.txt` with its runner test; Alpha advances the pin and deletes this copy. Until then it stays as is (it is the only coverage of browser selection and pre-launch persistence).
