# specs/quint/legacy/core/check-provider-execution-refinement.mjs
- Lines: 214 | Kind: Quint refinement harness (legacy model, imports real upstream module) | Verdict: DELETE
- Covers: 7 schedules / 40 checkpoints of upstream `ProviderStateComposer` single-flight provider executions (coalesced and one-off), caller abort, stop, against `legacy/CoreProviderExecution.qnt`. Duplicates: none here; upstream-only code (not in `CORE_STATE_TARGETS`). Callers/importers: `specs/quint/refinement/legacy/index.mjs:18`, `test/quint-provider-execution-refinement.test.mjs:3`. Note line 163 lists that test file as a hashed input: a harness hashing its own test.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | §2.9, P6 | Upstream-only behaviour, runs on every legacy-family check. | Delete; upstream follow-up. | None for product code. |
| 2 | 163 | B5 | Driver binds the hash of `test/quint-provider-execution-refinement.test.mjs`: circular provenance. | Gone. | None. |
| 3 | 49, 56 | — | Reads private `providerExecutionsInFlight` / `providerExecutionsActive` fields of the composer (white-box against upstream internals). | Gone. | None. |
| 4 | 9 | C3 | Local `flush` twin. | Gone. | None. |

## Proposed end state
Delete harness, `legacy/CoreProviderExecution.qnt` + manifest entry, index row and `test/quint-provider-execution-refinement.test.mjs`.
