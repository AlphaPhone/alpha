# specs/quint/refinement/native/credential-leases.mjs
- Lines: 17 | Kind: Quint refinement driver (upstream-only Java classes, bounded component) | Verdict: KEEP (upstream-lock lane)
- Covers: `CredentialShutdownLease`, `CredentialRequestFence` and two `CredentialIntentFence` copies (agent runtime + secure-store) against `NativeCredentialMutation` (services manifest, live). Duplicates: same campaign run by `test/quint-credential-leases.test.mjs` **and** the native aggregate `index.mjs:188` (T4). Callers/importers: those two.

## How it is tied to product code
Compiles four whole files, all under `vendor/eliza/plugins/...` — no app-owned code. Reflection on lease/fence fields (in `CredentialLeaseTraces.java`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-7 | P6 | Checks upstream code only; it can change only when `upstream.lock.json` moves. | Path-filter its test to `upstream.lock.json`, the model and this folder. Upstream follow-up: the proof belongs with `plugin-native-agent` (D14, not done here). | None |
| 2 | — | T4 | Runs twice per verify (own test + aggregate). | Keep the per-model test; remove from aggregate. | None |
| 3 | 6-7 | D8 | `compiled.push` after a `map` for two paths; one-line style. | One literal array. | None |

## Proposed end state
Unchanged campaign, run once by its own test, only when the upstream pin, model or harness changes.
