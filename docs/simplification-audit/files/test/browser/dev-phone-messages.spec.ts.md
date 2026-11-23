# test/browser/dev-phone-messages.spec.ts
- Lines: 14 (5.6 KB) | Kind: Playwright, chromium; UI journey on the development Phone/Messages simulator (AOSP-only renderer paths) | Verdict: MERGE into `journeys/telephony.spec.ts`
- Covers: in-call controls (Mute, Speaker, keypad, End call), call recents and message send survive reload, and failed saves keep the draft/call. Duplicates: `dev-incoming-call.spec.ts`, `dev-messages-lifecycle.spec.ts`, `aosp-phone.spec.ts`. Callers: chromium only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4, 10 | — | Real UI: role queries and clicks only; asserts no external requests. | Carry (call controls + message persists after reload). | None. |
| 2 | 4, 7, 10, 13 | P7 | Persistence asserted by parsing simulator keys `alpha.dev.app.phone` / `alpha.dev.app.messages`. On Android these are native telecom/SMS stores. | Assert via the rendered recents/thread after reload only. | Low. |
| 3 | 7, 13 | P3 | `Storage.prototype.setItem` patched to throw for one key (simulator storage failure). | Drop failure cases (they test simulator persistence) unless the owner keeps the telephony simulator as a product stand-in. | Low. |
| 4 | 4, 10 | C3 | External-request recorder `page.on('request',…)` copied in ~8 specs of this chunk. | Harness `noExternalRequests` fixture. | None. |

## Proposed end state
`journeys/telephony.spec.ts` gets two cases from here: call controls round trip with recents visible after reload, and a sent message visible after reload; both with the harness no-external-traffic guard. Failure-injection cases dropped.
