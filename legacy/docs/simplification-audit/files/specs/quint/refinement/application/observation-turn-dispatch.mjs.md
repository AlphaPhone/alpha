# specs/quint/refinement/application/observation-turn-dispatch.mjs
- Lines: 252 | Kind: Quint refinement harness; partial transplant of `connection-ui.tsx` (T2/T10) plus three bundled real modules | Verdict: PORT
- Covers: the optional `calendarDay` client observation is serialized into a chat turn only after an exact peer `/api/status` match (same `serverInstanceId`, supported version, listed field), across JSON and streaming dispatch, cancellation and connection replacement. Live sources: `connection-ui.tsx` (`connectionController.send`), `client-observation-support.ts`, `phone-context.ts`, `local-agent.ts`. Model `ObservationTurnDispatch.qnt`.
- Duplicates: `test/client-observation-handshake.test.mjs` and `test/calendar-day-context.test.mjs` cover parts of the handshake/sanitizer (T4, unit level). Callers: `test/quint-observation-turn-dispatch.test.mjs`, `index.mjs:51`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 32-42 | T10/T2 | Cuts `connection-ui.tsx` from `  async send(text:` to `\n  },\n};`, regex-extracts `function conversationKey(` and `STOPPED_*_NOTICE` lines, transpiles and runs in `vm` with ~30 hand-supplied free variables (117-135). Any change to `send`'s closure (a new helper it calls) breaks the harness, and the sandbox list mirrors private module state. | When `connection-ui.tsx` is split (Stage F, D1 god module), extract turn dispatch into an exported `sendTurn(deps, text, context, requestId, signal, …)` with the closure state passed in. The harness then imports it with `loadProductModule`. | High until the split; do it with the split. |
| 2 | 194-204 | B5 | Asserts `.source.json` `baseCommit` equals `upstream.lock.json` and that every projected dependency's hash equals the projection receipt. That re-checks `prepare-client-features`. | Delete. | Low. |
| 3 | 233, 238-239 | A1? | Schedules for `legacy` status, `legacy-product` and `legacy-mock` wire formats (no `userTextFormatVersion`, `alphaPhone.context` envelope). | Owner question: the resident agent ships in the APK; if every supported agent reports `userTextFormatVersion:1`, the legacy envelope is a dead reader (A1) and these 3 schedules plus the model branch go. | Wire compatibility with older agents. |
| 4 | 191-192 | B5 | Captures `package-lock.json` as a source input. | Drop. | Low. |

## Proposed end state
Same 20 (or 17) schedules against an imported `sendTurn` and the three already-bundled modules; no hash checks; one test entry point.
