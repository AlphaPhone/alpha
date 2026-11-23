# test/sms-agent-flow.test.mjs
- Lines: 21 | Kind: integration (esbuild-bundles the real `apps/app/src/runtime/device-actions.ts`, drives `DeviceActions` with a fake approvals HTTP API, fake journal and fake native SMS port; imports real `phone-context.ts` and `sms-subscription-revision.ts`) | Verdict: MERGE into `test/integration/phone-sms.test.mjs`
- Covers: Agent-proposed SMS: needs negotiated capability and the selected SIM, executes once under the claim identity, keeps the exact native receipt, never reconciles a partial failure as not sent, and chat context never carries the carrier name. Duplicates: none; `test/browser/dev-phone-messages.spec.ts` covers the Messages UI, not the device-action protocol. Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3 | T9 | Bundles with esbuild into a temp dir only to import a TS module; `tsImport` or Node type stripping would import it directly. | Import directly. | Low |
| 2 | 6 | D8 | 1,900-character fixture on one line. | Format when merged. | Low |
| 3 | 8-21 | - | Safety-critical exactly-once and receipt honesty; real module with fakes only at the network/native boundary. | Keep all six cases. | High if dropped |

## Proposed end state
Kept as an integration file for phone/SMS (with `sms-incomplete-rows`), importing the module directly and sharing one fake
approvals API and native SMS port.
