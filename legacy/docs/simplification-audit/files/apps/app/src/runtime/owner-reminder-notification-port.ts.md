# apps/app/src/runtime/owner-reminder-notification-port.ts
- Lines: 90 | Role: browser-build passive reader and explicit mark-read/open of the agent's owner-reminder notifications, gated by visibility/privacy policy, with an "unconfirmed" state for lost acknowledgements. | Verdict: SIMPLIFY (format and name the repeated steps)
- Importers: `main.tsx:10` (bound only when `!Capacitor.isNativePlatform()`, main.tsx:95).
- Text/path pins: `specs/quint/refinement/application/browser-owner-reminder-action.mjs:6`, `browser-owner-reminder-read.mjs:6` (read the implementation), `specs/quint/application/manifest.json`, `feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 17-40, 49-58, 79-87 | D8 | state machine in one-liners: 14 private fields declared 4 per line, `visibility()` packs a 4-way privacy predicate and three branches. | Format; name predicates (`privacyLost(prev,next)`). | Medium (Quint harnesses read text) |
| 2 | 22, 27, 31 | C3 | "abort every action" sequence written three times: `for(const action of this.actions)action.abort();this.actions.clear();`. | `private abortActions()`. | Low |
| 3 | 33, 40, 56-57, 86-87 | C3 | status recomputation `this.uncertain.size?'unconfirmed':this.binding?'ready':'unconfigured'` repeated. | `private settledStatus()`. | Low |
| 4 | 24 | B1 | `try{next=this.source?.binding()??null;}catch{}` — a throwing binding reader is treated as "no binding". | Keep if intended (fail closed); add a comment. | Low |
| 5 | 16 | B1 | observer failures swallowed in `publish` — commented, specified. | Keep. | None |
| 6 | 57, 82, 85 | B1 | catch → `unavailable`/reconcile — specified by L84 comment. | Keep. | None |
| 7 | 4-6 | A7 | `ReminderVisibility`, `ReminderUi`, `AgentReminderStatus` exported, 0 external users. | Unexport. | None |
| 8 | 7 | — | `OwnerReminderNotificationPort` class exported only for the Quint harnesses (2 spec files). | Keep export (harness), mark as such. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `ReminderVisibility` | interface | 4 | Android notification gate (Java) | keep |
| epoch fence `ownerCurrent` | helper | 19 | ~30 epoch fences (C4) | keep local |

## Proposed end state
~95 lines formatted (line count may rise slightly), two private helpers, unexported types; behaviour identical.

## Verification
Quint `browser-owner-reminder-action`, `browser-owner-reminder-read` refinements; browser notifications specs.
