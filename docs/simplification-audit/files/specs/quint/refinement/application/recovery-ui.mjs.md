# specs/quint/refinement/application/recovery-ui.mjs
- Lines: 136 | Kind: Quint refinement harness (esbuild bundle of real `apps/app/src/runtime/error-boundary.tsx` + React + JSDOM; one appended export reads three module locals) | Verdict: KEEP; minor PORT (replace appended export with a product-exported read-only state)
- Covers: global startup listeners, plain DOM recovery panel, React `RootErrorBoundary`, diagnostics formatter and crash log: one recovery panel in either ordering, private content excluded from panel and problem log, forced test-mock failure, reload requests (live model `RendererFailureUI.qnt`, manifest ~l.1463). Duplicates: partial — `test/browser/accessibility-resilience.spec.ts` drives the recovery panel in Chromium (reload/focus); the private-content and ordering cases are only here. Callers/importers: `index.mjs:21`, `test/quint-recovery-ui-refinement.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 29 | T10 (light) | Appends `export const inspectRecoveryModule=()=>({shown,installed,forced})` to the source; pins three module-level `let` names (present at error-boundary.tsx l.61/98/118). | Export `recoveryState()` (read-only, three booleans) from `error-boundary.tsx`, or derive `shown` from the DOM and `installed` from listener effects. | Low |
| 2 | 33-39 | B5, P1 | Source set adds `package-lock.json`, `upstream.lock.json`, `scripts/prepare-client-features.ts`, `.eliza/client-features/.source.json`; the module is built twice to assert the graph is unchanged. Any lockfile bump invalidates the receipt. | Build once; bind only the metafile inputs. | Low |
| 3 | 46-52, 99-100 | B4 | Replaces `globalThis.window/document/...` and `console.error` and restores them by hand. | Keep (React needs globals) but move to a shared `withDomGlobals(dom, fn)` in `support.mjs`; other JSDOM harnesses repeat it. | Low |
| 4 | 1-136 | D8 | No spaces, dense one-line functions. | Formatter pass (D9). | None |

## Proposed end state
~110 lines: one build, a product-exported `recoveryState()`, shared DOM-globals helper; same 14 schedules. Registered once in the per-model runner.
