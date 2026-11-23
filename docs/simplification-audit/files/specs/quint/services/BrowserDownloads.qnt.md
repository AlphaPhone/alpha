# specs/quint/services/BrowserDownloads.qnt
- Lines: 152 | Kind: Quint model, live (9 tests, 9 invariants, 3 witnesses); mostly models upstream Java | Verdict: KEEP; add a per-model wrapper
- Covers: native download review, exact-origin cookies, captured blob chunks, MediaStore publication, and private-tab history. Properties: the cookie is sent only to the source origin, a private list is never persisted, publication only after review, completion only from provider evidence, ordered captured chunks, and cancel cleanup. Sources: `android/app/src/main/java/ai/alphacompute/alphaphone/AlphaBrowserPlugin.java`; `sharedSources` upstream `plugin-native-browser-surface/.../BrowserDownloads.java`. Duplicates: none in Quint. Android instrumentation would be the real e2e test, but none is wired in CI. Callers: harness `refinement/services/policies.mjs` (22 lines), which `javac`-compiles upstream `BrowserDownloadPolicy.java`, `BrowserWebOrigin.java` and others with `ServicePolicies.java` and emits traces for `BrowserSiteState`, `BrowserDownloads` and `IdentitySession`. Only the aggregate `refinement/services/index.mjs` runs `policyRefinement`, and no per-model wrapper exists (`git grep policyRefinement`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | — | T4 / coverage | The refinement for this model runs only through the services aggregate, which is slated for deletion. | Add `test/quint-service-policies.test.mjs` (one wrapper for `policyRefinement`, which covers 3 models) before deleting the aggregate. | high if the order is wrong |
| 2 | — | §2.9 | Most modelled behaviour lives in `vendor/eliza` (BrowserDownloads.java and its policies). Only the plugin wiring in `AlphaBrowserPlugin.java` is local. | KEEP here while `AlphaBrowserPlugin.java` owns the plugin bridge. Run it in the upstream-pin lane when only `upstream.lock.json` changes. | low |
| 3 | 81-82, 146 | — | Doc comments state the user-visible rules (cancel after the copy leaves the file). These are good. | — | none |

## Proposed end state
Model unchanged. Its refinement has its own wrapper (shared with BrowserSiteState and IdentitySession through `policies.mjs`).
