# test/resident-agent-fixture-provider-status.test.mjs
- Lines: 56 | Kind: transplant (slices `test/browser/helpers/resident-agent-plugin.ts` from `function defineResidentAgentPlugin()` and evals it) | Verdict: DELETE
- Covers: behaviour of a Playwright test helper (fake resident plugin's `providerStatus`, `setGoogleAgentAccess`). Duplicates: the Playwright specs that use the helper exercise it. Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-14 | T2 | Text slice from a marker, esbuild transform, `new Function` with a fake `window`. | Delete. | Low |
| 2 | 16-56 | T5 | Tests the test machinery (fixture model), not product behaviour. | Delete. | Low |

## Proposed end state
File deleted. The helper is validated by the journeys that use it; when the browser harness moves to one typed
`test.extend` fixture (T7), the fake plugin is typed instead of self-tested.
