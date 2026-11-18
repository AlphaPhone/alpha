# specs/quint/refinement/application/agent-calendar-mutation.mjs
- Lines: 266 | Kind: Quint refinement harness (esbuild-bundled real module, `Date.now()` text patch via shared `buildAgentCalendar`) | Verdict: KEEP, PORT NOW (model + harness lose the preservation phase)
- Covers: `AgentCalendar.create/update/delete` admission (source/event/version/scope/move/organizer disposition), dispatch body, deferred refresh while mutating, owner/session fences, retired replies, against `AgentCalendarMutation.qnt` (143 lines, live). Duplicates: `test/agent-calendar-mutation.test.mjs` → `scripts/test-agent-calendar-mutation-flow.ts` (reviewer verdict DELETE). After that deletion this harness is the only coverage of mutation admission rules. Callers/importers: `index.mjs`, `test/quint-agent-calendar-mutation.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 79-95 | **breakage (D1)** | Passes `preservation` as the 2nd constructor argument and the client factory as the 3rd. In this worktree the constructor is `(port, client, cache, …)`; the preservation object becomes `client` and every read/write throws. | `new AgentCalendar(port, clientFactory)`. | High |
| 2 | 32-33, 64-66, 79-92, 177-183, 201, 224-226, 230-231, 238-239, 245-246, 24 | **breakage (D1)** / A1 | The whole job lifecycle starts in phase `'preservation'` (held `capture`), dispatch asserts "belongs to a held preservation check", and five cases exist only to exercise preservation refusals (`legacy-preservation-rejects-…`, `preservation-refusal-still-runs-the-deferred-refresh`, `same-owner-new-session-refuses-preservation-admission`, `retired-preservation-reply-cannot-dispatch`). The product no longer has that gate: `mutate()` now does `current()` then dispatches. | Model: delete `Preservation`, `preservationReply`, phase `"preservation"`; `start` goes directly to `"remote"` (or `"settled"` on refusal). Harness: jobs begin in phase `remote` when the client is called; delete the four preservation-only cases; rewrite `session-change…`/`retired-…` cases to cut at the provider reply instead. Carry: owner/session fence before dispatch, deferred refresh after transport refusal, retired reply not clearing successor. | High (must land with stage A to keep Quint green) |
| 3 | 5, 250 | C3 | Reuses `buildAgentCalendar` from `agent-calendar-refresh.mjs` (good) — that helper text-patches `Date.now()` (see refresh report). | Follow the refresh port. | Low |
| 4 | 39 | T2 (mild) | Evaluates the CJS bundle with `new Function('module','exports','__clock', code)`. | Fine once `Date.now` is faked by global override; then plain `import()` of an ESM bundle via `bundledSource` works. | Low |
| 5 | 105-110 | T6-like | Wraps `calendar.refresh` on the instance to capture the in-flight promise. | Acceptable white-box hook. | – |
| 6 | 261-265 | B5 | `boundInputs` hashing; assumption text mentions "controlled preservation". | Drop hashing; update text. | None |

## Proposed end state
~220 lines, model ~115 lines without the preservation phase, 19-20 cases. Must change in the same commit as the
`agent-calendar.ts` preservation deletion (it is already deleted in the worktree, so this harness and its model are
currently failing). Remove `test/agent-calendar-mutation.test.mjs` and its script only after this harness is green.
