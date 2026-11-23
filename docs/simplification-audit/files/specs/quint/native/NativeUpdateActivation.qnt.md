# specs/quint/native/NativeUpdateActivation.qnt
- Lines: 263 | Kind: Quint model, live (listed in `specs/quint/native/manifest.json`, read by `scripts/check-quint.ts` and `scripts/check-quint-refinement.ts`); imported by `NativeUpdateComposition.qnt`; harness `update-barrier.mjs` compiles a text slice of `AlphaDevicePlugin` | Verdict: KEEP (harness: PORT)
- Covers: In-process update barrier: every registered bridge acknowledges before seal, late joins/retirements invalidate, stop only after seal, commit only after stop, resume only for a cancelled install and an eligible bridge (12 runs, 7 invariants). Duplicates: composed again (not duplicated) in `NativeUpdateComposition.qnt`. Callers/importers: manifest (`stateMapping`, `bounds`); `NativeUpdateComposition.qnt` (imports it); `specs/quint/refinement/native/update-barrier.mjs` (also imported by `update-composition.mjs`, `update-staging.mjs`, `test/app-update.test.mjs`); `test/quint-native-update-activation.test.mjs`; also re-run by the family aggregate `specs/quint/refinement/native/index.mjs` (`test/quint-native-refinement.test.mjs`); `native/README.md`

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | `update-barrier.mjs:28-46` | T10 / D7 | `exactUpdateMembers` cuts `AlphaDevicePlugin.java` from ` static final long UPDATE_MAX_BYTES=` to the marker comment ` // End of updater methods for host replay.` and regex-extracts `handOff` and `shareForeground`, then wraps them in a synthetic `AlphaDevicePlugin` class. The marker comment exists in product code only for this harness (D7). Three other consumers depend on the same slice (`update-composition.mjs`, `update-staging.mjs`, `test/app-update.test.mjs`). | PORT: move the updater methods into an `AlphaUpdater` class (planned AlphaDevicePlugin split) compiled whole by all three harnesses; delete the marker comment; `test/app-update.test.mjs` stops importing `exactUpdateMembers`. | Medium: four consumers move together |
| 2 | test + `index.mjs` | T4 | Runs twice; activation scenarios also run inside the composition campaign. | One runner. | None |
| 3 | harness | B5 | `checkTraces` re-hashes every input before and after the run (`driverHashes`, `inputsUnchanged`) and the wrapper test asserts exact trace counts. | Pass/fail only. | None |

## Proposed end state
Model unchanged. `AlphaUpdater.java` compiled whole by the activation, composition and staging harnesses; no marker comment; one runner, path-filtered to the updater classes and `RuntimeUpdatePause.java`.
