# test/quint-shell-screen.test.mjs
- Lines: 91 | Kind: Quint replay + source-text assertions + unit scenario | Verdict: MERGE replay into `test/quint/refinement.test.mjs`; DELETE tests 2-3
- Covers: ShellScreen traces (boot, lock/unlock, power, openView, goHome, scripted voice) on the shell; the lock frame offers no Camera entry. Duplicates: Lock-screen behaviour is a Playwright concern (`journeys/home-shell.spec.ts`). Callers/importers: npm test (`scripts/run-node-tests.ts` glob `test/*.test.mjs`), so `npm run verify` and the `browser.yml` verify job.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 12-21 | T1 | Reads `model.js`, `template.html`, `development-system-surfaces.html` and regex-asserts absence of `lockCamera` and presence of `{{unlock}}`. | Delete. The trace step `tryLockedCamera` already asserts `typeof shell.lockCamera === "undefined"` at runtime. | Low |
| 2 | 86-91 | T1/T5 | Canary test of the regex helper itself. | Delete. | Low |
| 3 | 72-84 | T3 | Hand scenario on `shellCore` (lock refuses Camera, unlock permits). | Delete; the replay covers it, and a Playwright home-shell journey covers the visible flow. | Low |
| 4 | 33-34 | T10 | Uses `shell-core-fixture.mjs` (text-anchored `model.js` slice). | PORT with the model.js split. | High (blocks on split) |

## Proposed end state
- Driver for ShellScreen in specs; runner row; no source regexes.
