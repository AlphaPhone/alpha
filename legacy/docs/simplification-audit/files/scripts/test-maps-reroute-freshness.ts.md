# scripts/test-maps-reroute-freshness.ts
- Lines: 134 | Kind: source transplant (`prototypeScript('maps-adapter.ts')` stripped and run in `vm` with ~45 stubbed globals) + one unit test of upstream `usableNavigationFix` | Verdict: REWRITE as a case in `journeys/maps.spec.ts`; DELETE the third test
- Covers: a reroute callback held across an aged (>30 s) fix does not replan and keeps the exact route with "current route was kept"; approximate/inaccurate fixes disable reroute; fresh GPS never reroutes automatically. Duplicates: Quint `specs/quint/refinement/application/maps-reroute-ownership` models it; no Playwright spec asserts "current route was kept" (grep). Callers/importers: `test/maps-reroute-freshness.test.mjs` (spawn shim with `--test`); imports `scripts/fixtures/prototype-script.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 21, 48-61 | T2 | Evaluates sliced `maps-adapter.ts` with stubs for `DailyApps`, `Capacitor`, Cloud Maps, location, voice, background navigation; also monkey-patches `Date.now`. | Drive the real Maps screen in Playwright with `context.setGeolocation` and `page.clock`. | Low |
| 2 | 128-134 | T5 | Unit test of the upstream predicate `usableNavigationFix`. | Delete (upstream plugin-maps owns it). | None |
| 3 | whole | T9 | Shim spawns `node --test` on this file. | Delete shim. | None |

Cases worth carrying: start guidance, advance clock 30 s without a fix, press Reroute -> no new route request and status "current route was kept"; emit an approximate fix -> Reroute disabled; fresh precise fix -> Reroute enabled, pressing it plans once.

## Proposed end state
File and shim deleted; two cases in `journeys/maps.spec.ts`. `scripts/fixtures/prototype-script.ts` loses this importer (check its remaining T2 importers; delete when none).
