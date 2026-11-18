# specs/quint/refinement/services/policies.mjs
- Lines: 22 | Kind: Quint refinement wrapper (compiles real `CloudDeployment.java`, upstream auth `CloudSignIn*` and browser-surface permission/download policy classes with `ServicePolicies.java`) | Verdict: KEEP
- Covers: three models from one JVM run: `IdentitySession` (pending sign-in serialization, callback parsing, expiry/state match), `BrowserSiteState` (site-permission persistence, `manifest.json:735`), `BrowserDownloads` (cookie-origin and history policy, `manifest.json:852`). Duplicates: none found. Callers: `services/index.mjs:18,76` only - no per-model host test, so it runs only in the services aggregate the host-test review deletes.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | — | P1 | Only reachable via `runServicesRefinement`. | Give it its own entry in the manifest-driven runner. | High if forgotten |
| 2 | 15-19 | D9 | Nested ternary selects assumption text by model name. | A `{IdentitySession: …, BrowserSiteState: …, BrowserDownloads: …}` map. | Low |
| 3 | 7-10 | — | Mostly upstream classes (`vendor/eliza/packages/auth`, `plugin-native-browser-surface`); only `CloudDeployment.java` is Alpha. | Path filter: these files + `ServicePolicies.java`. | — |

## Proposed end state
Unchanged except a lookup table for assumptions and its own runner entry.
