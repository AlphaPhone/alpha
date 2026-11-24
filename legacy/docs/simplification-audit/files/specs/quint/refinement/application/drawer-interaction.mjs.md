# specs/quint/refinement/application/drawer-interaction.mjs
- Lines: 99 | Kind: Quint refinement harness; esbuild bundle of the fixture with three `onLoad` text patches into upstream `InstalledAppsGridDrawer.tsx`; launches Chromium | Verdict: KEEP (remove two of three seams; gate on upstream lock)
- Covers: Apps drawer hold/menu/focus/search/inventory/App Info ownership on the real Alpha Home adapter + shared drawer. Duplicates: run by `test/quint-drawer-interaction.test.mjs` and the aggregate via `index.mjs:93` (T4). Part of it overlaps Playwright home-shell drawer specs at the user level, but none of those cover retired-timer/stale-menu races. Callers/importers: `index.mjs`, `test/quint-drawer-interaction.test.mjs`, `app-info-handoff-composition.mjs:9` (`compileDrawerInteraction`).
- Model: `DrawerInteraction.qnt`, live (sources `prototype/home-shell.ts`, prepared `InstalledAppsGridDrawer.tsx`, `navigation.ts`, `launcher.ts`, vendor copy, `upstream.lock.json`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 21-28 | T10 | Three `replaceOnce` seams in upstream source: after `'    opened = useRef<string \| null>(null);'` (exposes `press`, `swallow`, `opened` refs), `'clearTimeout(press.current.timer)'`, `'timer: setTimeout(() => {'`. All three anchors currently match once. | Replace the two timer seams with a page-level `setTimeout`/`clearTimeout` override installed before the bundle (fixture report #3). For the ref seam, project `s.menu`/`s.press`/`s.swallow` from DOM (menu presence, `aria-*`) or request an upstream test hook (D14 follow-up). | Med |
| 2 | 74, 76-80 | – | Launches headless Chromium per run; notable cost (seconds). | Acceptable; it is the only real-DOM drawer evidence. | – |
| 3 | 11, 31 | P6 | Code under test is almost entirely upstream (`.eliza/client-features/packages/ui/...`, copied verbatim by `scripts/prepare-client-features.ts:116`), plus `home-shell.ts`. | Run only when `home-shell.ts`, `upstream.lock.json` or the model change. | Low |
| 4 | 12-15 | C3 | Local `replaceOnce`; twins in other harnesses (ci-and-formal: 2 files). | Use `support.mjs` if any seam survives. | Low |

## Proposed end state
Fixture bundle with no source rewrites (or one upstream-blessed hook), 22 schedules, one runner (per-model test), lane-gated on
`home-shell.ts` + upstream lock. `compileDrawerInteraction` stays exported for the App Info composition harness.
