# specs/quint/refinement/application/appearance-preference-admission.mjs
- Lines: 121 | Kind: Quint refinement harness over a transplant fixture (`test/fixtures/appearance-preference.mjs` slices three product files) | Verdict: KEEP model, PORT harness (needs product extraction)
- Covers: theme choice (Light/Dark/System) admission — startup `?theme` preview predicate, System media-query and browser storage/pageshow listeners, marked vs explicit writeback after commit, storage write refusal, listener retirement — against `AppearancePreferenceAdmission.qnt` (160 lines, live). Duplicates: `test/appearance-preference.test.mjs` (reviewer verdict DELETE; it calls this harness plus fixture cases). Playwright Settings specs switch theme but do not exercise storage events/markers. Callers/importers: `index.mjs`, `test/appearance-preference.test.mjs` (only per-model caller).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2 (fixture 7-55) | T2/T10 (inherited) | The fixture slices `prototype/settings-adapter.ts` at 5 anchors (`'    this.passwordLifecycle = passwordManagerLifecycle(changed);'` … `'    let lastBinding ='`, the `removeEventListener('storage',…)` line, the Theme `kSeg` row, `p.componentDidUpdate`…`p.componentWillUnmount`, `export type AppearanceChoice =`…`const UPDATE_KEY =`), `main.tsx` (`const initialTheme = (() => {`…`document.documentElement.dataset.connectionMode`) and `prototype/model.js` (theme selector and `themes: [["light",` toggle), then evaluates them in `vm`. Every one of those files is a stage-F split target. Note the first anchor is in the password-manager lifecycle, which may itself move. | Extract `runtime/appearance-preference.ts` exporting `initialTheme(search, storage, testMocks)`, `installAppearanceListeners({window, media, storage, onRead})` returning a disposer, `appearanceOptions`, and `commitAppearance(prev, next, storage)`; settings-adapter/main/model.js call it. The harness imports it with `bundledSource`; the fixture shrinks to ports (events, storage, media). | Med |
| 2 | 10-12 | B5 | Hash capture of sources. | Drop. | None |
| 3 | 27-114 | (keep) | 11 bounded scenarios with clear labels. | Keep. | – |
| 4 | – | wiring | If `test/appearance-preference.test.mjs` is deleted as proposed, this harness still runs via `index.mjs`/the single runner. Move the fixture into this folder (it is formal-harness support, not a host test fixture). | MOVE `test/fixtures/appearance-preference.mjs` → `specs/quint/refinement/application/appearance-preference-ports.mjs` after the port. | Low |

## Proposed end state
Harness unchanged in shape (~110 lines) importing a real `appearance-preference.ts` module; fixture reduced to
controlled ports and co-located with the harness. Until the extraction lands, this harness blocks Prettier and the
splits of `settings-adapter.ts`, `main.tsx` and `model.js`.
