# test/home-google-connection-source.test.mjs
- Lines: 19 | Kind: transplant (slices `inbox-cloud-adapter.ts` from `'    const googleConnected='` to `'    // The shared Home mail card'` and runs it with `new Function`) | Verdict: DELETE
- Covers: Home treats Google as connected only after an account read for the current session (Calendar-only Google counts). Duplicates: `test/browser/home-attention.spec.ts`, `home-inbox.spec.ts` (Home mail card states for connected/disconnected). Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-9 | T2 | Marker slice, including a comment as the end marker. | Delete. | Low |
| 2 | 14-18 | — | "Unknown until current-session read" is the useful rule. | One case in `journeys/home-shell.spec.ts`: after an account switch, the Home mail card shows no Set-up/connected state until the new session's accounts read completes. | Low |

## Proposed end state
File deleted; one Home journey case as above.
