# specs/quint/refinement/application/drawer-interaction-fixture.tsx
- Lines: 210 | Kind: browser fixture (esbuild entry) mounting the real `installHomeShell` adapter and shared React `InstalledAppsGridDrawer` | Verdict: KEEP
- Covers: the in-page driver for `DrawerInteraction`: pointer hold, menu ownership, focus, search, inventory, Add to Home, App Info dispatch. Duplicates: none. Callers/importers: `drawer-interaction.mjs:9` (bundled as entry) and, through the `globalThis.quintDrawerFixture` it installs, `app-info-handoff-composition.mjs` (`reset([], true)`, `handoff()`, `captureAppInfo`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3-6 | – | Imports real modules (`apps/app/src/native`, `prototype/home-shell`, prepared launcher and navigation). Good. | Keep. | – |
| 2 | 24, 51, 163 | T10 | Depends on `globalThis.quintDrawerPort.inspect`, which `drawer-interaction.mjs` injects into the upstream drawer by text (`opened = useRef...`). The `press`/`swallow`/`opened` ref names are upstream internals. | See `drawer-interaction.mjs` report: derive menu/press state from DOM where possible; otherwise an upstream test hook (D14). | Med |
| 3 | 52-62 | T10 | Timer port asserts the exact 450 ms hold duration via the injected `setTimeout` seam. | Install the timer port by overriding `window.setTimeout`/`clearTimeout` before the bundle runs, filtering by duration, so no source rewrite is needed. | Low |
| 4 | 25-42 | C1 | `HostBase` re-declares a minimal shell (`S`, `shellNavigate`, `renderVals`). | Fine for a fixture; use `ShellHost` type when it lands. | Low |
| 5 | 187-207 | – | `handoff`, `captureAppInfo`, `useNative` exist only for `app-info-handoff-composition.mjs`. | Keep while that composition harness lives. | – |

## Proposed end state
Same fixture, typed against the shared shell type, timer port installed globally instead of by source rewrite. Survives as long
as `drawer-interaction.mjs` and `app-info-handoff-composition.mjs` live.
