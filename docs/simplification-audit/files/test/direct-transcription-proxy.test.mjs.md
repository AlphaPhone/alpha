# test/direct-transcription-proxy.test.mjs
- Lines: 41 | Kind: transplant (reads `scripts/local-agent-dev-bridge.ts` as text, deletes imports, strips types and runs it in `vm` with a ~25-key box including stubs for `isPreparedViewNavigationRequest` and friends) | Verdict: REWRITE as cases in `test/dev-local-agent-bridge.test.mjs` using the real import
- Covers: the dev bridge's direct transcription proxy keeps owner and provider attestation, strips upstream extras (`apiKey`), refuses wrong owner / rotated root / wrong route, and aborts the resident request on cancel without retry. Duplicates: `development-cloud-voice.test.mjs` drives the same handler for ASR (Cloud route) through the real import, with the same refusal modes. Callers/importers: `npm test`. Research row 718 is right (C+A).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 25-27 | T2 | Transplanting a module that five sibling tests import directly (`await import('../scripts/local-agent-dev-bridge.ts')` under tsx). Pure cost: every import added to the bridge must be added to the box. | Use the real import. | None. |
| 2 | 33-41 | T4 | Owner/rotate/route refusal and cancel-abort are the same assertions as `development-cloud-voice` ASR cases, on the `direct` route. | Add `direct` as a row in the merged ASR refusal table; one cancel case total. | Low. |
| 3 | 13-24 | C4 | Fourth copy of the pairing fake. | Shared fixture. | None. |

## Proposed end state
Deleted; the direct-route rows join the ASR table in `test/dev-local-agent-bridge.test.mjs`.
