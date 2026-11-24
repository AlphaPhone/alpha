# test/system-shade-timeout.test.mjs
- Lines: 66 | Kind: transplant (slices `prototype/system-shade.ts` between `export const SHADE_REQUEST_TIMEOUT` / `/** Reads what a pull started on.` and from `  p.expandAndroidShade = async function () {` to the last `}`) | Verdict: REWRITE as one case in `journeys/home-shell.spec.ts`
- Covers: a native `openNotificationShade` request that never answers resolves as `unsupported` after `SHADE_REQUEST_TIMEOUT`, shows the fallback toast once, and the next pull asks Android again; a synchronous throw releases the next pull. Duplicates: `system-shade.test.mjs` (policy), upstream shade tests. Callers/importers: `npm test`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-14 | T2, T10 | Rebuilds a fake module from three text slices and an invented `install` wrapper; any edit to `system-shade.ts` order breaks it. | Delete. | none |
| 2 | 27-38, 40-58 | T8 | Uses `t.mock.timers` against a sliced copy; the real timeout path is never run in the app. | Journey with `page.clock` and a bridge fake whose `openNotificationShade` never resolves. | low |
| 3 | 20-25 | T3 | Pass-through cases (answer passes, failure stays failure) are trivial. | Drop. | none |

## Proposed end state
File deleted. `journeys/home-shell.spec.ts` (test-mocks build, launcher profile) gains: "a hung shade request shows the
fallback once; the next pull asks Android again" using the native-bridge fake with a held promise and `page.clock`.
