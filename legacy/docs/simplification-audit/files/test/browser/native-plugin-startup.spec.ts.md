# test/browser/native-plugin-startup.spec.ts
- Lines: 23 | Kind: module-in-page unit tests (T6) of the 8-line `platform-plugins.ts` wrapper, with a startup smoke; project `chromium`, 2 tests | Verdict: **MERGE** test 1 (startup smoke) into `journeys/startup-permissions.spec.ts`; **DELETE** test 2
- Covers: test 1: the renderer starts without page errors when Android injects legacy synchronous `addListener` handles, and `registerPlugin` returns a shared promise-returning proxy whose listener removal reaches native; test 2: the first registration wins and later registrations share it. Duplicates: catch-all bridge copied from `native-insets.spec.ts`. Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 20-23 | T3 / T6 | Test 2 exercises `registerPlugin`'s Map cache with a made-up plugin name. No user effect. | Delete. | Low |
| 2 | 17-18 | T6 | Test 1 imports `/src/platform-plugins.ts` and `/src/daily.ts` to check proxy identity. The user-relevant part is "startup succeeds and listeners are added and removed on the native side". | Keep the startup + native-call assertions (`DailyApps.addListener appResumed`, `Agent.setGoogleAgentAccess`); observe removal through a real view close rather than a direct `addListener` call. | Low |
| 3 | 9-14 | C3 | Catch-all bridge. | Shared "quiet Android" preset with a `legacyInjectedPlugins` option. | none |

## Proposed end state
One startup test in `journeys/startup-permissions.spec.ts`: Android-shaped legacy plugin injection, no page errors,
expected native listener and access calls. The registration-order unit test is gone.
