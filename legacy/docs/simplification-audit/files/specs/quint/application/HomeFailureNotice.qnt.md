# specs/quint/application/HomeFailureNotice.qnt
- Lines: 44 | Kind: Quint model (live, `specs/quint/application/manifest.json`) | Verdict: KEEP; PORT harness (marker)
- Covers: Home turns shared-launcher failures into at most one notice per new error, only on the Home surface (`apps/app/src/prototype/home-shell.ts` over upstream `mobile-launcher.ts`/`launcher.ts`). Duplicates: none. Callers/importers: `scripts/check-quint.ts` (scenarios + simulation, manifest family `application`); harness `home-failure-notice.mjs` (+ `.md`) via `test/quint-home-failure-notice.test.mjs` and `test/quint-application-refinement.test.mjs` (via `specs/quint/refinement/application/index.mjs`)

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness 29-36 | T10 | esbuild onLoad rewrites home-shell.ts at `  const shell = createMobileShellLauncher({` to expose `seenError,seenStatus,seenApps,launchReported` and evals with `new Function`. | Extract the notice decision into an exported pure function in home-shell.ts (inputs: previous seen state, launcher snapshot, surface) and drive it directly; or observe toasts in the DOM. | M |
| 2 | — | T4 | Runs twice. | Keep one runner. | L |

## Proposed end state
- Model unchanged (44 lines, cheap).
- Harness imports home-shell exports; no marker.
