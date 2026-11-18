# apps/app/src/browser/dev-profile.ts
- Lines: 13 | Role: derives the development URL profiles (`?mode=dev`, `?tools=1`, `?workflows=agent`) behind the dev-surface flag. | Verdict: SIMPLIFY (move into `build-flags.ts` or the dev module)
- Importers: 36 (18 `browser/*`, `main.tsx`, `passwords/password-manager.ts`, 12 `prototype/*`, 5 `runtime/*`). Text/path pins: `specs/quint/application/manifest.json:481,5597,5630` (symbol `browserDevProfile`), Quint harnesses `refinement/application/hosted-digest-refresh.mjs`, `surfaces.mjs`, `refinement/services/contacts-session-replay.mjs`, `test/dev-surface-gates.test.mjs` and `test/settings-truth.test.mjs` (source-text, T1), `test/browser-camera-storage.test.mjs`, `test/native-adapter-activity.test.mjs`, `test/password-manager.test.mjs`, `test/quint-view-admission.test.mjs`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2-4 | C6 / D7 | `const devSurfacesEnabled=import.meta.env!==undefined&&import.meta.env.DEV===true&&…` — a second definition of `build-flags.ts:3`, kept "so Node contract tests … can load this module without Vite". | Import `devSurfacesEnabled` from `build-flags.ts`; give the Node test loader an `import.meta.env` shim once (shared resolve/env hook) instead of per-module guards. | Medium (Node tests that import this chain) |
| 2 | 7, 11, 13 | C3 | `new URLSearchParams(location.search)` parsed three times. | `const params=new URLSearchParams(location.search)`. | None |
| 3 | 7, 13 | D5 | Three more flags in the flag zoo; `developmentAgentWorkflows` and `developerTools` belong with the other flags. | Move all three to `build-flags.ts` (or `dev/flags.ts`), keep exported names (manifest pins `browserDevProfile`). | Medium (36 importers) |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `devSurfacesEnabled` | const | 4 | `build-flags.ts:3` | `build-flags.ts` only |

## Proposed end state
~8 lines (or merged into `build-flags.ts`): one params parse, flag imported, names unchanged.

## Verification
`test/dev-surface-gates.test.mjs` and `test/settings-truth.test.mjs` are source-text tests to delete per D10; production bundle audit with flag off; dev build with `ELIZA_DEV_ALLOW_TEST_MOCKS=1`; Quint `surfaces` refinement.
