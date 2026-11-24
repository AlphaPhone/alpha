# apps/app/src/runtime/alpha-client.ts
- Lines: 506 | Role: session-bound chat client: view-context revisions, one in-flight request, proposal admission and single-use approval, plus the wire/presentation types (`VerifiedSession`, `ContextEnvelope`, `ActionProposal`, `AgentReply`, `OperationReceipt`) used app-wide | Verdict: SIMPLIFY (and move the shared types to `runtime/agent-types.ts`)
- Importers: 22 app files (types: browser/digest-storage.ts, browser/workflow-drafts.ts, runtime/app-record-route-policy.ts, runtime/client-observation-support.ts, runtime/local-agent.ts, runtime/remote-protocol.ts, …; `alphaClient` singleton: prototype/agent-adapter.ts, calendar-approval-adapter.ts, calendar-confirmation.ts, inbox-cloud-adapter.ts, notifications-adapter.ts, reminder-adapter.ts, workflow-adapter.ts, runtime/hosted-notice-question.ts, runtime/source-renewal-question.ts). Text/path pins: `specs/quint/application/manifest.json` symbol pins `AlphaClient, run, send, approve, cancel, disconnect, setViewContext, generateWorkflowText, consumed, proposals, expiresAt, keepConsumed, consumedSession` (renames break the manifest); 24 manifest source entries; source-text reads in `test/agent-always-local.test.mjs:156` and `test/login-surfaces.test.mjs:330` (T1); ~98 test/script/spec files incl. `test/alpha-client-consumed-approvals.test.mjs`, `test/alpha-client-sensitive.test.mjs`, `scripts/test-agent-context-browser.ts`, 30+ Playwright specs.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 182-191, 222, 230 | A3/D7 | `developmentSessionsAllowed = import.meta.env === undefined || …` (Node-test shim) and `developmentSessionOrigin` admit plain-HTTP loopback sessions. The only caller passing `developmentOrigin` is `agent-adapter.ts:836` when `connection.kind === 'local'` — the retired paired-agent kind (research P4). `developmentSessionOrigin` export has 1 test importer. Twin: `remote-protocol.ts:81-82` `developmentOriginsAllowed` / loopback host list. | Delete lines 182-191 and the `options` parameter of `attachVerifiedTransport` when the `'local'` kind goes; until then move the loopback rule to one place shared with remote-protocol.ts. | Medium: coordinated with P4 removal; test-mocks harness that attaches a loopback session must use the resident fake. |
| 2 | 142-143, 264-268 | B2/A7 | `close?(): void` is optional and the sole transport (agent-adapter.ts:830-836) never defines it; `disconnect` wraps `old?.close?.()` in try/finally. | Delete `close?` and the try/finally (call `this.emit()` directly). | None. |
| 3 | 321-345 | C3 | Hand-rolled abort race (`aborted` promise + `Promise.race` + listener cleanup + external-signal forwarding). Twins: abort-signal.ts:24-37, local-agent.ts:236-250, client-observation-support.ts:55-66. | Shared `raceAbort(op, controller.signal, () => new AlphaClientError('cancelled', …))`. | Medium: keep the "cancelled" vs "stale" precedence. |
| 4 | 409-419, 441-448 | B3 | Re-validates the structure of `AgentReply` returned by the in-process `connectionController.send` (`typeof result.text !== "string"`, `Array.isArray` checks, the 400-char `completedActions` predicate at L448). Structure is already parsed at the resident/native boundary in local-agent. Policy checks (`expiresAt`, `contextRevision`, `consumed`, duplicate id, read-reply binding L442-444) are product rules and stay. | Keep policy checks; delete the pure shape checks or move them to the single parser at the native boundary. | Medium: confirm local-agent parses replies (research P9 says the same reply is validated twice). |
| 5 | 339, 347, 384, 408 | C6 | `new AlphaClientError("cancelled", "Request cancelled.")` built four times; status list `['succeeded','denied','cancelled','failed','unknown']` at L448 and L492 duplicates `OperationReceipt.status`. | `const cancelled = () => …`; `RECEIPT_STATUSES as const` with `OperationReceipt['status']` derived from it. | None. |
| 6 | 6-118 | D11 | 110 lines of shared wire/presentation types live in the client implementation file; 20+ modules import types from here only. | Move types to `runtime/agent-types.ts`; keep `AlphaClient` here. | Low; update importers (types only) and manifest source lists. |
| 7 | 145 | A7 | `AlphaClientState` exported, 0 importers. | Unexport. | None. |
| 8 | 386 | B4 | `(reply as AgentReply).planAction` — `reply` is already `AgentReply`. | Drop the cast. | None. |
| 9 | 63, 81, 131 | D12 (style) | Inline `import('./notes-contract').NotesTarget`, `import('@elizaos/voice/turn')`, `import('./local-agent-stream')` type expressions. | Top-level `import type`. | None. |
| 10 | whole file | D8 | Prettier-style blocks mixed with 300-char lines (L386-387, 448, 460-461). | Format. | Breaks the two T1 tests' regexes. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `AlphaView` | type | 6-25 | view id lists in prototype `VIEWS` / `mvp-features.ts` | agent-types.ts (derive from one view list) |
| `VerifiedSession` | interface | 44-50 | `ClientObservationBinding` extends it; session tuples in calendar/digest code | agent-types.ts |
| `copyContext` | helper | 168-180 | none | keep |
| `developmentSessionHosts` | const | 186 | remote-protocol.ts:82 `developmentLoopbackHosts` | delete with P4 (or one shared list) |
| identity tuple `JSON.stringify([origin,ownerId,agentId,sessionId])` | helper | 241 | client-observation-support.ts:18, agent-calendar.ts:14 | `sessionKey(session, ...extra)` in agent-types.ts |
| inline abort race | helper | 321-345 | abort-signal.ts, local-agent.ts | lib/abort.ts |

## Proposed end state
`alpha-client.ts` ≈ 300 formatted lines holding only `AlphaClient`, `AlphaClientError` and the singleton; wire types (≈110 lines) in `agent-types.ts`; no dev-origin shim, no optional `close`, shared abort race and receipt-status constant. Manifest-pinned member names (`run`, `send`, `approve`, `consumed`, `consumedSession`, …) unchanged.

## Verification
`test/alpha-client-consumed-approvals.test.mjs`, `test/alpha-client-sensitive.test.mjs`, `test/agent-always-local.test.mjs`, `test/login-surfaces.test.mjs`, `test/redaction-connection-switch.test.mjs`, `scripts/test-agent-context-browser.ts`, `scripts/test-connection-history.ts`, Playwright chat/composer/voice specs; quint application refinements that bind `AlphaClient` (composer-send, clients.mjs); `npm run verify`.
