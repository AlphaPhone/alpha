# test/quint-cloud-connection-notices.test.mjs
- Lines: 10 | Kind: Quint refinement wrapper (calls `checkCloudConnectionNotices` from `specs/quint/refinement/application/cloud-connection-notices.mjs`) | Verdict: DELETE
- Covers: mounted Cloud notices: independent dismissal and Settings ownership (2 traces, 8 fields). Duplicates: the same driver is registered in `specs/quint/refinement/application/index.mjs` and runs again in the aggregate `test/quint-application-refinement.test.mjs`. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-6 | T4, P3 | Second execution of a campaign the application aggregate already runs (Chromium, 600 s budget). | Delete; the model stays live through the family runner (`test/quint-refinement.test.mjs`). | None |
| 2 | 7-9 | B5 | Exact trace/checkpoint/field counts and `passed`/`inputsUnchanged`/`driverInputsBound` flags restate what `checkTraces` already enforces; they break whenever a scenario is added. | Gone with the file. The runner asserts only that each campaign passes. | None |
| 3 | 6 | T10 | Driver reads `connection-ui.css` as text (`cloud-connection-notices.mjs:17`), a pin that breaks on the `connection-ui.tsx` split. | Port note for the harness owner: load the stylesheet through the bundler, not by path. | Medium |

## Proposed end state
Deleted. `CloudConnectionNotices` keeps running once through the application campaign list in the manifest runner.
