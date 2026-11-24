# specs/quint/refinement/services/browser-cloud-request-custody-probe.mjs
- Lines: 164 | Kind: Quint harness child process (imports the real `createBrowserCloudDevHandler` from `scripts/browser-cloud-dev-bridge.ts`, closes `node:fs/promises` for that module with `registerHooks`, closes `fetch`) | Verdict: KEEP
- Covers: three schedules of the dev Cloud bridge request slot: a duplicate request ID is rejected without dispatch, cancel reaches only the live incumbent, the ID stays held until the aborted handler settles, response close aborts and retains the slot, a late reply cannot write a closed response. Duplicates: `test/browser-cloud-dev-bridge.test.mjs` has cancel/duplicate cases over a real HTTP server (its report: KEEP, split); this probe is the model link. Importers: spawned by `browser-cloud-request-custody.mjs` only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-24 | — | Import-based with a module-resolution hook for the profile filesystem: the right pattern (no text slicing). It needs its own process because the hook and the `fetch` replacement are global. | Keep the subprocess. | — |
| 2 | 38-49 | B3 | `ClosedResponse` asserts the bridge's own header (`Cache-Control: no-store`) and single `writeHead`; useful invariants of the handler under test. | Keep. | — |
| 3 | 133 | A7 | `process.argv[2] === 'current'` - `'current'` is the only accepted mode (the baseline mode for commit `e180629f` no longer exists here), so the argument carries nothing. | Drop the argument (and the `'current'` the parent passes). | None |
| 4 | — | D6 / D20 | Models development-only code (the bridge is mounted only with `ELIZA_DEV_ALLOW_TEST_MOCKS=1`, resident or private preview). Per D20 code and proof stay or go together; the bridge stays (D6). | Keep; path-filter to `scripts/browser-cloud-dev-bridge.ts`. | — |

## Proposed end state
Unchanged apart from the dead mode argument.
