# specs/quint/refinement/services/system-picker-visibility.mjs
- Lines: 62 | Kind: Quint forward replay harness (imports and runs the real modules) | Verdict: KEEP (SIMPLIFY: drop the `rewrite` hook)
- Covers: `SystemPickerVisibility.qnt` (live, `specs/quint/services/manifest.json:4553`) against `duringSystemPicker`/`systemPickerActive` in `apps/app/src/prototype/scan-pdf.ts:31-32` and `runFilePicker` in `apps/app/src/browser/file-picker.ts:3`: picker counter release, one owned file picker, a retired picker's late result dropped, back-cancel. Duplicates: run twice (`test/quint-system-picker-visibility.test.mjs` and `forward-replays.mjs:24`). Callers/importers: those two.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9, 11, 30 | T10 | `rewrite` option exists only so the test can text-replace product source (`'finally{systemPickers--;}'`, `'current?.abort();const controller'`) as mutation canaries. Both anchors exist today; Prettier (D9) or any edit breaks them. | Drop `rewrite`; delete the two canary tests. The `reached`/`required` checks already prove the replay is not idle. | Low |
| 2 | 11-14 | D13/D4 | Stubs keyed by exact relative specifiers of `scan-pdf.ts` imports, including `'../../../../.eliza/client-features/plugins/plugin-files/src/documents/scan-pdf.ts'`; moving `scan-pdf.ts` (stage F `dev/`/folder split, `@eliza/*` alias) breaks the harness. | Match stubs by resolved module (suffix) in the shared `loadModule`, or move the picker counter out of `scan-pdf.ts` into a small `system-picker.ts` with no heavy imports (then no stubs needed). | Low |
| 3 | 36-37 | – | Eight model dialog actions are no-ops by design (independent machines, documented). | Keep. | – |
| 4 | 15, 61 | D3 | Saves/restores `globalThis.window` around the replay. | Keep (needed for `EventTarget` window in Node). | – |

## Proposed end state
~50 lines, same shape, without `rewrite`. If the counter moves to its own module the stub map disappears. Called once
from the manifest-driven refinement runner.
