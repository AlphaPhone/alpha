# test/telephony-agent-flow.test.mjs
- Lines: 135 | Kind: integration-ish (esbuild bundle of real `runtime/device-actions.ts` `DeviceActions` + real `runtime/phone-context.ts`, recording request/journal/executor) | Verdict: MERGE into `test/integration/device-actions.test.mjs`
- Covers: AP-08 owner-approved telephony actions: capability negotiation per action, approve → journal → claim → execute → receipt, exactly-once effects, contradiction refusal, unknown SMS never resent, receipt retry replays the journal, selected-item proposals cannot move to another item or session. Duplicates: other device-action tests that other chunks merge into the same target; `telephony-executor.test.mjs` covers the executor side. Callers/importers: `npm test`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 12-16 | C5 | Writes the bundle to a temp file and imports it; the same esbuild-to-temp loader is repeated in `telephony-executor.test.mjs` and `telephony-attention-lifecycle.test.mjs`. | One shared `bundle(entry, options)` helper in the integration support. | none |
| 2 | 43-44 | T3 | The executor is a stub that only records; the real `executeTelephonyAction` is never connected to the client. | In the merged file wire `DeviceActions` to the real executor with recording native ports, so one test covers approve → real executor → receipt. | low |
| 3 | 50-56 | T3 | Capability selection is a pure `phone-context` call. | Keep one assertion (standalone advertises none) in the merged file. | none |
| 4 | 64-66 | — | Sensitive-screen refusal is generic device-action behaviour. | Keep only if the merged file lacks it. | none |

## Proposed end state
File removed; cases carried into `test/integration/device-actions.test.mjs`: per-action capability negotiation; approved
call runs once; contradicting result refused; stale contact write → failed receipt, no retry; SMS under proposal id and
unknown outcome never resent; receipt outage replays the journal; selected-item recovery cannot move to another
item/session/coordinator. Executor = real `telephony-executor.ts` with recording ports.
