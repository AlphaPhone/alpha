# specs/quint/native/NativeUpdateComposition.qnt
- Lines: 239 | Kind: Quint composition model, live (listed in `specs/quint/native/manifest.json`, read by `scripts/check-quint.ts` and `scripts/check-quint-refinement.ts`); imports `NativeUpdateActivation`, `RuntimeUpdatePause`, and `UpdateBootAdmissionPolicy` (defined in `NativeUpdateStaging.qnt`); harness `update-composition.mjs` reuses the update-barrier slice plus upstream `RuntimeUpdatePause` and `CredentialShutdownLease` | Verdict: KEEP
- Covers: Joins the in-memory update barrier, the durable pause journal and the resident shutdown lease: durable pause has an exact barrier, stop needs an owned pause, commit needs a confirmed stop, resume needs a released lease, automatic begin only on a ready boot (6 runs). Duplicates: none; it is one of the few real compositions (research §2.11). Callers/importers: manifest; `specs/quint/refinement/native/update-composition.mjs`; `test/quint-native-update-composition.test.mjs`; also re-run by the family aggregate `specs/quint/refinement/native/index.mjs` (`test/quint-native-refinement.test.mjs`); `native/README.md`

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-37 | — | Wrapper modules re-export component actions to allow instancing; needed by Quint syntax. | None. | — |
| 2 | 45 | C5 | Imports `UpdateBootAdmissionPolicy` from `NativeUpdateStaging.qnt`, so the boot policy lives inside another model file. | Optional: move `UpdateBootAdmissionPolicy` to its own `NativeUpdateBootPolicy.qnt` imported by both. Low value; only if Staging is edited. | None |
| 3 | harness `update-composition.mjs:10,41` | T10 | Depends on `exactUpdateMembers` (see NativeUpdateActivation). | Port with the `AlphaUpdater` extraction. | Medium |
| 4 | test + `index.mjs` | T4 | Runs twice. | One runner. | None |

## Proposed end state
Model unchanged; harness compiles `AlphaUpdater.java` instead of the slice; one runner; path-filtered with the other update models.
