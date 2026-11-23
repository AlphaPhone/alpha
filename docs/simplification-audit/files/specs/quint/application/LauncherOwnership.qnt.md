# specs/quint/application/LauncherOwnership.qnt
- Lines: 105 | Kind: Quint model (live, `specs/quint/application/manifest.json`) | Verdict: KEEP here; owner question: move upstream (P6/D14)
- Covers: shared launcher inventory+default-dialer readback and launch ownership: stale reads/launches cannot replace current state, failed launch triggers quiet refresh (upstream `launcher.ts`, `mobile-launcher.ts`). Duplicates: none. Callers/importers: `scripts/check-quint.ts` (scenarios + simulation, manifest family `application`); harness `launcher-ownership.mjs` (+ `.md`) via `test/quint-launcher-ownership.test.mjs` and `test/quint-application-refinement.test.mjs` (via `specs/quint/refinement/application/index.mjs`)

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-105 | P6 | Upstream-only code; `home-shell.ts` listed as source but not driven. | Upstream follow-up. | L |
| 2 | harness 27-36 | T10 | Injects at `  let lifetime = 0;` in the generated file and evals CJS with `new Function`. | Upstream snapshot hook. | M |
| 3 | — | T4 | Runs twice. | Keep one runner. | L |

## Proposed end state
- Upstream code (`.eliza/client-features` is generated from `vendor/eliza`); unchanged here, one runner.
