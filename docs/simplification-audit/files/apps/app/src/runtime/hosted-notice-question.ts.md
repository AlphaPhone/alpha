# apps/app/src/runtime/hosted-notice-question.ts
- Lines: 47 | Role: opens the "Ask about this result" review for an Android digest-result notification tap, re-checks the tap before composing, and exports a tiny single-flight wrapper. | Verdict: SIMPLIFY
- Importers: 1 (`runtime/hosted-digest-ui.tsx:2`). Text/path pins: `specs/quint/application/manifest.json:3052,3401`, `specs/quint/refinement/application/hosted-notice-question.mjs:9`, `specs/quint/refinement/application/hosted-digest-refresh.mjs:71`, `test/hosted-notice-question.test.mjs:12`, `test/quint-hosted-notice-question.test.mjs`, `test/support/feature-parity.mjs:527`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 13 | D10 / C6 | `text==='No readable summary was returned. Open execution details to inspect this result.'` compares against the literal that upstream `digestSummaryText` returns (`.eliza/client-features/plugins/plugin-workflow/src/client/hosted-digests.ts:284`). A copy edit upstream silently makes unreadable results reviewable. | Upstream follow-up (DECISIONS D14): export `digestHasReadableSummary(result)` or the constant; until then import the constant if exported, else keep and add it to `cross-file-actions.md`. | Low. |
| 2 | 11, 26 | NEW (JSON equality) | `snapshot=JSON.stringify(result.result)` then `JSON.stringify(fresh.result)!==snapshot` — fine as identity of the reviewed bytes. | Keep; note twin `same()` in hosted-digest-ui.tsx:70. | — |
| 3 | 16-36 | B4 | `done()` guarded by `ended`, `abort` declared as `let abort=()=>{}` then reassigned after `reviewContentQuestion` returns so the `closed` callback can reference it. | Declare `const abort` before `reviewContentQuestion` using a `close` variable assigned afterward (`let close:()=>void`) — same behaviour, one fewer mutable binding. | Low. |
| 4 | 20, 32 | B1 | `void options.discard().catch(()=>{})` — dismissing the review releases the native Ask; failure leaves it pending (specified: next poll re-reports). `catch{options.report('The result or account changed…')}` folds every failure into one message (specified UX). | Keep both; add one comment on 20 saying a failed release is retried by the next tap check. | — |
| 5 | 40-47 | C3 | `hostedTapResolver()` is a generic "single in-flight async" guard; twins: `refreshFlight` in hosted-digest-ui.tsx:129, `checking` flag in maps-notification-open.ts:8-17. | Rename to `singleFlight()` and move to `lib/single-flight.ts` if a second user adopts it; otherwise keep here. | Low; Quint harness `hosted-digest-refresh.mjs:71` imports this file by path. |
| 6 | 10 | D8 | 400-char options type on one line. | Name it `interface NoticeQuestionOptions`. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `Result` | type | 7 | `Awaited<ReturnType<typeof resolveHostedResultTap>>` — export `HostedResultTap` from hosted-result-notices.ts instead | hosted-result-notices.ts |
| `hostedTapResolver` | helper | 40-47 | maps-notification-open.ts `checking` flag; hosted-digest-ui.tsx `refreshFlight` | keep, or `lib/single-flight.ts` |
| unreadable-summary literal | const | 13 | upstream hosted-digests.ts:284 | upstream export |

## Proposed end state
~45 lines: named options interface, `HostedResultTap` type imported from hosted-result-notices.ts, the unreadable-summary check delegated to an upstream predicate (or constant), `abort` declared once. Behaviour unchanged.

## Verification
Quint `HostedNoticeQuestion` model and `specs/quint/refinement/application/hosted-notice-question.mjs`; `test/quint-hosted-notice-question.test.mjs`; Android notification journey (HostedResultNoticeInstrumentedTest).
