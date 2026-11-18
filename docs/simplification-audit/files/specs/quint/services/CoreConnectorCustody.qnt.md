# specs/quint/services/CoreConnectorCustody.qnt
- Lines: 225 | Kind: Quint model, live (6 tests, 6 invariants); upstream core plus the local `scripts/core-state-patch.ts` | Verdict: KEEP; move its harness logic out of `specs/quint/legacy`
- Covers: exact connector registration custody in the shared runtime "after the authenticated shared runtime repair". It covers start/return/dispose/withdraw/unload per runtime, detached continuations, and isolation between two runtimes, over five route keys (default/named message, default/named post, legacy send). Sources: `vendor/eliza/packages/core/src/{plugin-lifecycle.ts, runtime/connector-registry.ts, runtime/connector-registration.ts, runtime/service-lifecycle.ts, runtime.ts}`, `upstream.lock.json`, `scripts/core-state-patch.ts`. Duplicates: `specs/quint/legacy/CorePluginLifecycle.qnt` overlaps (plugin lifecycle), and `refinement/services/core-runtime/connector-custody.md` is narrative. Callers: harness `refinement/services/core-runtime/connector-custody.mjs` (40 lines), which is a thin adapter over **`specs/quint/legacy/core/check-plugin-connector-custody.mjs` (348 lines)**. Wrapper `test/quint-plugin-connector-custody.test.mjs`; aggregate.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness 2 | P6 | The live harness's real work lives in the legacy tree. Deleting `specs/quint/legacy` would delete it. | Move `check-plugin-connector-custody.mjs` to `refinement/services/core-runtime/` before retiring `legacy/`. | high (ordering) |
| 2 | manifest | §2.9 / AGENTS.md | The model depends on `scripts/core-state-patch.ts`, a local transform of upstream core sources. That is a shared change kept downstream. | Upstream follow-up (D14). When the patch lands upstream, drop the script from `sources`. | low |
| 3 | 14, 140, 153 | — | "legacy send" is an upstream route kind (key 5), not an app legacy reader. | Keep. | none |
| 4 | — | §2.9 | Upstream-pin lane. | Select on lock/patch changes only. | low |

## Proposed end state
Model unchanged. The harness, with its 348-line checker, lives under `refinement/services/core-runtime/`, and nothing imports from `legacy/`.
