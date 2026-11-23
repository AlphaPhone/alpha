# specs/quint/application/ScreenFocusOwnership.qnt
- Lines: 149 | Kind: Quint model, live (in `application/manifest.json`, run by `quint:check`) | Verdict: KEEP model / PORT harness
- Covers: Screen-change focus coordinator: first screen untouched, resize cannot narrow a pending navigation, voluntary blur stays blurred, an old uninstaller cannot remove its replacement. Duplicates: KeyboardGeometry / ListFocus touch focus but not this coordinator. Callers/importers: `screen-focus-ownership.mjs` (aggregate) <- `test/quint-screen-focus-ownership.test.mjs` + aggregate (T4).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1 | A8 | No header comment. | Add one. | - |
| 2 | harness | T2/T10 | `screen-focus-ownership.mjs:151-167` reads prepared `.eliza/.../accessibility/screen-focus.ts`, asserts it is byte-equal to `vendor/eliza/...` and its sha256 is in the projection stamp, injects `globalThis.inspectFocus` before the marker `  return {\n    screenChanged: () => schedule(),`, strips types of it and of `runtime/view-focus.ts`, and runs both in `vm`. | PORT: bundle `runtime/view-focus.ts` (which imports the prepared coordinator) and observe `document.activeElement` per frame instead of private `frame/remaining/held`. If private state is needed, ask upstream to export an inspector (D14 follow-up), never inject. | M |
| 3 | harness | B5 | sha256/projection-stamp provenance checks. | Delete. | L |

## Proposed end state
- Model kept with header.
- Harness imports `installViewFocus` through esbuild and asserts on DOM focus; no marker injection, no hash checks.
