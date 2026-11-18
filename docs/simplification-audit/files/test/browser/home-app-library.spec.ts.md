# test/browser/home-app-library.spec.ts
- Lines: 477 | Kind: Playwright journey (chromium, dev server) with an inline Capacitor native-plugin stub | Verdict: MERGE into `journeys/home-shell.spec.ts` (launcher section; this file is its basis)
- Covers: the installed-app drawer and Home edit mode driven through real clicks, long-presses, keyboard and drag against a stubbed `ElizaSystem` launcher inventory (same-label disambiguation, work-profile refusal, Add to Home/App info, cold-start order, live install/remove, stale-tile refusal, failed list, HOME/Back). Duplicates: `home-native-launcher.spec.ts` (second copy of the same Capacitor stub; drawer listing/launch/failed launch), `home-launcher.spec.ts` (drawer close on Back/HOME/Close, failed read + retry), `home-landscape.spec.ts` (drawer reachability). Callers/importers: chromium project only; imports nothing but `@playwright/test`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11-72 | C5 / T7 | `nativeStub` is a 60-line hand-written Capacitor bridge (`PluginHeaders`, `nativeCallback`, `nativePromise`) that `home-native-launcher.spec.ts:9-67` re-implements with a different option shape. | Move one parameterised stub (inventory, refusals, notifications, microphone, assistant, update) into `test/browser/harness/native-bridge.ts` exposed as a `test.extend` fixture; both launcher halves use it. | Low |
| 2 | 226 | T8 | Home long-press timed by `mouse.down(); waitForTimeout(700); mouse.up()`. | Use `page.clock.install()` + `clock.runFor(600)` as lines 276-297 already do, or a pointer helper `hold(locator)` in the harness. | Low |
| 3 | 274-298, 424-477 | T7 | Four tiny tests on pointer-ownership/epoch fences for long-press holds (Home hold, drawer hold across another pointer, reopened menu after reinstall, retired hold after reinstall). Each sets up the same stub and drawer. | Keep the behaviour, fold into one test "a long-press belongs to its pointer and does not survive inventory changes" with four steps. | Low |
| 4 | 185, 387 | T6 (mild) | Back and HOME are simulated by dispatching `alpha-back` / `launcher-home` window events. These are the real native→renderer signals, so acceptable; move to harness helpers `pressBack(page)`, `pressHome(page)` so every journey uses one spelling. | Harness helper. | Low |
| 5 | 188-189 | — | Asserts the exact persisted `alpha.launcher.favorites.v1` record. This is a persisted format (G5) and worth one assertion; keep it only here. | Keep. | — |
| 6 | 136, 177, 257 | — | Unconditional `page.screenshot` to `outputPath` (evidence artefacts nobody reads, B5). | Drop; Playwright already keeps screenshots on failure. | Low |
| 7 | 1-6 | A8 | Header names the Android instrumentation tests that cover the native side; fine, but keep it to one line in the journey file. | Trim. | — |

## Proposed end state
`journeys/home-shell.spec.ts` gets a `launcher` describe built from this file: first-run Home vs drawer contents, same-label tiles and profile refusal, long-press menu (Add to Home, App info, keyboard navigation, edge-clipping), Home edit mode (remove/reorder/drag/"+"/Done/cold start), live inventory changes and burst coalescing, stale-tile refusal, failed list + retry + HOME, and one merged "stale hold" test.
The stub moves to the shared harness (`harness/native-bridge.ts`) and is shared with the `home-native-launcher` cases. No `waitForTimeout`. Estimated ~330 lines after merging the stub and the four hold tests.
