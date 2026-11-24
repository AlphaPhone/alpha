# apps/app/src/prototype/telephony-presenters.ts
- Lines: 117 | Role: Pure formatting of Phone/Messages/Contacts rows and the Home attention cards (time labels, initials, number keys/display, call rows, card builders). | Verdict: KEEP (minor tidy; MOVE candidate to `runtime/` — it is pure domain code)
- Importers: `contacts-adapter.ts`, `phone-adapter.ts`, `phone-info-page.ts`, `sms-adapter.ts`, `telephony-attention.ts`, `telephony-review.ts`. Text/path pins: `specs/quint/refinement/native/telephony.mjs:144-158` (imports the module by path, uses `messagesCard`, `phoneCard`, `presentTelephonyAttention`), `specs/quint/native/manifest.json:4537`, `test/telephony-presenters.test.mjs` (real import), `test/support/feature-parity.mjs:431`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 40-41, 47, 59-60 | A7 | `export type Names`, `export const nameOf`, `export type CallKind`, `export type AttentionRow`, `export type AttentionCard` — 0 importers outside this file (`nameOf` matches only an unrelated Quint identifier). | Drop `export` keywords. | None |
| 2 | 92-94 | D7 | `phoneCardTarget(missed)` — a one-line ternary exported for `test/telephony-presenters.test.mjs`. | Inline into `presentTelephonyAttention`; assert via `phoneTab`. | None |
| 3 | 96-98 | C1 | Local `Thread`, `Call`, `Voicemail` re-describe subsets of upstream `SmsThread`, `TelephonyCallLogEntry`, `VoicemailEntry` (`contracts/src/native-telephony.ts:1197,144,183`); `telephony-attention.ts` needs `as NonNullable<…>` casts because of the mismatch. | `type Thread = Pick<SmsThread,'id'|'date'|'snippet'|'unread'|'addresses'>` etc. (type-only import). | None (type-only) |
| 4 | 53-54, 77 | C3 | Caller-name resolution `names.get(numberKey(n)) || cachedName || displayNumber(n)` written twice (`callRow`, `phoneCard.who`), and `nameOf` is the same minus `cachedName`. | One `callerName(item, names)`. | None |
| 5 | — | C3 (add) | Contact-name map building lives in three callers (`sms-adapter.ts:129`, `phone-adapter.ts:103`, `telephony-attention.ts:33`). | Add `contactNames(cards)` here. | Low |
| 6 | 6 | — | Imports `./locale-time.ts` with an explicit extension while siblings import without — needed so the Quint harness can import it in Node. | Keep; note it. | — |
| 7 | — | D11 | Pure domain module under `prototype/`. | Optional MOVE to `runtime/telephony-presenters.ts` (update 6 importers, Quint path, manifest, parity list). | Low |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `shortWhen`, `clockLength`, `initials`, `numberKey`, `displayNumber`, `threadTitle`, `callKind`, `callRow`, `messagesCard`, `phoneCard`, `presentTelephonyAttention` | helper | 10-117 | `numberKey` vs upstream `normalizePhoneNumber` (different purpose: equivalence key vs E.164) | stays |
| `Names` | type | 40 | — | stays (unexported) |
| `Thread`/`Call`/`Voicemail` | type | 96-98 | upstream `SmsThread`/`TelephonyCallLogEntry`/`VoicemailEntry` | derive via `Pick` |
| `TelephonyAttention`, `emptyTelephonyAttention` | type/helper | 100-101 | — | stays |

## Proposed end state
~115 lines, same functions; internal types unexported and derived from upstream contracts, one `callerName` helper, `contactNames` added for the three callers, `phoneCardTarget` inlined.

## Verification
`test/telephony-presenters.test.mjs`, Quint native `TelephonyAttention` refinement (`specs/quint/refinement/native/telephony.mjs`), `npm run verify`.
