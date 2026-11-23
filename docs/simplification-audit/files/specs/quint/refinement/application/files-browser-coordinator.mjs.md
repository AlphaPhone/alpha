# specs/quint/refinement/application/files-browser-coordinator.mjs
- Lines: 163 | Kind: Quint refinement harness; esbuild bundle of upstream `files-browser-adapter.ts` with one `onLoad` closure-observer seam | Verdict: MERGE into `specs/quint/refinement/application/files-browser.mjs` (with `files-filter.mjs` and `files-preview.mjs`)
- Covers: Files folder readback: a late old denial/grant/failure or listing cannot overwrite a newer folder, leave/re-entry fences, primary volume ordering, an obsolete agent share request cannot dispatch. Duplicates: run by `test/quint-files-browser-controller.test.mjs` and the aggregate `index.mjs:70` (T4); shares `compile`/`fixture` scaffolding with `files-filter.mjs` almost line for line (C5). Callers/importers: those two.
- Model: `FilesBrowserController.qnt` (manifest entry at `application/manifest.json:1725`), live. Code under test: prepared upstream `plugins/plugin-files/src/browser/files-browser-adapter.ts`, `storage-model.ts`, `files-agent-contract.ts`, copied verbatim (`prepare-client-features.ts:118-121`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 21-26 | T10 | Inserts `__ports.inspect=()=>({bound:!!api,active,place,generation,stateGeneration,access,volumes,entries,loaded,busy,error})` before `'  const repaint = () =>'` (matches once, line 283). Couples to eleven closure variable names in upstream code. | Ask upstream for a read-only inspection export of the adapter state (D14 follow-up). Until then keep the seam, but in one shared `compileFilesAdapter(inspectFields)` used by all three Files harnesses. | Med |
| 2 | 18-31, 33-101 | C5 | `compile()` and the storage/api/view fixture duplicate `files-filter.mjs:22-160` (same seam, same `new Function('require','module','exports',...)` boot, same `installFilesBrowserAdapter(view, ..., {storage, createInlineModal, menuFocus, forgetSelected})` call). | One `files-browser.mjs`: shared compile + boot, three exported checks (`checkFilesBrowserController`, `checkFilesFilter`, `checkFilesPreview`). | Low |
| 3 | 9-10, 28-30 | P6 | Code under test is upstream-only; the only Alpha source in the manifest is `selection-adapter.ts`, which this harness does not load. | Lane-gate on `upstream.lock.json` (+ model file). | Low |
| 4 | 106-155 | D9 | Schedules chosen by `name.endsWith(...)`/`startsWith` string tests in one 40-line nested `if`. | Express each schedule as a step list (as `files-filter.mjs` already does). | Low |
| 5 | file name | D11 | File says "coordinator", export and model say "controller". | Gone after merge. | – |

## Proposed end state
`files-browser.mjs` (~250 lines instead of ~450): shared bundle + boot, step-list schedules for controller, filter and preview,
three exports, one test file `test/quint-files-browser.test.mjs` with three cases. Runs only on upstream lock or model changes.
