# specs/quint/refinement/services/maps-screen-source.mjs
- Lines: 172 | Kind: Quint refinement harness (bundles real `screen.ts`, `device-navigation.ts`, upstream `maps-screen.ts`, `state.ts`, `saved-places.ts`) + **text-mutation canaries** | Verdict: KEEP the two campaigns; DELETE the mutant canaries and the double-compile ceremony
- Covers: `MapsScreenModes.qnt` (search, select, directions, origin search, typed-origin plan, Start/End, layered Back; 3 schedules) and `MapsNavigationGuidanceReadback.qnt` (guidance before first fix, native-session loss, reroute success/failure, End clears readback; late agent route after retirement; 6 schedules). Duplicates: `maps.mjs` "retired account rejects a late route result" exercises the same `DeviceMapsNavigation` retirement fence (`MAPS_PROVIDER_CHANGED`) as the "retired guidance request" schedules here (162-163); the Playwright Maps journey (`test/browser` maps specs) drives the same screen layers in a browser. Callers/importers: `test/quint-maps-screen-source.test.mjs` (4 tests: 2 campaigns, 2 canaries), `services/index.mjs:4,73`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 26-37 | T10 / T5 | `mutant` option rewrites upstream `maps-screen.ts` text at needles `'this.navigating = false;'` and `'if (this.selected) {\n      this.selected = undefined;'` to prove the replay can fail. It pins exact upstream formatting and tests the test. | Delete the canary branch and the two canary tests in the wrapper. | low |
| 2 | 38-46 | B5 | Hashes inputs, compiles, re-hashes, compiles a second time and compares bytes and graph "so discovery never authorizes bytes already read". Doubles bundle cost; no consumer beyond the receipt flag. | One compile, import, done. | none |
| 3 | 47-49 | C5 | Writes the bundle to a temp file and imports it; siblings import from a `data:` URL. | Shared `sourceModule`. | none |
| 4 | 14, 23-24 | T10 (path pins) | Hard-codes `.eliza/client-features/plugins/plugin-maps/src/client/` paths; fine (imports), but tied to the generated upstream layout (D13 `@eliza/*` alias later). | Use the alias when it lands. | low |
| 5 | 154-163 vs `maps.mjs:54-63` | T4 | Both harnesses check that a retired owner's late route reply cannot start guidance. | Keep it here (it also checks the native session never starts); drop the duplicate block from `maps.mjs` or keep it there and drop here — one place. | low |
| 6 | throughout | D8 | Dense one-line statements (`f.screen.focusQuery();point(...)`), single-space indentation. | Prettier (D9). | none |
| 7 | 122-126, 165-169 | B5 | Long assumptions prose in receipts. | Header comment. | none |

## Proposed end state
~120 lines after Prettier: one shared loader, no mutant/double-compile path, the two campaigns unchanged. Wrapper keeps 2 tests. Both models stay live (Maps screen and device navigation are product code).
