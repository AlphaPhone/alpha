# apps/app/src/prototype/telephony-attention.ts
- Lines: 82 | Role: Home's Messages/Phone attention cards on the Alpha image — bounded foreground reads of threads, calls, voicemail and contact names while Home shows, decorated into `renderVals`. | Verdict: SIMPLIFY
- Importers: `apps/app/src/main.tsx:24,185` (`installTelephonyAttention`). Mentioned in comments by `home-overview-cards.ts:79` and `template.html`. Text/path pins: `test/telephony-attention-lifecycle.test.mjs` (esbuild-bundles the file with stubbed `aosp-image`, `native-adapter`, `mvp-features`, `platform-plugins` by exact import specifier — T3), `specs/quint/native/manifest.json:4536`, `test/support/feature-parity.mjs:430`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 15 | A7 / D4 | `export {emptyTelephonyAttention, presentTelephonyAttention, type TelephonyAttention};` — 0 importers through this module (the Quint refinement imports `telephony-presenters.ts` directly). | Delete the re-export line. | None |
| 2 | 21 | A7 | `export async function readTelephonyAttention` — 0 external importers. | Drop `export`. | None |
| 3 | 28, 17 | B2 / C1 | `await (client as Bag).listVoicemail?.(20)` — `listVoicemail` is a required method of upstream `TelephonyClient` (`phone-adapter.ts:117` calls it directly); the cast discards its types and forces `as NonNullable<…>` casts. `Bag` exists only for this cast. | `client.listVoicemail(20)` with the typed result; delete `type Bag`. | Low |
| 4 | 33-36 | C3 | Contact-name map loop duplicated in `sms-adapter.ts:129` and `phone-adapter.ts:103`. | `contactNames(cards)` in `telephony-presenters.ts`. | Low |
| 5 | 24 | B1 | `attempt` turns every source failure into `null` — this is the specified behaviour ("A refused or failed source stays null") and is documented. | Keep. | — |
| 6 | 50 | B1 | `catch { … read = emptyTelephonyAttention(); changed(); }` on the whole refresh — specified (cards drop on failure). | Keep; comment says why. | — |
| 7 | 42-43, 69-81 | D3 / P6 | `owner` capture plus shell fields `telephonyAttentionReturn`/`telephonyAttentionHide`; `mount?.call`/`update?.apply`/`unmount?.call` exist because the test's bare `Shell` lacks lifecycle methods (D7). | Call bases directly and give the test shell the methods; keep per-shell handlers in a closure. | Low |
| 8 | 40 | D5 | Default parameter builds the client from `aospImage` at call time, while `main.tsx:185` already gates on `isAndroid&&!fixture`. Two gates for one fact. | Let `main.tsx` pass the client (or null) explicitly; drop the default. | Low |
| 9 | 64-65 | — | `isMvpView('messages')` / `isMvpView('phone')` evaluated per render; constant per build. | Hoist to install time. | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `Bag` | type | 17 | ~50 files | delete (only used for the cast) |
| `REFRESH_MS` | const | 18 | `phone-adapter.ts` refresh intervals | stays |
| contact-name loop | helper | 33-36 | `sms-adapter.ts:129`, `phone-adapter.ts:103` | `telephony-presenters.ts` |

## Proposed end state
~72 lines: typed `readTelephonyAttention` (no cast, uses shared `contactNames`), `installTelephonyAttention(Component, client)` with direct base calls. No re-exports.

## Verification
`test/telephony-attention-lifecycle.test.mjs` (stub plugin matches import specifiers — keep them stable), `test/telephony-presenters.test.mjs`, Quint native `TelephonyAttention` refinement; Home cards on the AOSP image are device acceptance.
