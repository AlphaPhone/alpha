# specs/quint/legacy/view-refresh-configurations.json
- Lines: 1673 | Kind: data (TLA→Quint configuration table for four historical view-refresh models) | Verdict: DELETE (with `specs/quint/legacy/**`, C17 / P6)
- Covers: format `alpha-quint-legacy-configurations-v1`; 22 configurations (Design / AsBuilt_* / Ablate_* / Rename) with constants, invariant and temporal expectations (some `expected: "violation"`) for `legacy/CameraSession.qnt` (6), `PhotosLibrary.qnt` (5), `NotesView.qnt` (7), `FilesBrowser.qnt` (4). Duplicates: none as data; the four models it parameterises are all DELETE and have live counterparts (Camera, Photos, CanonicalNotes*/NotesLifecycle, Files models in `application/`). Callers/importers: only `specs/quint/legacy/check-view-refresh.mjs:26` (itself uncalled, DELETE) and `specs/quint/legacy/manifest.json` (`sources` / `legacyConfigurations` metadata at l.762, 860, 887, 962, 992). `git grep legacyConfigurations` outside manifest: no reader. Not read by `scripts/check-quint.ts`, `quint-lib.ts` or any test.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | P6 / A7 | Historical design-comparison configurations; the only executable reader is a manual runner nothing invokes. Models no live product file. | Delete with the legacy family and `check-view-refresh.mjs`. | None |
| 2 | all | B5 | Expected-violation entries (e.g. CameraSession `AsBuilt_AgentQueue` `AgentFailsOnlyForCause: violation`) record findings about past code as permanent evidence. | Goes with file. | None |

## Proposed end state
Deleted together with `check-view-refresh.mjs`, the four legacy view-refresh models and `legacy/manifest.json`.
If the legacy family is (against the recommendation) kept, delete this file and the runner anyway and drop the
manifest `sources`/`legacyConfigurations` references: `quint:verify` already typechecks, tests and simulates the models.
