# specs/quint/application/LauncherObserver.qnt
- Lines: 45 | Kind: Quint model (live, `specs/quint/application/manifest.json`) | Verdict: KEEP here; owner question: move upstream (P6/D14)
- Covers: shared launcher package/visibility/resume observer: one debounce owner, subscription removed exactly once after stop (upstream `plugin-native-system/src/client/launcher.ts`). Duplicates: none. Callers/importers: `scripts/check-quint.ts` (scenarios + simulation, manifest family `application`); harness `launcher-observer.mjs` (+ `.md`) via `test/quint-launcher-observer.test.mjs` and `test/quint-application-refinement.test.mjs` (via `specs/quint/refinement/application/index.mjs`)

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-45 | P6 | Models only upstream code (manifest also pins `vendor/eliza/.../launcher.ts` and `upstream.lock.json`); `home-shell.ts` listed but not driven. | Upstream follow-up; keep passing. | L |
| 2 | harness 14-18 | T10 | Injects at `  let pending: ReturnType<typeof setTimeout> | null = null;` in the generated file. | Upstream snapshot hook; keep meanwhile. | M |
| 3 | — | T4 | Runs twice. | Keep one runner. | L |

## Proposed end state
- Upstream code (`.eliza/client-features` is generated from `vendor/eliza`); unchanged here, one runner.
