# specs/quint/refinement/native/runtime-update-pause.md
- Lines: 44 | Kind: harness documentation | Verdict: MERGE into `specs/quint/refinement/native/README.md`
- Covers: prose description of the RuntimeUpdatePause JVM replay boundaries. Duplicates: assumptions are restated in `runtime-update-pause.mjs:81-92`. Callers/importers: none (grep for `runtime-update-pause.md` outside the audit folder: no hits; it only links to the model and the driver).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3-9 | D11/A8 | Names `AlphaDevicePlugin.UpdatePause`; U-A1 moves it to `update/AppUpdater`, and the "exact extracted product wrapper" (l.15) disappears with the PORT. | Rewrite those sentences when the harness is ported. | L |
| 2 | 44 | T9 | Points at the per-model test `test/quint-runtime-update-pause-refinement.test.mjs`, which is a T4 duplicate of the native aggregate. | Replace with the aggregate command (or `npm run quint:refinement -- native`). | L |
| 3 | all | – | One-off doc per harness (six `.md` files in this folder); the boundary table is the useful part. | Move the table under a "RuntimeUpdatePause" heading in the folder README; delete this file. | L |

## Proposed end state
One section in `refinement/native/README.md`: the release-behaviour table and the "visible tombstone vs retained lease"
discrepancy note (l.29-37), which is a real open obligation. No per-file run instructions.
