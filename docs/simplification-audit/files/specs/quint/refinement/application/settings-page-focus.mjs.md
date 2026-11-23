# specs/quint/refinement/application/settings-page-focus.mjs
- Lines: 70 | Kind: Quint refinement harness, source slice of `prototype/model.js` evaluated with `vm.runInNewContext` over JSDOM | Verdict: PORT
- Covers: `SettingsPageFocus` — the Settings sub-page focus memory (`stPageFocus` / `stPageAccess` in `apps/app/src/prototype/model.js`) restores the last focused control per page on Back and survives remounts. Duplicates: Settings keyboard/focus Playwright specs (accessibility journey) cover parts. Callers: `index.mjs` aggregate only; `specs/quint/application/manifest.json` names the harness. No per-model test.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 14-17 | T10 | Slices `model.js` between `'var stPageFocus ='` and `'/* the prototype page'` and evaluates the fragment. Both anchors exist today; the stage F `model.js` split or Prettier will break them. | Move `stPageFocus`/`stPageAccess` into its own module (e.g. `apps/app/src/prototype/settings-page-focus.ts`) during the split, export `stPageAccess` and a read of the WeakMap (or observe via `document.activeElement` only), import it here. | M |
| 2 | 47 | C3/B5 | Own `captureInputs` call instead of `support.mjs` `boundInputs`; inconsistent provenance handling. | Use the shared helper or drop provenance (see `support.mjs`). | L |
| 3 | — | T4/coverage | Only reachable through the aggregate test that the plan deletes. | Add `test/quint-settings-page-focus.test.mjs` wrapper (or the generic per-model runner) before deleting the aggregate. | M |

Product file read as text: `apps/app/src/prototype/model.js`; anchors `var stPageFocus =`, `/* the prototype page`.

## Proposed end state
Imports `stPageAccess` from a small Settings focus module; four schedules unchanged; own per-model test entry.
