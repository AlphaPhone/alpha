# scripts/fixtures/hosted-live-source/entry.tsx
- Lines: 16 | Kind: component-page fixture (mounts the real `HostedLiveSourcePicker` with a fetch-backed `HostedDigestProtocol` and a review/confirm wrapper) | Verdict: MOVE to `test/fixtures/component-pages/hosted-live-source/` and reformat
- Covers: the live Google source picker, including the owner-switch guard (`current()`), review, confirm and error message. Duplicates: transport shape repeated from `scripts/fixtures/cloud-delegation/entry.tsx:10-18`. Callers/importers: `fixtures/hosted-live-source/index.html`; Vite-built by `scripts/test-hosted-live-source-picker.ts` (driven by `test/browser/adapters.spec.ts`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 14-15 | D8 | Two minified lines of 400+ characters each (transport, component, review UI). | Format; split `App` into a few statements. | L |
| 2 | 14 | C5 | Fetch transport duplicated from the cloud-delegation page. | Shared `component-pages/transport.ts`. | L |
| 3 | 15 | — | The fixture's own "Confirm source" button calls `client.mutate` directly, standing in for the host view that does so in production. The confirm path the test checks is therefore partly fixture code. | Note in the spec; if the production review sheet can be mounted instead, mount it. | M |
| 4 | 5-6 | — | Comment explains why one picker stays mounted across the owner switch; it is a useful "why". | Keep. | L |

## Proposed end state
Moves with its page, formatted, sharing the transport. Driven from a Playwright spec in `journeys/connection-cloud.spec.ts` (or
`journeys/calendar.spec.ts`, wherever live sources live in the journey map) using the test runner's browser.
