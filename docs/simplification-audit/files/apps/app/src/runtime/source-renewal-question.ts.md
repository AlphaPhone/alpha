# apps/app/src/runtime/source-renewal-question.ts
- Lines: 39 | Role: offers "ask the agent about this source renewal" from a hosted-digest renewal notification, re-checking the source before composing and settling the notice. | Verdict: SIMPLIFY (small)
- Importers: `runtime/hosted-digest-ui.tsx:1`.
- Text/path pins: Quint `specs/quint/refinement/application/hosted-digest-refresh.mjs:69` (loads this path), `specs/quint/application/manifest.json`, `test/source-renewal-question.test.mjs`, `feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8 | D9 | option bag with 9 callbacks (`current, recheck, settle, canCompose, compose, report, closed, …`) and three flags (`composing`, `ended`, `interrupted`). | Keep the port but group flags into one `state:'open'|'composing'|'ended'` and use an `AbortController` for the blur/home listeners. | Low |
| 2 | 13, 38 | D8 | `let abort=()=>{}` declared after use in `done`, reassigned at L38 so listeners can be removed. | One `AbortController` for listeners (`{signal}` option). | Low |
| 3 | 19 | B1 | `void o.settle(true).catch(()=>{})` — dismissal settle failure dropped. | Report via `o.report` or crash log; or comment why it is safe. | Low |
| 4 | 33 | B1 | `catch{o.report('The source or account changed…')}` — specified user message; keep. | Keep. | None |
| 5 | 11 | C6 | `source:'own'` literal = `phone-context.ts` `OWN_NOTIFICATION_SOURCE`. | Import the constant. | None |
| 6 | 7 | D8 | `renewalMatches` field list inline. | `const RENEWAL_FIELDS=[…] as const`. | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `SourceRenewalTap` | interface | 6 | `hosted-digests.ts` selection types | keep |

## Proposed end state
~35 lines, listener cleanup via `AbortController`, one state variable.

## Verification
`test/source-renewal-question.test.mjs`, Quint `hosted-digest-refresh`.
