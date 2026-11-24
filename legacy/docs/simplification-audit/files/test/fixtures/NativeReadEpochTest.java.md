# test/fixtures/NativeReadEpochTest.java
- Lines: 19 | Kind: Java fixture, unit of `NativeReadEpoch` (11-line class) | Verdict: DELETE (with `test/native-read-epoch.test.mjs`; delete-candidates A61/A136)
- Covers: queued native results are not published after an epoch increment or scope change. Duplicates: Quint `MediaLifecycle` refinement uses the class in `specs/quint/refinement/native/ComponentTraces.java:94`. Callers/importers: `test/native-read-epoch.test.mjs:24`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | A7 | `NativeReadEpoch` has no caller under `android/app/src/main` (whole-repo grep: only this fixture, its node test, the Quint native manifest pin `specs/quint/native/manifest.json:442`, `specs/quint/refinement/native/index.mjs:116` and `ComponentTraces.java`). It tests dead code. | Delete the class, this fixture and the node test; remove the Quint pins and the `ComponentTraces` use, or point the MediaLifecycle refinement at the live fence in upstream `PermittedMediaCatalog`. | Medium (the Quint harness fails until updated) |
| 2 | importer | T1 | The importer also regexes upstream `PhotosPlugin.java`/`DeviceLibraryPlugin.java`. | Goes with it. | Low |

## Proposed end state
All deleted. The MediaLifecycle model either drops the epoch obligation or binds it to the upstream catalog that
actually publishes media results (owner/formal follow-up, Q-AND-24).
