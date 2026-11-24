# test/quint-inline-modal-focus.test.mjs
- Lines: 71 | Kind: Quint replay on a real module (esbuild bundles `runtime/inline-modal.ts`, runs in JSDOM; traces from `shell-model-traces.mjs`) | Verdict: MOVE to `specs/quint/refinement/application/inline-modal-focus.mjs` and register in the runner
- Covers: `createInlineModal` focus rules (open, dismiss via alpha-back, native dialog above, opener leaving/returning, restore timer) follow 120 InlineModalFocus traces. Duplicates: modal focus Playwright specs (accessibility area). Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 12-13 | C3 | Inline esbuild → `data:` loader duplicates `bundledSource` in `refinement/application/support.mjs`. | Use the shared loader. | Low |
| 2 | 24-25 | T8 | Assigns `document`, `window`, `HTMLElement`, `MutationObserver`… on `globalThis` per fixture and never restores them; unsafe once several replays share a process in the runner. | Restore globals in `close()` or run in a JSDOM-scoped context. | Medium |
| 3 | 63 | — | Uses `t.mock.timers`, tying the replay to node:test. | Pass a clock port from the driver. | Low |

## Proposed end state
Driver `inline-modal-focus.mjs` (shared loader, scoped globals, injected clock) in the application index; this file deleted.
