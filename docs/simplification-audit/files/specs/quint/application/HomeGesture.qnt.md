# specs/quint/application/HomeGesture.qnt
- Lines: 133 | Kind: Quint model (live, `specs/quint/application/manifest.json`) | Verdict: KEEP; PORT harness (marker + function rewrite)
- Covers: Home edit gestures: one pointer owns a press or drag, retired surfaces own nothing, drags only while editing on Home, favourites stay unique (`home-shell.ts`, upstream `MobileHomeScreen.tsx`, `InstalledAppsGridDrawer.tsx`, `navigation.ts`). Duplicates: none. Callers/importers: `scripts/check-quint.ts` (scenarios + simulation, manifest family `application`); harness `home-gesture.mjs` (+ `.md`) via `test/quint-home-gesture.test.mjs` and `test/quint-application-refinement.test.mjs` (via `specs/quint/refinement/application/index.mjs`)

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness 15-26 | T10 | Injects `__port.inspect` at `  let swallow = '';` and replaces the `focusTile` definition text with a port call. | Export a gesture controller (state + handlers) from home-shell.ts and pass the focus scheduler as a parameter. | M |
| 2 | harness 11 | D13 | Reads `.eliza/client-features/.../navigation.ts` by relative path. | Use the `@eliza/*` alias once it exists. | L |
| 3 | — | T4 | Runs twice. | Keep one runner. | L |

## Proposed end state
- Model unchanged.
- Harness imports an exported gesture controller with an injected focus scheduler.
