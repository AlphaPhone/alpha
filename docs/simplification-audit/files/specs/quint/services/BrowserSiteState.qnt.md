# specs/quint/services/BrowserSiteState.qnt
- Lines: 136 | Kind: Quint model, live (9 tests, 6 invariants, 3 witnesses) | Verdict: KEEP; add a per-model wrapper (shared with BrowserDownloads)
- Covers: native isolated-profile admission, the cookie policy readback, per-origin permission decisions, Android runtime-permission dialogs versus site prompts, and HTTP authentication. Properties: a private tab has no third-party/normal cookies and no saved decisions, a permission applies to the current page and origin, a prompt needs a shown and selected tab, and a password lives only in the auth prompt. Sources: `android/.../AlphaBrowserPlugin.java`; `sharedSources` upstream `BrowserSitePermissionRecord.java`, `BrowserHttpAuthOrigin.java`, `BrowserHttpAuthAutofill.java`, `BrowserSessionStore.java`, `BrowserTabHostPlugin.java`. Also named in `specs/quint/native/manifest.json` and `pixel-native-review-20261109.md`. Duplicates: none. Callers: `refinement/services/policies.mjs` (javac of upstream helpers + `ServicePolicies.java`), aggregate only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | — | coverage | Aggregate-only, through `policyRefinement`. | One wrapper for `policies.mjs` (see `BrowserDownloads.qnt.md`). | high if the order is wrong |
| 2 | harness assumptions | — | The harness says the passkey default, WebView construction and Android permission callbacks are not executed. Only permission-record persistence is. Most invariants are therefore model-only. | Accept. State it in the model header so nobody reads the model as instrumentation evidence (AGENTS.md: never claim one proves another). | none |
| 3 | — | §2.9 | Mostly upstream behaviour. | Upstream-pin lane for vendor-only changes. | low |

## Proposed end state
Model unchanged, run by a `policies` wrapper. One header line stating which parts are executed against real code.
