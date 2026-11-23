# specs/quint/refinement/application/agent-calendar-event-return.mjs
- Lines: 321 | Kind: Quint refinement harness (imports the real module via esbuild `bundledSource`) | Verdict: KEEP, FIX NOW (constructor drift from D1) then SIMPLIFY
- Covers: capture of a canonical Calendar event selection for Maps return and its two-read verification (`AgentCalendar.verifyEventReturn` + `maps-event-return.ts` origin helper) against `AgentCalendarEventReturn.qnt` (181 lines, live, no legacy content). Duplicates: Maps event-return harness (`maps-event-return.mjs`) covers the mounted side; no host/Playwright test covers the stale-version/source-digest refusals. Callers/importers: `index.mjs`, `test/quint-agent-calendar-event-return.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 103-106 | **breakage (D1)** | Constructs `new AgentCalendar(port, {capture, retainedReadOnly})`. In this worktree `apps/app/src/runtime/agent-calendar.ts:46` no longer takes a `CalendarPreservation` argument (legacy Calendar preservation deleted in stage A); the object now lands in the `client` slot and `this.client(port, signal)` throws `TypeError`. The harness fails until updated. | Call `new AgentCalendar(port)` (default `agentCalendarClient`, which is what the harness intends to exercise). | High (Quint must stay 100 %) |
| 2 | 205-216, 294-295 | **breakage (D1)** | `startMutation`/`finishMutation` hold the mutation at the preservation `capture` gate and reject it there ("Stop fixture at preservation gate"). That gate no longer exists; `create` now goes straight to the client, whose `POST` hits the port, which asserts `method === 'GET'` (line 71). | Hold the mutation at the port instead: when `mutation` is armed, the `POST …/events` request returns a held deferred; `finishMutation` rejects it. Model action names stay the same, so `AgentCalendarEventReturn.qnt` needs no change. | Med |
| 3 | 4, 299-301 | (good) | Uses `bundledSource` — imports and runs the real module graph; no text slicing. | Keep; this is the target pattern. | – |
| 4 | 300-301, 315 | B5 | `captureSources(inputs)` + `boundInputs` hashing. | Drop with §2.8. | None |
| 5 | 52-57 | C3 | Local SHA-256 hex via `crypto.subtle` to map source digests. | Fine as abstraction function; could reuse the product's `calendarSourceRevisions` if exported, but do not export only for this. | – |
| 6 | 267-296 | – | 38 cases including generated families; bounded and meaningful. | Keep. | – |

## Proposed end state
Same harness (~310 lines) with the one-argument constructor and a port-level mutation hold; no source hashing.
Verify with `node --test test/quint-agent-calendar-event-return.test.mjs` (or the single runner) before stage E closes.
