# apps/app/src/runtime/client-observation-support.ts
- Lines: 90 | Role: per-session handshake that learns whether the connected agent accepts the optional `calendarDay` observation field, and strips it otherwise | Verdict: SIMPLIFY
- Importers: runtime/connection-ui.tsx (`ClientObservationSupportSession`). Text/path pins: `scripts/test-connection-history.ts`; quint `client-observation-support.mjs`, `observation-turn-dispatch.mjs`, `refinement/application/index.mjs`; application manifest sources (3695, 3719); `test/client-observation-handshake.test.mjs`, `test/quint-client-observation-support.test.mjs`, `test/calendar-day-context.test.mjs`; feature-parity inventory.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5, 11, 32 | A7/D7 | `ClientObservationBinding`, `ClientObservationSupportCache`, `contextForObservationSupport` exported; no app importer outside this file (tests/quint only). | Unexport; tests drive `ClientObservationSupportSession`. | Low (quint harness imports). |
| 2 | 17 | B3 | `key()` re-checks that origin/ownerId/agentId/sessionId are non-empty strings and epoch is a safe integer — the session was validated by `AlphaClient.attachVerifiedTransport` (alpha-client.ts:231-239) and comes from the typed connection state. | Keep only the `serverInstanceId` normalisation (agent-supplied); drop the session re-validation. | Low. |
| 3 | 18 | C3 | Identity tuple `JSON.stringify([origin,ownerId,agentId,sessionId,…])` — twins alpha-client.ts:241, agent-calendar.ts:14. | Shared `sessionKey(session, ...extra)`. | None. |
| 4 | 55-66 | C3 | `joined()` hand-rolls an abort race (`new Promise` + abort listener + `finally` removal). | Shared `raceAbort`. | Medium: keep the retry loop when the shared handshake is replaced. |
| 5 | 71 | C3 | Inline plain-object guard. | Shared `isRecord`. | None. |
| 6 | 75, 88 | B1 (keep) | `catch{…}` treat any status failure as "unsupported" so ordinary context still goes out (documented at L77). | Keep. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `ClientObservationBinding` | interface | 5-9 | extends `VerifiedSession` | keep (private) |
| identity key | helper | 15-19 | alpha-client.ts:241, agent-calendar.ts:14,60 | `sessionKey` in agent-types.ts |
| abort-join | helper | 55-66 | abort-signal.ts, alpha-client.ts:321-345 | lib/abort.ts |

## Proposed end state
~75 lines: private cache/binding, shared session key and abort race, only agent-supplied data validated.

## Verification
`test/client-observation-handshake.test.mjs`, `test/quint-client-observation-support.test.mjs`, `test/calendar-day-context.test.mjs`, quint `observation-turn-dispatch`.
