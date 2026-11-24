# test/voice-request-provenance.test.mjs
- Lines: 110 | Kind: test 1 unit-in-bundle (esbuild bundles dev-only `runtime/development-cartesia-conversation.ts` with five modules replaced by inline stub source, plus the pinned `vendor/eliza/.../voice-session-state.ts` reducer); test 2 transplant (slices `performVoiceRequestedActions` out of `connection-ui.tsx` by text markers and evals it with `new Function`) | Verdict: DELETE
- Covers: voice-requested actions run only for the accepted final transcript of the current turn; raw callbacks, partial transcripts, wrong traces, interruption and binding retirement cannot trigger an action; the controller passes the same proof through review and execution. Duplicates: `test/voice-requested-actions.test.mjs` (slices the same method, T4), `test/browser/voice-owned-navigation.spec.ts` / `voice-preparation-ownership.spec.ts` (ownership in the browser). Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 37-50 | T3 | Five stub modules as source strings (`connection-ui`, flags, device preferences, `upstream renderer package` session client). The module under test is the development Cartesia path (`developmentCartesiaVoiceEnabled`), not a production path (D6). | Delete. | Low |
| 2 | 53-56 | T5 | Bundles and runs `vendor/eliza` reducer directly. | Delete. | None |
| 3 | 14-36, 82 | B4/T8 | Overwrites `globalThis.window/location/WebSocket` in the shared node:test process and restores by hand. | Delete. | None |
| 4 | 87-110 | T2 | `text.indexOf('  async performVoiceRequestedActions(')` … `indexOf('  async continueRequestedCamera(')`: marker slice of `connection-ui.tsx` (D1 blocker for the split). Marker still present (line 2228). | Delete. | Low |
| 5 | 79 | B5 | Exact request-count assertion (`requests.length,2`). | Delete. | None |

## Proposed end state
File deleted. This is security-relevant (agent-requested actions from speech), so one journey case is required in `journeys/voice.spec.ts` with the dev voice fixture: a partial transcript or an interrupted turn whose reply proposes "Open <url>" performs nothing; the accepted final turn performs exactly one action. Merge with the ask-first case from `voice-requested-actions.test.mjs`.
