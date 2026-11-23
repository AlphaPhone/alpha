# specs/quint/refinement/application/shell-coordinator.mjs
- Lines: 256 | Kind: Quint refinement harness, real mounted application (Vite dev server + Chromium via Playwright) with two Vite-transform text anchors | Verdict: KEEP (simplify)
- Covers: `ShellNavigation` (receipt id `ShellCoordinator`) on the mounted app — repeated same-view navigation, Home, Back with chat expanded, and a held agent reply that Back keeps but view change, `visibilitychange` hidden and `pagehide` retire. Product: `apps/app/src/main.tsx`, `prototype/model.js`, `prototype/agent-adapter.ts`, `runtime/alpha-client.ts`, `runtime/connection-ui.tsx`. Duplicates: `surfaces.mjs` `shellNavigation()` (same model, sliced `model.js` methods, strictly weaker); `test/quint-shell-screen.test.mjs` (shell-core-fixture, other model); chat send/stop Playwright specs cover the UI half. Callers: `index.mjs` aggregate only (`checkShellCoordinator`); also runnable as a script (l.253). No per-model test.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 42-49 | T10 | Vite plugin finds the literal `'shell = value;'` in `main.tsx` and appends `window.quintShell = value`, and appends `window.quintActors = {alphaClient, connectionController}` to `agent-adapter.ts`. One anchor, asserted. | Acceptable short-term; better: a dev-only test hook exported behind `testMocksEnabled` is *not* wanted (D7). Keep the transform but anchor on an exported symbol (e.g. inject `import {alphaClient} from …` into a virtual module) rather than a statement string. | L |
| 2 | 20-26 | B5 | Hashes every `sourcePaths()` file and every file in `.eliza/client-features` (thousands) as provenance; `upstream.lock.json` listed twice. | Drop; the module graph (`transformed`) is the real input set if provenance survives at all. | L |
| 3 | 210-214 | B5 | Writes `test-results/quint-refinement/shell-coordinator-source.json` that nothing reads. | Delete the write. | L |
| 4 | 93-127 | — | 35 lines of boot-failure diagnostics (pending requests, stage). Useful for CI flake triage. | Keep, but move into the shared Playwright helper if other mounted harnesses repeat it. | L |
| 5 | 14-16 | T8 | 45 s step / 120 s mount timeouts per page, five fresh pages; minute-scale runtime with Vite cold start. | Reuse one page and reload, or one context; path-filter the lane to shell/agent/connection changes. | M |
| 6 | 253-256 | T9 | Self-run CLI branch. | Delete; the test is the entry point. | L |
| 7 | — | coverage | Only reached through the aggregate the plan deletes. | Add `test/quint-shell-coordinator.test.mjs` (or the per-model runner) before deleting the aggregate. | M |

## Proposed end state
Five schedules on the mounted app with fenced network, one injection hook, no provenance hashing or JSON dump, its
own per-model test in the browser-capable refinement lane. `surfaces.mjs#shellNavigation` deleted in its favour.
