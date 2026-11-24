# specs/quint/refinement/application/shade-notice-question-admission.md
- Lines: 25 | Kind: model/harness prose | Verdict: KEEP (trim)
- Covers: describes `ShadeNoticeQuestionAdmission` and its JSDOM replay of the notifications adapter. Callers: none (documentation).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-7 | A8 | "At baseline `0f2aa1e931`, the older read could still populate…" narrates a past bug. | Delete; state the rule only. | L |
| 2 | 3 | D11 | Calls it "the simulated development shade" while the harness drives the production `notifications-adapter.ts`. | Say "the notification shade adapter". | L |

## Proposed end state
Two short paragraphs: the admission rule (lease retired by successor review, shade departure, lock, visibility,
device-state, unmount; result must match revision and excerpt) and the replay scope. Could become the harness's header comment.
