# test/quint-fixture-busy-latch.test.mjs
- Lines: 54 | Kind: Quint replay with source transplant (slices `function latchPatch` and two `onLeave:` lines out of `prototype/model.js` by literal text; runs them in the `shellCore` vm fixture) | Verdict: PORT and MOVE (to `specs/quint/refinement/application/fixture-busy-latch.mjs`, registered)
- Covers: leaving a view with timed work (Workflows and Browser fixture leave handlers) clears its busy latch; `openView`/`goHome`/timer groups follow 150 FixtureBusyLatch traces. Duplicates: `quint-back-dispatch`, `quint-shade-pull`, `quint-shell-screen` share `shell-core-fixture.mjs`; no other test of `latchPatch`. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11-17 | T2, T10 | Markers: `\nfunction latchPatch(`, `\n}`, `onLeave: function (api) { var p = latchPatch(api && api.st, ["running"]);`, `onLeave: function (api) { var st = (api && api.st) || {}; var p = st.confirm ? null`. A Prettier pass or the `model.js` split (D1) breaks them. | PORT: export `latchPatch` and the two leave handlers from the module that owns the fixtures after the split; import them. | High |
| 2 | 11 | Hygiene | Reads `apps/app/src/prototype/model.js` relative to the process cwd. | Resolve from `import.meta.url` or import. | Low |
| 3 | 53 | B5 | Asserts the exact set of exercised actions. | Keep as the driver's coverage check. | None |

## Proposed end state
A driver imports `latchPatch` and the leave handlers, replays FixtureBusyLatch, and is listed in the application index. If D19 moves these fixtures behind `dev/`, the model moves with them (D20).
