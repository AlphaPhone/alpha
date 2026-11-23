# specs/quint/application/ObservationTurnDispatch.qnt
- Lines: 131 | Kind: Quint model (live; slicing + bundle harness) | Verdict: KEEP (trim legacy formats) + PORT harness
- Covers: A chat turn adds the optional client-observation day field only after a fresh matching status comparison on the same live connection; cancellation/replacement aborts before any post. Duplicates: client-observation-support model (checkClientObservationSupport, other chunk) covers the support handshake itself. Callers/importers: manifest row (connection-ui.tsx, client-observation-support.ts, phone-context.ts, local-agent.ts); harness specs/quint/refinement/application/observation-turn-dispatch.mjs (family aggregate)

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | observation-turn-dispatch.mjs:32-40 | T2/T10 | Harness slices `connection-ui.tsx` from `'  async send(text:'` to `'\n  },\n};'` and regex-extracts `conversationKey` and `STOPPED_*_NOTICE` lines, then runs them in node:vm. | PORT: export the send path as a function (`sendTurn(deps, text)` in a connection module split out of connection-ui.tsx, D1 god-module split) and import it with stubbed bridge ports. | M |
| 2 | 12, 98-101, 113-123 | A1 | `legacy-product` and `legacy-mock` formats model `phoneContextMessage`, the legacy envelope for unnegotiated peers (phone-context.ts:96-129; "every resident and local agent at the pin" negotiates v1). delete-candidates B313 / Q-UI-32 propose deleting it (M, D1). | If B313 lands: drop `format` (plain only), `wireText`, `wireFormat` legacy branch and the two Legacy runs. | M (owner Q-UI-32) |
| 3 | manifest | T10 | No symbol pins; file pins on connection-ui.tsx mean every connection-ui edit reruns it. | After PORT, pin the extracted module. | L |

## Proposed end state
Model of the plain-v1 turn only (if B313 is accepted) with the same three invariants.
Harness imports an exported send function instead of slicing connection-ui.tsx.
