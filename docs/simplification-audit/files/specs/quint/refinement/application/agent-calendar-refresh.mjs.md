# specs/quint/refinement/application/agent-calendar-refresh.mjs
- Lines: 248 | Kind: Quint refinement harness (esbuild bundle of the real module with an `onLoad` text patch of `Date.now()`) | Verdict: KEEP, PORT NOW (model + harness lose the legacy/retention phases)
- Covers: `AgentCalendar.refresh` — three independently settled reads (feed, sources, next), same-window coalescing/trailing request, window change aborts, owner/session replacement, next-event freshness and clock invalidation, against `AgentCalendarRefresh.qnt` (175 lines, live). Duplicates: none at integration level. Callers/importers: `index.mjs`, `test/quint-agent-calendar-refresh.test.mjs`; exports `buildAgentCalendar`, imported by `agent-calendar-mutation.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 55-73 | **breakage (D1)** | Passes a `preservation` object as the 2nd constructor argument; the worktree constructor is `(port, client, …)`. All 25 cases currently fail. | `new AgentCalendar(port, clientFactory)`; the client factory becomes the point where a job is created (phase `reading`). | High |
| 2 | 17, 57-71, 158, 169-182, 190, 194-195, 197-228 | **breakage (D1)** / A1 | Every case starts with `legacyReply`; model state has `legacy`, phases `legacy`/`retention`, statuses `legacy-recovery`/`transition-required`; four cases exist only for the legacy gate (`retire-cancels-old-legacy-read`, `old-legacy-gate-requires-explicit-retention`, `unreadable-and-pending-legacy-require-recovery`, `legacy-read-transport-failure-keeps-current-old-feed`). `AgentCalendarState` no longer has `legacy` and those statuses are gone. | Model: drop `legacy` field, `LegacyResults`, `legacyReply`, `retentionReply`, the two statuses; `request` goes straight to phase `reading`. Harness: delete `legacyReply`/`retentionReply` steps from all cases and the four legacy-only cases; keep `retire` cancelling an in-flight read (re-cut at the feed read). | High |
| 3 | 22-34 | T10 (mild) | `buildAgentCalendar` replaces every `Date.now()` in the source text with `__clock.now()` (asserts the text contains it). A refactor to `performance.now()` or an injected clock silently changes semantics. | Override `Date.now` for the duration of each case (as `browser-deletion-poll.mjs` does with `performance.now`) and load with `bundledSource`. | Low |
| 4 | 151-152 | T6-like | Reads private fields `abort`, `reading`, `deferredRefresh`, `nextQuery`, `binding`, `epoch` at runtime. | Acceptable white-box observation; do not widen the class API for it. | – |
| 5 | 243-247 | B5 | `boundInputs` hashing; assumption text mentions preservation. | Drop/update. | None |

## Proposed end state
~200 lines, ~21 cases, model without legacy/retention, `Date.now` faked globally instead of text patching. Lands with
the stage-A preservation deletion (currently failing). Relax `test/quint-agent-calendar-refresh.test.mjs` exact counts
(`traces === 25`, `checkpoints === 237`) to `> 0` or remove the wrapper in favour of the single runner.
