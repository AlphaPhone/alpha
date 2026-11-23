# specs/quint/refinement/application/agent-calendar-sync-control.mjs
- Lines: 339 | Kind: Quint refinement harness (esbuild bundle of the real module with an `onLoad` source-marker injection) | Verdict: KEEP, PORT NOW (preservation phase gone) + remove marker
- Covers: renderer linked-Calendar sync review (`reviewSync`), destination select/resume/pause/recover (`changeSync`) with fresh destination recheck, draft fence, expected revision and idempotency key, and linked-event reads (`listLinkedEvents`), against `AgentCalendarSyncControl.qnt` (254 lines, live). D4 keeps this agent-side sync as the product path. Duplicates: none found. Callers/importers: `index.mjs`, `test/quint-agent-calendar-sync-control.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 180-190 | **breakage (D1)** | Passes `{capture, retainedReadOnly}` as the 2nd constructor argument; the worktree constructor is `(port, client, …)` and the harness wants the default client. Currently every case fails. | `new AgentCalendar(port)`. | High |
| 2 | 64-67, 151-152, 181-187, 209, 255, 267-318 | **breakage (D1)** / A1 | Attempts are bound to their AbortSignal inside `preservation.capture` (`bySignal.set(signal, issuing)`); each operation then needs a `preserve(id)` step, and 4 cases exist only for preservation refusals (`initial-preservation-failure-refuses-review`, `mutation-preservation-{changed,pending,unreadable}`), plus `retired-post-result-cannot-clear-successor-preservation`. The model has `Preservations`, `preserve`, phase `"preservation"`. `mutate()` no longer reads preservation. | Model: delete the preservation phase; `start` moves to `review`/`fresh`/`write` directly. Harness: bind `bySignal` on the first `port.request` made while `issuing` is set; delete every `preserve(...)` step and the four preservation-only cases; re-cut the retired-successor case at `controlReply`. | High |
| 3 | 69-83, 90-94 | T10 | Injects `__selected(selected,signal);` before the literal line `"    const fresh=await api.getLifeOpsCalendars({side:'owner'});"` (indentation-sensitive, must occur once) to observe the selected source. | Drop the injection. The selected source is determined by the inputs (`select`: `review.sources` entry for `sourceKey`; `resume`: the entry matching `review.control.destination`) and is confirmed by the POST body's `destination`. Compute it in the abstraction function. | Low |
| 4 | 13-24 | – | Error-message → class map duplicates the one in `agent-calendar-mutation.mjs`; includes the now-impossible preservation message. | Share one map (small `calendar-errors.mjs` in the harness folder); drop the preservation entry. | Low |
| 5 | 333-338 | B5 | `boundInputs` + `batchSize: 18`. | Drop hashing. | None |

## Proposed end state
~290 lines, ~31 cases, model without the preservation phase, real module loaded with `bundledSource` (no text
injection). Lands with the stage-A preservation deletion (currently failing in the worktree).
