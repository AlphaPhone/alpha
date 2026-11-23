# apps/app/src/runtime/sms-agent-contract.ts
- Lines: 5 | Role: re-exports upstream `@elizaos/contracts/sms-send`; adds `smsAgentHash` and `smsDeviceStatus`. | Verdict: MERGE into `runtime/telephony-contracts.ts`
- Importers: `prototype/agent-adapter.ts:20`, `runtime/phone-context.ts:6`.
- Text/path pins: `specs/quint/native/manifest.json`, `feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2 | D4 | 8 re-exports; unused outside: `validateSmsSend`, `smsReceiptOutcome`, `SmsSendOperation` (0/0). | Import upstream directly. | Low |
| 2 | 4 | C3 | SHA-256→hex copy over `smsBindingText(operation)`. | `sha256Hex(smsBindingText(op))`. | None |
| 3 | 5 | C3 | outcome→status mapper, twin of `phone-dial-contract.ts:5` and `telephony-executor.ts:52`. | Shared mapper. | Low |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `smsAgentHash` | helper | 4 | sha256 copies | `telephony-contracts.ts` on `lib/hash.ts` |
| `smsDeviceStatus` | helper | 5 | `dialDeviceStatus`, executor `finish` | `telephony-contracts.ts` |

## Proposed end state
Deleted; two helpers in `telephony-contracts.ts`.

## Verification
`test/sms-agent-flow.test.mjs`, `test/aosp-sms.test.mjs`, Quint native manifest.
