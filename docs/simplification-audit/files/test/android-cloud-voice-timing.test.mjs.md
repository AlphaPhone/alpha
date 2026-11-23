# test/android-cloud-voice-timing.test.mjs
- Lines: 58 | Kind: unit (pure functions of `scripts/android-cloud-voice-timing.ts`; one test replaces `globalThis.WebSocket`) | Verdict: DELETE (and delete the script unless the owner still runs it by hand)
- Covers: a manual device-diagnostics exporter: summarises voice turn timings, strips arbitrary strings from exported records. Duplicates: none. Callers/importers: `npm test` glob. The script has no package.json, workflow or script caller; only this test imports it (grep across repo, excluding vendor).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-58 | T3, T5 | Unit tests of a manual developer tool that gates no release. | Delete. | None |
| 2 | 32 | A1 | "older APKs have no Cloud timing collector": compatibility with builds that predate the rename. | Delete with the tool. | None |
| 3 | 43-51 | B2 | Global `WebSocket` monkey-patch. | Moot. | - |

## Proposed end state
Test deleted. Owner question: is `scripts/android-cloud-voice-timing.ts` still run by hand? If not, delete it too (211
lines). If yes, keep it untested; its privacy filter (no transcript text in exports) is the only property worth a single
smoke case.
