# specs/quint/refinement/application/shell-core-fixture.mjs
- Lines: 77 | Kind: test support for Quint replays — text slices of `prototype/model.js` compiled into a `Shell` class in a VM | Verdict: KEEP until `model.js` split, then PORT
- Covers: provides the shell's own state methods (`S()` … gestures, `startVoice`…`showHeads`, `pullContext`, `BASE`) with held timers so model-trace replays can drive them. Importers: `test/quint-back-dispatch.test.mjs`, `test/quint-fixture-busy-latch.test.mjs`, `test/quint-shade-pull.test.mjs`, `test/quint-shell-screen.test.mjs` (all four survive; they replay live models).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 14-23 | T10 | Four `between()` cuts: `'\n  S() {'`→`'\n  /* ---- gestures ---- */'`, `'\n  startVoice() {'`→`'\n  showHeads() {'`, `'\n  pullContext() {'`→`'\n  sw(fn, opts) {'`, `'\nvar BASE = {'`→`'\n};'`. All present today; the stage F split/Prettier breaks them. Listed in research as a top text-anchored harness. | When `model.js` is split, export the shell state class (or a mixin of these methods) and `BASE` from modules; replace this file with an import plus the timer port. | M |
| 2 | 35-42 | — | Supplies ~15 globals the slice reads (`VOICE`, `QUICK_SETTINGS`, `ALPHA_PRODUCT`, `PEOPLE`, …). These become real imports after the split. | Remove with port. | L |
| 3 | 15-19 | C3 | Fourth copy of a `between()` helper (also in `voice-owned-navigation.mjs`, legacy `source-support.mjs`, fixtures). | Goes away with port; until then one helper in `refinement/support.mjs`. | L |
| 4 | 24 | — | Imports the prepared upstream `navigateMobileShell` for real (good). | Keep. | — |

## Proposed end state
A ~25-line fixture: `import {Shell, BASE} from 'apps/app/src/prototype/shell/…'`, a held-timer port, `fire/pending/armed`.
Must land in the same change as the `model.js` split, before Prettier.
