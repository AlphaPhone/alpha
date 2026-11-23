# specs/quint/application/SettingsPageFocus.qnt
- Lines: 30 | Kind: Quint model, live (in `application/manifest.json`, run by `quint:check`) | Verdict: KEEP model / PORT harness
- Covers: Settings sub-pages remember the focused control per page; same-depth Back restores it; a replaced control falls back to the first. Duplicates: ShellNavigation (settings row focus identity) is adjacent but different. Callers/importers: `settings-page-focus.mjs` (`checkSettingsPageFocus`), only via aggregate `index.mjs:4,115` (no per-model test).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness | T2/T10 | `settings-page-focus.mjs:14-17` slices `prototype/model.js` from `var stPageFocus =` to `/* the prototype page` and evaluates it in `vm` with a JSDOM root. | PORT: move `stPageFocus`/`stPageAccess` out of `model.js` into `prototype/settings-page-focus.ts` (exported), import it in `model.js` and in the harness. Fits the Stage F `model.js` split. | M |
| 2 | 1-30 | - | Tiny model (30 lines, 3 runs, no witnesses); still worth keeping as the oracle for the harness. | None. | - |

## Proposed end state
- Keep model; harness imports the extracted focus helper.
