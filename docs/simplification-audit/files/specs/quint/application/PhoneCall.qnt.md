# specs/quint/application/PhoneCall.qnt
- Lines: 128 | Kind: Quint model (live in manifest; no harness, symbol pins into model.js) | Verdict: DELETE
- Covers: Development Phone fixture call session (`pnStart`/`pnEnd` in prototype/model.js): single live call, timers owned by the call, one recents row per call. Duplicates: test/browser/dev-incoming-call.spec.ts drives the same fixture end to end; test/home-views-model.test.mjs (named in abstractions) for queued updates. Callers/importers: manifest row (source prototype/model.js; symbols `function pnStart`, `function pnEnd`, `PN.live`, `callWho`, …); application README. No harness or wrapper (grep)

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-4 | D6 | Models a development fixture that never places a call; not product code. The image Phone is PhoneRecents. | Delete model and row; the e2e spec stays as the fixture's coverage. | L |
| 2 | manifest symbols | T10 | Pins `function pnStart` etc. in the 5.9k-line model.js: blocks the D1 split of model.js and the formatter (D9) for no checked behaviour (no harness). | Removing them unblocks stage F. | L |
| 3 | policy | D20 | D20 says keep dev code and its proof together; but this "proof" is not bound to the code by any harness, so it proves nothing about it. | Owner may override; then add an import harness after the model.js split. | L |

## Proposed end state
Deleted. Fixture behaviour covered by dev-incoming-call.spec.ts.
