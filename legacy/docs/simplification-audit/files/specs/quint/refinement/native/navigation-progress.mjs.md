# specs/quint/refinement/native/navigation-progress.mjs
- Lines: 256 | Kind: Quint refinement driver; bundles and runs the real Maps modules with esbuild (no source slicing) | Verdict: KEEP; SIMPLIFY
- Covers: Turn-by-turn guidance: maneuver advance, arrival radius, off-route thresholds (76/99/101 m), stale fixes (30 s, -5 s skew), reroute success/failure/supersession, background-notification availability/start/stop ownership with stale native replies, hidden-screen release, follow/recenter. Model `NavigationProgress`. Product: `apps/app/src/maps/screen.ts`, `apps/app/src/maps/background-navigation.ts`, prepared `.eliza/client-features/plugins/plugin-maps/src/client/{state,saved-places,navigation-fix}.ts`. Duplicates: none (Java side is `navigation-service.mjs`). Callers/importers: `native/index.mjs:40,170`, `test/quint-navigation-progress.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 28-56 | C5 | Discover-bundle, hash, rebuild, `import('data:…')` is the same routine as `renderer.mjs:9-25` and `request-withdrawal.mjs:117-128`. | One `bundleModules(entries)` helper in shared harness support. | Low |
| 2 | 13, 39-40 | T10 (light) | `prototype/maps-adapter.ts` and the pinned `vendor/eliza/.../maps-screen.ts` are hashed as "sources" though neither is executed; renaming `maps-adapter.ts` (structural pass) breaks the harness for no behavioural reason. | Drop both from `sources`. | None |
| 3 | 43-52 | B5 | Re-authenticates the prepared client-features manifest against the pin and every bundled file's sha. `prepare-client-features` owns that check. | Delete. | None |
| 4 | 29 | — | `resolve('.')` makes the harness depend on the caller's cwd. | Use `root` from `java.mjs`. | Low |
| 5 | 22-27 | C3 | `flush`, `hold` (deferred) redefined. | Shared helpers. | None |
| 6 | 251-256 | A7 | `--observe` CLI branch; nothing passes it (`git grep -- --observe` hits only CLI branches in three harnesses). | Delete. | None |
| 7 | whole | D8 | One-space indentation, long object literals. | Prettier pass. | None |

## Proposed end state
~200 lines: shared bundle helper, the fixture, the 24 named schedules and `checkTraces`. No manifest
re-authentication, no hashed-but-unused files, no CLI.
