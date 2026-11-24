# specs/quint/refinement/application/screen-focus-ownership.mjs
- Lines: 209 | Kind: Quint refinement harness, text transplant (upstream `screen-focus.ts` + `runtime/view-focus.ts` type-stripped into a `vm` with JSDOM) | Verdict: PORT
- Covers: `ScreenFocusOwnership` — the Alpha focus owner (`apps/app/src/runtime/view-focus.ts`, `installViewFocus`) plus the pinned upstream coordinator (`upstream renderer: accessibility/screen-focus.ts`) restore focus after screen changes, resize, Home, drawer/dialog mounts, and a stale disposer cannot retire its replacement. Duplicates: focus behaviour is also exercised by Playwright accessibility specs (focus restoration after navigation); no other formal harness. Callers: `test/quint-screen-focus-ownership.test.mjs`, `index.mjs` aggregate.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 163-168 | T10 | Inserts `globalThis.inspectFocus` into upstream source before the literal marker `'  return {\n    screenChanged: () => schedule(),'` (asserted to occur exactly once), then strips types and imports from both files by regex and evaluates the concatenation. Any upstream reformat breaks it. | Bundle `view-focus.ts` with `bundledSource` (alias `upstream renderer package` to `.eliza/client-features/packages/ui/src`). Observe `frame/remaining/held/cause` either through an upstream-exported inspector (upstream follow-up, D14) or drop those fields from the projection and observe through DOM focus + `requestAnimationFrame` queue only. | M |
| 2 | 155-162 | B5 | Re-verifies `.eliza/client-features/.source.json` stamp, vendor digest and byte equality of the prepared copy. `scripts/prepare-client-features.ts` (`checkClientFeatures`) already owns that check. | Delete; at most call `checkClientFeatures()` once in the lane setup. | L |
| 3 | 152-154 | B5 | Hashes `main.tsx`, `upstream.lock.json`, `prepare-client-features.ts` as "sources" though none executes here. | Pin only executed modules (the bundle metafile gives them). | L |
| 4 | 30-42 | — | JSDOM geometry and rAF stubs are reasonable fixture ports. | Keep. | — |
| 5 | — | T4 | Runs in both per-model test and aggregate. | Keep only the per-model wrapper. | L |

Product files read as text: `upstream renderer: accessibility/screen-focus.ts`, `upstream renderer: accessibility/screen-focus.ts`, `apps/app/src/runtime/view-focus.ts`, `.eliza/client-features/.source.json`, `upstream.lock.json`. Marker: the `return {\n    screenChanged:` literal. Regexes: `^import .*;`, `^export `.

## Proposed end state
Bundle `view-focus.ts` (real import of the prepared upstream module), install it into JSDOM, keep the six schedules,
observe DOM focus plus the pending animation-frame queue. No digest re-checks, no text insertion. If the private
scheduler fields must stay observed, request an exported inspector upstream instead of splicing.
