# apps/app/src/runtime/image-sms.ts
- Lines: 19 | Role: near-shim over upstream `@elizaos/contracts/native-telephony-session`: renames `smsReceiptLabel`→`receiptLabel`, binds the product name into `mmsProblemLabel`, and converts positional callbacks to the upstream options object in `createSmsSession`. | Verdict: SIMPLIFY
- Importers: 2 (`prototype/agent-adapter.ts`, `prototype/sms-adapter.ts`). Text/path pins: `specs/quint/native/manifest.json:4413`, `specs/quint/services/manifest.json:3116,3149,3153,4829,4878,4882`, `test/comms-settings.test.mjs:9`, `test/fixtures/observed-sms-adapter.mjs:11`, `test/image-sms.test.mjs:3`, `test/support/feature-parity.mjs:531`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 13-14 | D4 | `export {mmsReceiptLabel}; export const receiptLabel = smsReceiptLabel;` — pass-through and alias rename. | Callers import `smsReceiptLabel`/`mmsReceiptLabel` from upstream directly (via the `@eliza/*` alias, D13). | Low; rename `receiptLabel` at the 2 call sites. |
| 2 | 17-19 | D4 | `createSmsSession(client,image,onChange,onSendUpdated=()=>{},onMmsSendUpdated=()=>{})` only reshapes arguments into `{onSendUpdated,onMmsSendUpdated}`. | Callers call upstream `createSmsSession(client,image,onChange,{…})` directly. | Low; 2 callers. |
| 3 | 15 | — | `mmsProblemLabel(problem) => sharedMmsProblemLabel(problem,'Alpha')` is the one product-specific line. | Keep as the file's only export, or fold into `prototype/sms-adapter.ts` next to its use. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `receiptLabel` | const alias | 14 | upstream `smsReceiptLabel` | delete |
| `mmsProblemLabel` | helper | 15 | — | `prototype/sms-adapter.ts` or keep |

## Proposed end state
Either a 4-line file exporting only `mmsProblemLabel`, or deleted with `mmsProblemLabel` moved into `prototype/sms-adapter.ts`; callers import the upstream session and receipt labels directly. The Quint manifests' `sources` entries for this path move to the upstream path or to sms-adapter.ts.

## Verification
Quint `MessageThreads`/telephony models (`specs/quint/native/manifest.json`, `services/manifest.json` entries above); `test/fixtures/observed-sms-adapter.mjs`; Messages Playwright journeys; delete `test/image-sms.test.mjs` (tests upstream, T5).
