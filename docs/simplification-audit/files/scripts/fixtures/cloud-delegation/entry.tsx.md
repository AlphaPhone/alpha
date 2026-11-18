# scripts/fixtures/cloud-delegation/entry.tsx
- Lines: 31 | Kind: component-page fixture (React entry mounting the real `CloudDelegationPanel` with the real `HostedDigestProtocol` over `fetch`) | Verdict: MOVE to `test/fixtures/component-pages/cloud-delegation/`
- Covers: mounts the product panel against a local test server, keyed by owner so an owner switch remounts it. Duplicates: `scripts/fixtures/hosted-live-source/entry.tsx` is the same pattern for another panel (both build a `HostedDigestProtocol` over `fetch` with an `x-fixture-owner` header). Callers/importers: `fixtures/cloud-delegation/index.html`; built by `scripts/test-cloud-delegation.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-18 | C5 | The fetch-based `HostedDigestProtocol` transport is written again in `hosted-live-source/entry.tsx:14` (with different error handling: this one throws a bare `'request failed'`, the other keeps status and body). | One `fixtureTransport(ownerHeader)` in a shared `component-pages/transport.ts`. | L |
| 2 | 3-5 | D13 | Deep relative imports (`../../../apps/app/src/...`). | Re-point after the move (or use the planned alias). | L |

## Proposed end state
Moves with the page; the transport is shared with the hosted-live-source page. This is real product UI running real protocol code with only the
native boundary faked, which is integration coverage worth keeping. If the test-mocks app harness can reach the delegation panel through the UI,
the page can later be replaced by a journey step; until then keep it.
