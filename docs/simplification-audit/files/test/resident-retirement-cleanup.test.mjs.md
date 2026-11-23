# test/resident-retirement-cleanup.test.mjs
- Lines: 31 | Kind: transplant (slice of `function retire(` from `connection-ui.tsx`) | Verdict: DELETE
- Covers: `retire` advances the epoch before disconnecting the resident transport; a late failure cannot paint over a new connection; a paired (`remote`) connection is not disconnected. Duplicates: `test/resident-prebind-stop.test.mjs` slices the same function. Callers/importers: `npm test` glob; `test/support/strip-types.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-18 | T2 | Marker slice to the next `/** ` comment, run with stubs. | Delete. | Low |
| 2 | 25 | A3/D5 | Asserts behaviour of the `remote` (paired) kind, deleted by C4. | Delete. | Low |

## Proposed end state
File deleted. "Old connection failure never shows over a new one" is observable; if wanted, one journey case in
`journeys/connection-cloud.spec.ts` (stub disconnect rejects after a new resident session started; no error banner).
