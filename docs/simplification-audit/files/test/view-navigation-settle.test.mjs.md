# test/view-navigation-settle.test.mjs
- Lines: 49 | Kind: unit (real `apps/app/src/runtime/view-navigation.ts` bundled by `test/fixtures/browser-source.mjs`; stub `post`, session and context callbacks; fake `document`/`window`) | Verdict: MERGE into `journeys/home-shell.spec.ts` (agent view navigation), most cases dropped
- Covers: `ViewNavigationClient.deliver` settles a claimed hand-off exactly once on every exit (screen change, failed fence, already handled, cancelled, lost positive reply, retired session). Duplicates: `test/browser/view-navigation.spec.ts:169-224` (owner change while claiming, shell switch failure settles the claim, owner change during ack), `test/browser/voice-owned-navigation.spec.ts:54-55` (held claim/ack + Stop), `test/voice-prepared-navigation.test.mjs` (transplant of the same class). Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2-6 | T3 | Real module, but driven with a hand-written post port and global `document`/`window` swaps: a unit test of one class. | Delete the file. | Low |
| 2 | 20-27, 33-37 | T4 | Screen change after claim and cancellation are the same outcome `view-navigation.spec.ts` asserts through the page (owner change, shell switch failure). | Drop. | Low |
| 3 | 24-27, 38-45 | gap | "Failed fence after the claim" and "positive result never followed by another, even when the reply is lost" are not asserted by a browser spec. | Carry both as journey cases using the existing `/api/views/interact-*` route fakes of `view-navigation.spec.ts`. | Medium |
| 4 | 46-49 | T4 | Retired session posts nothing: same as `view-navigation.spec.ts:169` owner change while claiming. | Drop. | Low |

## Proposed end state
File deleted. `view-navigation.spec.ts` folds into `journeys/home-shell.spec.ts` and gains two cases (fence failure after
claim settles one negative result; a lost positive result is never followed by a second result). `browser-source.mjs`
loses one importer (it has others; see chunk summary).
