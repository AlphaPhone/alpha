# test/client-observation-handshake.test.mjs
- Lines: 50 | Kind: unit (loads real `runtime/client-observation-support.ts` through `test/fixtures/browser-source.mjs`, stubs the support read) | Verdict: DELETE (T3); fold one case into `journeys/chat.spec.ts` if wanted
- Covers: cancelling the first client-turn-observation handshake does not stop later turns learning support; a turn waiting on another caller's handshake returns on its own cancel; a retired session refuses. Duplicates: none direct; the observation feature (Calendar day context sent with a turn) is exercised by Calendar chat specs that send turns from Calendar (`agent-calendar*` specs). Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 13-50 | T3 | Abort-race permutations of one class with a stub reader. No user-visible symptom except "Calendar day context missing after an account switch". | Delete, or one journey step: switch Cloud account during the first turn from Calendar, send again -> request carries `calendarDay` (assert via the dev agent's request log). | Low |
| 2 | 9 | C3 | Synthetic UUID literal repeated across files (research: `fixtures/ids.mjs`). | Gone with the file. | None |

## Proposed end state
Deleted. If the owner wants coverage, one Calendar chat journey step asserts the observation survives an
account switch.
