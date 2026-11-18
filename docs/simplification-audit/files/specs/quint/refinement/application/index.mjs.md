# specs/quint/refinement/application/index.mjs
- Lines: 187 | Kind: Quint refinement aggregate (family runner + state/action coverage check) | Verdict: REWRITE as one manifest-driven runner
- Covers: imports 110 application campaign modules, runs 113 adapters serially and, for each receipt, checks that every model state field was observed and every model action executed (`modelStateInventory`, `unobservedStateFields`, `traceActionCoverage`), listing models without a receipt as open obligations. Duplicates: ~90 of the adapters also run through their own `test/quint-<model>.test.mjs` wrapper (research ci-and-formal §2.4: 18-minute aggregate). Callers/importers: `test/quint-application-refinement.test.mjs` (both exports), `scripts/check-quint-refinement.ts:63` (`npm run quint:refinement`), and listed as a captured input in `support.mjs:17`, `permission-choices.mjs:64`, `chat-attachments.mjs:99`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-147 | T4 | Hand-maintained import list + adapter array duplicates the per-model wrappers; every campaign runs twice per `npm test`, and the aggregate test has a 40-minute timeout. | Add a `refinement: "<file>#<export>"` field to each `specs/quint/application/manifest.json` entry; one runner iterates the manifest (path-selected in CI) and calls each export once. Delete the adapter list and either the per-model wrappers or this aggregate — not keep both. | M: needs manifest edit for ~110 models. |
| 2 | 115-147 | — | Membership is inconsistent: `keyboard-focus.mjs` and `modal-scrim-ownership.mjs` run **only** here (no wrapper), while `map-plane-ownership.mjs`, `maps-share-choice.mjs`, `media-copy-intent.mjs` (ITF replays) run **only** via wrappers. Deleting either side today silently drops coverage. | Manifest runner covers both kinds. | H if wrappers or aggregate are deleted first. |
| 3 | 57-60, 139-142 | A1/D1 | Adapters for models whose code D1 deletes: `checkPreviousNotesAvailability`, `checkPreviousNotesSourceOpening`, `checkNotesTrashReadPublication` (model reports: DELETE); also legacy-flavoured `checkFirstSendDraftMigration`, `checkCameraPreviewRetirement` (owned by other chunks). | Remove with their models. | L |
| 4 | 154-187 | — | The coverage check (unobserved fields, unexecuted actions, "no receipt" obligations) is the only place this gate exists. Worth keeping. | Move `collectApplicationCampaigns`' coverage logic into the shared runner so every model gets it, also when run alone. | — |
| 5 | 157 | C3 | `Array.isArray(manifest) ? manifest : manifest.models` re-implements manifest reading (`scripts/quint-lib.ts:58-96`). | Use the exported reader. | L |
| 6 | 162 | B3 | `'PermanentVoiceDeletionContract' → 'PermanentVoiceDeletion'` rename special-case. | Make that receipt report its manifest module name. | L |
| 7 | 174-175 | B5 | Every assumption after the first becomes an "obligation" row — report noise with no consumer beyond the receipt file. | Drop unless a reader exists. | L |
| 8 | 179 | B1 | Adapter exceptions are collected, not thrown; the caller must remember to assert `failures` empty. | Fine for a runner that reports all failures; keep but make the runner exit non-zero. | — |

## Proposed end state
- `specs/quint/refinement/run.mjs` (or `scripts/check-quint-refinement.ts`) reads the three manifests, imports each `refinement` export, runs it once, applies the coverage check, and fails on any failure.
- `index.mjs` and its hand-written import list deleted; `test/quint-application-refinement.test.mjs` deleted or reduced to calling the runner for the application family.
- Campaigns for D1-deleted models removed with their models.
