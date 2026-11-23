# test/telephony-executor.test.mjs
- Lines: 179 | Kind: integration-ish (esbuild bundle of real `runtime/telephony-executor.ts` with recording ports; alias to upstream `telephony-actions` contract) | Verdict: MERGE into `test/integration/device-actions.test.mjs`
- Covers: phone-side execution of agent-proposed calls, texts, replies, contact create/update/delete and selected-item reads: names are never called unseen, chosen numbers are normalised, emergency/busy/failure reported without retry, stale context stops before effects, SMS under proposal id, reply drafts never send, contact writes under the shown version, uncertain writes stay `unknown` without repeating. Duplicates: partly `aosp-telephony-views.spec.ts` (contact edit with version, voicemail delete confirm, draft in open conversation) at UI level. Callers/importers: `npm test`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 12-17 | C5 | Same temp-file esbuild loader as `telephony-agent-flow.test.mjs`. | Shared bundle helper. | none |
| 2 | 23-37 | — | Recording ports are the native boundary, which is the right seam for host integration. | Keep the port fake; use it as the executor of the merged `DeviceActions` flow. | none |
| 3 | 159-163 | T3 | `appliedContactChange` called directly; already proven through `contact_update`. | Drop. | none |
| 4 | 66-73 | — | Loop calls `911` with `answer` always truthy; the `throw Error('telecom')` branch (line 68) is dead. | Drop the dead branch when merging. | none |
| 5 | 165-179 | D8 | Two late tests in minified style. | Reformat when merging. | none |

## Proposed end state
Merged into `test/integration/device-actions.test.mjs` as the real executor behind `DeviceActions`. Cases carried:
contact call confirmed with its number; several matches chosen, dismissal/no number calls nothing; emergency/busy/failure
not retried; stale context stops first; SMS under proposal id, bridge throw → unknown; `sms_reply_selected` only drafts;
compose to the open conversation becomes a draft; contact update before/after under version, stale, delete cancelled;
lost call reply unresolved; uncertain contact writes unknown without repeat; selected reads only what is open.
