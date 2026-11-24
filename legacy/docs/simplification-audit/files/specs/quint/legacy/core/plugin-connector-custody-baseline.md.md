# specs/quint/legacy/core/plugin-connector-custody-baseline.md
- Lines: 30 | Kind: formal-spec documentation (legacy baseline of an upstream bug + product patch) | Verdict: MERGE into `specs/quint/refinement/services/core-runtime/connector-custody.md` (keep ~8 lines), then DELETE
- Covers: six as-built schedules where a late plugin service start republishes a withdrawn connector in upstream `AgentRuntime`, and the product-owned core-state patch that fixes it (applied via the core-state manifest, `scripts/core-state-patch.ts`); runs with `test/quint-plugin-connector-custody.test.mjs`.
- Duplicates: live `specs/quint/services/CoreConnectorCustody.qnt` + `refinement/services/core-runtime/connector-custody.md`. Callers/importers: linked from `legacy/core/plugin-lifecycle-refinement.md:14` and `refinement/services/core-runtime/connector-custody.md:3`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 19-23 | — | The "Authenticated correction" section is the only prose explaining why alphaphone carries a core-state patch for connector custody (product-relevant, the patch ships in the APK). | Move a short version into `connector-custody.md`. | Low |
| 2 | 1-17 | P6, A8 | Historical baseline of the pre-patch mismatch and commit `f0a28195…`. | Delete. | None |
| 3 | 3 | — | Live doc `connector-custody.md:3` links here; update that link when deleting. | Cross-file. | Low |

## Proposed end state
Gone from the legacy tree; `connector-custody.md` states in a few lines what the patch does and which test runs it.
