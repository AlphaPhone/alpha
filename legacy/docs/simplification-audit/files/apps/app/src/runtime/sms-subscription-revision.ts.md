# apps/app/src/runtime/sms-subscription-revision.ts
- Lines: 9 | Role: opaque FNV-1a revision `slot<N>-<8 hex>` for a selected SIM (no carrier name leaks). | Verdict: KEEP
- Importers: `prototype/agent-adapter.ts:18`, `prototype/sms-adapter.ts:5`.
- Text/path pins: `specs/quint/native/manifest.json`, `test/sms-agent-flow.test.mjs`, `feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8 | C6 | output grammar is re-stated as a regex in `phone-context.ts:66` (`/^slot\d{1,3}-[0-9a-f]{8}$/`). | Export `SMS_SUBSCRIPTION_REVISION=/^slot\d{1,3}-[0-9a-f]{8}$/` here and use it in phone-context. | None |

## Local types and helpers
None.

## Proposed end state
~10 lines (+ exported pattern); could join `telephony-contracts.ts`.

## Verification
`test/sms-agent-flow.test.mjs`, context-selection tests.
