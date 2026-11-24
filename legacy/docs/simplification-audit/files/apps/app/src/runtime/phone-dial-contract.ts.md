# apps/app/src/runtime/phone-dial-contract.ts
- Lines: 5 | Role: re-exports upstream `@elizaos/contracts/phone-dial` and adds `dialDeviceStatus`. | Verdict: MERGE (with sms-agent-contract and telephony-actions-contract into one `runtime/telephony-contracts.ts` holding only Alpha helpers)
- Importers: `prototype/agent-adapter.ts:21`, `runtime/phone-context.ts:7`, `scripts/test-connection-history.ts:29`.
- Text/path pins: `feature-parity.mjs`. (`scripts/prepare-client-features.ts:269` projects the upstream twin.)

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2 | D4 | 11 re-exports; unused outside: `validatePhoneDial`, `validatePhoneDialResult`, `phoneDialCapabilityAvailable`, `phoneDialReceiptOutcome`, `CONTACT_LOOKUP_CAPABILITY`, `PhoneDialOperation` (0 src, 0 tests). | Importers use `@elizaos/contracts/phone-dial` directly. | Low |
| 2 | 5 | C3 | `dialDeviceStatus` maps receipt outcome → journal status; `sms-agent-contract.ts:5` `smsDeviceStatus` and `telephony-executor.ts:52-55` `finish` do the same mapping. | One `deviceStatus(outcome,{unknown:'failed'|'unknown'})` helper. | Low |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `dialDeviceStatus` | helper | 5 | `sms-agent-contract.ts:5`, `telephony-executor.ts:52` | `runtime/telephony-contracts.ts` |

## Proposed end state
Deleted; `dialDeviceStatus` (or the generic mapper) lives in `telephony-contracts.ts`.

## Verification
`test/telephony-agent-flow.test.mjs`, `scripts/test-connection-history.ts`, `npm run verify`.
