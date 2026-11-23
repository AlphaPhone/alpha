# scripts/fixtures/device-action-journal.ts
- Lines: 31 | Kind: test support (in-memory `ActionJournal` that asserts phase order) | Verdict: MERGE into the device-actions integration test that survives (`test/device-actions.integration.test.ts`); DELETE if both importers are deleted
- Covers: an in-memory stand-in for the durable device-action journal, asserting reserve -> applying -> terminal. Duplicates: none in scripts. Callers/importers: `scripts/test-device-actions.ts` (child suite of `test/adapter-contracts.test.mjs`; drives the typed client over loopback HTTP) and `scripts/test-agent-camera-flow.ts` (child suite of `test/agent-camera-capture.test.mjs`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4-31 | T3 | A journal fake: the real persistence is Android-side (comment in `test-device-actions.ts:2`), so this only checks the renderer's call order against a contract the fake itself defines. | Keep only as long as `test-device-actions` stays (it does run the real client over HTTP, an integration test of the client half). | L |
| 2 | file | T9 | Two-importer helper in `scripts/fixtures`. | Inline into the merged device-actions test file. | L |

## Proposed end state
No separate file. The 25-line fake lives at the top of the merged device-actions integration test (research/tests-host.md proposes folding
`adapter-contracts` suites into area files). If the owner deletes `test-agent-camera-flow` in favour of the camera journey
(`test/browser/agent-camera-capture.spec.ts` covers the same name), it has one importer and inlining is the obvious move.
