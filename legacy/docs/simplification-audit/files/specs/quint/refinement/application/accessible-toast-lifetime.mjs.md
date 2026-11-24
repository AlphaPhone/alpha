# specs/quint/refinement/application/accessible-toast-lifetime.mjs
- Lines: 182 | Kind: Quint refinement harness (transplant: strip-types + vm eval of sliced source) | Verdict: KEEP model, PORT harness
- Covers: Android accessibility-timeout scaling of toast duration, stale native reads, toast queue/undo slots and focus hold/resume, against `AccessibleToastLifetime.qnt` (114 lines, live). Duplicates: partly by rendered browser checks it mentions (focus/Undo in Playwright toast specs); no other test drives the scale/stale-read logic. Callers/importers: `specs/quint/refinement/application/index.mjs` (aggregate), `test/quint-accessible-toast-lifetime.test.mjs` (per-model wrapper; T4 double run).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-13 | T2/T10 | `apps/app/src/runtime/accessibility-timeout.ts` is a real module but is loaded by `stripTypeScriptTypes` + regex-removing `import`/`export` lines and `vm` eval. | Load with `bundledSource('apps/app/src/runtime/accessibility-timeout.ts')` and call its exports. The harness reads the module-local `latestRefresh`; observe "latest" through the port instead (which request's reply changed `accessibilityTimeoutScale()`), so no test-only export is needed. | Low |
| 2 | 14-21 | T10 | Slices `apps/app/src/prototype/model.js` between `'  later(fn, ms, grp)'` (line ~5317) and `'  /* ---- per-app state ---- */'` and pastes it into `class ShellTimers{}`; also asserts the literal import line `import { accessibilityTimeoutScale } from '../runtime/accessibility-timeout';`. Any reformat (D9 Prettier) or `model.js` split (stage F) breaks it. | When `model.js` is split, extract toast timing/queue (`toast`, `holdToast`, `resumeToast`, `later`, `toastQueue`) into `prototype/toast-queue.ts` exporting a class or factory taking `{setState, setTimeout, clearTimeout, scale}`; import it here. Until then this harness is a blocker for Prettier on `model.js`. | Med |
| 3 | 118-119 | B5 | `sources` lists `main.tsx` and `AlphaDevicePlugin.java` for hashing although neither is executed. | Drop; list only executed inputs (or drop source hashing entirely with §2.8). | None |
| 4 | 56-57 | (good) | Cross-checks `toastUndo` vs `undoFn` and the single-timer invariant at every checkpoint. | Keep. | – |
| 5 | 131-175 | – | 12 bounded scenarios; reasonable. | Keep. | – |

## Proposed end state
~150 lines: `bundledSource` for `accessibility-timeout.ts`, imported `toast-queue` module (after the model.js split) with
injected timers, same 12 scenarios, no source-hash list. Runs once through the single manifest-driven runner (delete
the aggregate double run). Port prerequisite recorded in cross-file actions: model.js toast extraction.
