# apps/app/src/prototype/development-rail.html
- Lines: 60 | Role: Test-mocks-only side rail of the browser prototype (Phone-only toggle, theme swatches, jump-to buttons, chat modes, Talk, "Incoming text", gesture legend), spliced into `template.html` at `<!-- alpha-development-rail -->` (`template.html:4591`) by `template-source.ts:3,9` only when `testMocksEnabled`. | Verdict: MOVE to `apps/app/src/dev/` (+ small delete)
- Importers: `template-source.ts:3` (`?raw`). Text/path pins: `test/theme-palette.test.mjs:10` (path list), `test/voice-in-chat-only.test.mjs:30` (reads text); `template.html:4591` marker comment.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 46 | A5 | "Incoming text" button `onClick="{{fireHeads}}"` → `model.js:5915 fireHeads` → `showHeads()` which is an empty stub (`model.js:5720-5723`, "MVP-DEFERRED: SMS heads-up simulation"). The button only unlocks the screen | Delete the button with the heads-up code (`fireHeads`, `showHeads`, `heads*`, `HEADS`/`LOCK_SUM` fixtures, research §3) | None |
| 2 | 1-60 | A5 / D5 | The values this rail binds (`fs`, `notFs`, `toggleFs`, `themes`, `jumps`, `subJumps`, `hasSubJumps`, `modes`, `legend`) are computed in production `renderVals` (`model.js:5817-5835,5928-5935`) although only this file binds them | Compute them in a dev-only installer next to this file (only when `testMocksEnabled`), not in `model.js` | Low |
| 3 | 1-60 | D6 | Dev markup lives in the product renderer folder | Move with `development-system-surfaces.html`, `fixtures.js`, `fixtures.empty.js`, `fixtures/img` into `apps/app/src/dev/`; update `template-source.ts` import paths and the two tests | Low |
| 4 | 2-54 | D12 | Every element carries inline `style="…"`; the rail is dev-only so this costs only runtime parsing in dev | Leave; not worth converting dev-only markup | None |

## Proposed end state
58 lines (the "Incoming text" button removed) at `apps/app/src/dev/development-rail.html`, with its values produced by a dev-only installer instead of production `renderVals`.

## Verification
`test/voice-in-chat-only.test.mjs`, `test/theme-palette.test.mjs`, `scripts/audit-production-bundle.ts` (rail must stay absent from flag-off bundles), dev-mode browser specs that use the rail (`?mode=dev`).
