# specs/quint/refinement/application/dock-clearance-ownership.mjs
- Lines: 202 | Kind: Quint refinement harness, source transplant (strips types from three files, regex-removes imports/exports, concatenates into one `vm.Script`) | Verdict: PORT
- Covers: the dock/header clearance publishers install once, a second install returns the same disposer, an old disposer cannot erase a replacement, dock retirement keeps the last clearance, scale and screen restore re-measure. Duplicates: none at behaviour level. Callers/importers: `refinement/application/index.mjs:101`, `test/quint-dock-clearance-ownership.test.mjs`.
- Model: `DockClearanceOwnership.qnt`, live (sources `runtime/dock-clearance.ts`, `main.tsx`, `prototype/template.html`, `vendor/eliza/.../dock-clearance.ts`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 17-18, 161-170 | T2/T10 | Reads `.eliza/.../screen-focus.ts`, `.eliza/.../dock-clearance.ts` and `runtime/dock-clearance.ts` as text, strips types, deletes every `import`/`export` line by regex, and relies on the free identifiers `isExposed`, `NATIVE_DIALOG_SELECTOR`, `installDockClearance`, `visibleDocks` and the module-level variable `installed` (`globalThis.current = () => installed`). | Bundle `apps/app/src/runtime/dock-clearance.ts` with esbuild (`platform: 'browser'`, iife, globals from the JSDOM window) and call its exported `installDockClearance`. | Med |
| 2 | 74, 105-107 | T10 | `state.installed` uses `context.current()` (the closure variable) to find the live disposer. | Track it in the driver: the last returned handle that has not been called; `installDockClearance` already returns the same handle while installed (`dock-clearance.ts:46`). No product export needed. | Low |
| 3 | 153-160 | B5 | Hashes the prepared shared file and `screen-focus.ts` against `.eliza/client-features/.source.json` and asserts byte-equality with `vendor/eliza`. That is `prepare-client-features.ts`'s job. | Delete. | Low |
| 4 | 150-151 | B5 | `main.tsx` and `template.html` are listed as sources but never executed. | Keep only in the manifest (lane trigger), not in the receipt. | Low |
| 5 | 20-147 | – | JSDOM geometry fixture with controlled rAF and ResizeObserver is good and needed. | Keep. | – |

## Proposed end state
`compile()` = esbuild bundle of the product module; `fixture()` installs JSDOM globals and evaluates the bundle; observation reads
CSS custom properties and the driver-tracked handle. No hashing, no regex surgery. Five schedules unchanged. Runner: per-model
test only. Lane: `runtime/dock-clearance.ts`, upstream lock, the model.
