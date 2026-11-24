# specs/quint/refinement/application/files-preview.mjs
- Lines: 59 | Kind: Quint refinement harness, source transplant (`sourceContext` strips and concatenates `files-browser-adapter.ts` into a `vm` context) | Verdict: PORT and MERGE into `specs/quint/refinement/application/files-browser.mjs`
- Covers: a preview's selected-document capability is released when the Files view is left before `storageSelect` completes (current / retired / returned). Duplicates: none at behaviour level. Callers/importers: **only** the aggregate `index.mjs:24,146` (`filesPreview`); there is no per-model `test/quint-files-preview.test.mjs`.
- Model: `FilesPreview.qnt`, live (sources: vendor Files files, upstream lock, `scripts/prepare-client-features.ts`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 30-33 | T2 | `sourceContext([source], ['installFilesBrowserAdapter'], {...rules.exports, ...contract.exports, ...})` reads the upstream adapter as text, strips `export` lines and evaluates it with sibling modules spread in as globals. | Use the shared esbuild bundle from the merged Files harness (no seam needed for this campaign: observation is entirely through ports). | Low |
| 2 | – | T4/T9 | No per-model test: if the family aggregate tests are deleted (ci-and-formal §2.4 recommendation), this model loses its only runner. | The merged `test/quint-files-browser.test.mjs` must call `checkFilesPreview`. | High if missed |
| 3 | 58 | A8 | Assumption text "Old tree-token semantics are historical." | Drop. | – |
| 4 | 4-7 | B5 | Wraps `checkTraces` only to append the driver and `support.mjs` as sources. | Drop with receipts. | Low |
| 5 | 9 | D11 | Export named `filesPreview`, every other harness exports `check<Model>`. | Rename `checkFilesPreview`. | Low |

## Proposed end state
Three schedules inside `files-browser.mjs` using the shared bundle and storage port; exported as `checkFilesPreview`; run by the
Files test file. Lane: upstream lock + model.
