# apps/app/src/runtime/telephony-executor.ts
- Lines: 165 | Role: runs one owner-approved telephony action (call, SMS compose/reply, contact create/update/delete, open-thread/voicemail read/delete) through injected ports and reports the observed result. | Verdict: KEEP (minor)
- Importers: `prototype/agent-adapter.ts:23`, `prototype/telephony-review.ts:7`.
- Text/path pins: Quint `specs/quint/refinement/native/telephony.mjs:195-332` (captures this file for PhoneCalls/ContactsBook), `specs/quint/native/manifest.json`, `test/telephony-executor.test.mjs`, `feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 52-55 | C3 | `finish` maps receipt outcome → `succeeded/failed/unknown`, same as `phone-dial-contract.ts:5`, `sms-agent-contract.ts:5`. | Shared `deviceStatus(outcome)` in `telephony-contracts.ts`. | Low |
| 2 | 15 | C7 | imports the contract from `plugin-assistant/.../telephony-actions-contract.ts` while `telephony-actions-contract.ts` re-exports `packages/contracts/.../telephony-actions.ts`. | One upstream path (`@elizaos/contracts/telephony-actions`). | Low |
| 3 | 111 | B1 | `catch { /* skipped */ }` — specified (unreadable contact not offered, L110 comment). | Keep. | None |
| 4 | 68, 83, 96, 142-145 | B1 | catch → `unavailable`/`unknown`/`failed` — the contract's observed outcomes; keep. | Keep. | None |
| 5 | 18, 49 | A7 | `ContactMatch`, `TelephonyExecution` exported, 0 external users. | Unexport. | None |
| 6 | 45 | C1 | `openThread()` return shape duplicates the `OpenThread` type in `prototype/sms-adapter.ts:12` and `connection-ui.tsx` (`draftSmsReply`). | Export one `OpenThread` type from here. | Low |
| 7 | 4 | D8 | 200-char comment line. | Wrap. | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `ContactRecord`, `ContactDraft` | type | 19-20 | upstream `native-address-book.ts` (check) | upstream if identical |
| `TelephonyPorts.openThread` return | type | 45 | `prototype/sms-adapter.ts:12` `OpenThread` | export `OpenThread` here |
| `finish` | helper | 52 | `dialDeviceStatus`, `smsDeviceStatus` | `telephony-contracts.ts` |

## Proposed end state
~160 lines; shared status mapper, one contract import path, exported `OpenThread`.

## Verification
`test/telephony-executor.test.mjs`, Quint `telephony.mjs` (captures file; re-run), telephony review browser flows.
