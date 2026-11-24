# specs/quint/application/ReadReplyLease.qnt
- Lines: 73 | Kind: Quint model, live (in `application/manifest.json`, run by `quint:check`) | Verdict: KEEP
- Covers: One approved Notes read answers its question at most once, only while the original binding is current; cancel/unconfirmed are terminal. Duplicates: none. Callers/importers: manifest only (9 symbol pins in `prototype/agent-adapter.ts`, `runtime/connection-ui.tsx`); README row. No harness, no test.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-4 | T10 | Only symbol pins tie it to `agent-adapter.ts`/`connection-ui.tsx`; both are D1 god-module split targets (Stage F), so pins on `completeReadReply` (present in both files) will break on the split without telling anyone whether behaviour changed. | Pin files only; move pins with the split. | L |
| 2 | 31-37 | - | `completionSettles` requires `s.completions == 1` and `answers == 0`, so the late-answer path is modelled once per run; adequate for the claim. | None. | - |

## Proposed end state
- Keep. Models live chat read-reply flow.
- No harness exists; a port would need `agent-adapter.ts` to export the lease store (`readReplyLeases` + `retainReadReply`/`completeReadReply`) as a module after the agent-adapter split.
- Behavioural backstop: `journeys/chat.spec.ts` (approve a Notes read from chat, answer appears once).
