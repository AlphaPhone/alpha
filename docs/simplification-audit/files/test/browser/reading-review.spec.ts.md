# test/browser/reading-review.spec.ts
- Lines: 131 | Kind: Playwright, chromium; tests 1-3 and 5-7 open the review by importing `reviewBrowserReading` in-page (T6), test 4 drives the Browser menu, test 8 is a unit test in a browser that monkey-patches `connectionController` and `BrowserVoice.prototype` | Verdict: **MERGE** tests 1-7 into `journeys/browser.spec.ts` (reading section, opened through the menu); **DELETE** test 8 or **REWRITE** it as a case in `test/integration/voice.test.ts`
- Covers: the "Read page excerpt" review requires explicit text and confirmation, speaks exactly the reviewed text through agent speech, Stop retires old callbacks, no speech without agent voice, Escape/Close/HOME/pagehide/Back cancel only this review's speech, compact dark layout fits; test 8: resident reading picks the resident binding, sends only the one-use token, and aborts on binding change. Duplicates: menu opening duplicates `reading-capability` test 1; layout overlaps `remaining-dialog-layout` (reading case); dialog layout at large text is also in the accessibility sweep. Callers/importers: imports `voice-fixture.agentBrowserVoice`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-12 | T6 | `open()` calls `reviewBrowserReading` directly instead of Browser → Menu → Read aloud. | Open through the menu on a route-fulfilled page (test 4 already shows how); reuse one page per describe. | Low |
| 2 | 85-131 | T6 / T3 | Test 8 replaces three `connectionController` methods and three `BrowserVoice.prototype` methods, polls with `setTimeout(20)`, and restores them in `finally`. Its own comment calls it "renderer source evidence, not native". | Delete from Playwright. If the resident-binding choice is worth keeping, write it against `createNativeReadingVoice` in `test/integration/voice.test.ts` with a fake controller passed in (needs the module to accept its controller as a parameter). | Medium: only coverage of binding-change abort |
| 3 | 52, 63 | – | Screenshots to fixed `test-results/…png` paths collide between workers/retries. | Use `testInfo.outputPath`, or drop. | none |
| 4 | 62-63 | – | Background colour and overflow checks duplicate the accessibility sweep. | Leave to `journeys/accessibility.spec.ts`. | none |
| 5 | 67-71 | – | "Closing a replaced session does not stop another speech consumer" is a real cross-feature regression. | Carry, using the menu-opened review and a second consumer started from Notes playback if available. | Low |

## Proposed end state
`journeys/browser.spec.ts` gets a reading section: open via menu → explicit confirm reads exact excerpt → Stop/retry → Close
cancels speech → HOME and Back cancel only this review → another speech consumer is untouched → without agent speech nothing is
spoken. Test 8 is gone from Playwright; optionally one integration case remains.
