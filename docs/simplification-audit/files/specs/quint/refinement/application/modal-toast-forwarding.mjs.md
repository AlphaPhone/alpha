# specs/quint/refinement/application/modal-toast-forwarding.mjs
- Lines: 204 | Kind: Quint refinement harness (whole-file transplant, `ModalToastForwarding`, live) | Verdict: PORT
- Covers: page toasts (and their Undo) are forwarded into the newest open modal's live region in open order, for native and ARIA dialogs, and a stale disposer cannot retire a replacement installation (`installToastLayer` in `apps/app/src/runtime/toast-layer.ts`). Duplicates: none. Callers/importers: `test/quint-modal-toast-forwarding.test.mjs`; aggregate `index.mjs` (T4).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 155-156 | T2 | Strips `toast-layer.ts`, regex-removes `export`, runs in `vm` and exposes the module-private `installed` via `globalThis.current = () => installed`. | Import with `sourceModule` (toast-layer has no imports) and derive `state.installed` from disposer identity — `install()` already returns the existing disposer when installed (line 102 relies on it). | L |
| 2 | 153 | T10 | Binds `apps/app/src/main.tsx` and `prototype/template.html` as sources though neither executes; every `main.tsx` edit re-selects this model in changed-model CI. | Bind `toast-layer.ts` and the driver only (and drop them from the manifest entry). | L |
| 3 | 20-26 | — | Rewrites `:modal` selectors on JSDOM prototypes because JSDOM lacks `:modal`. Necessary under JSDOM. | Keep (or run in Chromium if other harnesses move there). | — |
| 4 | test wrapper | B5 | Exact `traceInputs.length === 8`, `observedFields.length === 10`. | Drop. | L |

## Proposed end state
Imports `installToastLayer`; observation from DOM and disposer identity; eight schedules kept; sources narrowed.
