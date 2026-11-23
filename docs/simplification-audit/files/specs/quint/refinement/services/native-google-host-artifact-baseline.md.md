# specs/quint/refinement/services/native-google-host-artifact-baseline.md
- Lines: 35 | Kind: historical formal-campaign note | Verdict: DELETE
- Covers: describes a baseline at commit `c568151b…` where the native Google host producer could publish a receipt not bound to the compiled source, and the later "corrected producer". Duplicates: the live `NativeGoogleHostArtifact.qnt` safety predicate and `native-google-host-artifact.mjs` (18 traces) cover the corrected behaviour; `test/quint-native-google-host-artifact.test.mjs` asserts it. Callers/importers: none — `grep -rn native-google-host-artifact-baseline` outside `docs/` finds nothing; no companion `native-google-host-artifact.md` exists.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-21 | A8 / P6 | Baseline section documents superseded producer behaviour at an old commit — historical evidence, not a live model. | Delete. | none |
| 2 | 23-35 | — | "Corrected producer" paragraph describes the current guarantees and the optional pinned-Bun test (`ALPHA_QUINT_BUN`). | If kept anywhere, 4 lines in the header of `native-google-host-artifact.mjs`. | none |

## Proposed end state
File deleted; at most a short header comment on the live harness.
