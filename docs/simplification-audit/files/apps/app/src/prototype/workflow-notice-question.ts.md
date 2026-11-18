# apps/app/src/prototype/workflow-notice-question.ts
- Lines: 30 | Role: "Ask about this notification" review for an Android workflow notification tap: shows the notice excerpt through `reviewContentQuestion`, re-verifies the tap and consumes it natively before composing the question; Cancel discards the tap. | Verdict: KEEP (minor)
- Importers: 1 — `apps/app/src/prototype/workflow-adapter.ts:3` (called at `:176`).
- Text/path pins: `specs/quint/services/manifest.json:3998,4047-4051` (path + symbols `reviewWorkflowNoticeQuestion`, `discard`); `test/support/feature-parity.mjs:441`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 16 | B1 | `void options.discard().catch(()=>{})` — a failed discard leaves the tap pending; that is the safe outcome (the next check offers it again). | Keep; add the one-line reason. | None. |
| 2 | 20-25 | B1 | `try{…}catch{options.report('Changed');}` — any recheck/consume failure reports "Changed" and composes nothing. This is the specified fallback (nothing is sent on doubt). | Keep; comment. | — |
| 3 | 10 | C3 | Notice identity compared with `JSON.stringify(fresh.notice)===JSON.stringify(notice)`; the same deep-equality-by-stringify idiom appears across adapters. | Optional shared `sameJson(a,b)`; not worth a change alone. | None. |
| 4 | 13, 27 | D9 | `let abort=()=>{}` placeholder reassigned after `reviewContentQuestion` returns, because `done()` references it for listener removal. | Declare `abort` as a function hoisted below (`function abort(){…}`) so no placeholder is needed. | None. |
| 5 | 4-5 | C1 | `type Result=Awaited<ReturnType<typeof resolveWorkflowTap>>` — derived locally; workflow-adapter derives the same shape implicitly. | Export `WorkflowTapResult` from `runtime/workflow-device-contract.ts`. | None. |
| 6 | 2 | D13 | Deep relative import `../../../../.eliza/client-features/plugins/plugin-native-browser-surface/src/page-reading.ts`. | `@eliza/*` alias (D13). | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `Result` | type | 5 | implicit in `workflow-adapter.ts:163` | `runtime/workflow-device-contract.ts` (`WorkflowTapResult`) |
| `same` | helper | 10 | stringify-equality idiom in many adapters | keep local |

## Proposed end state
Unchanged behaviour; exported tap-result type from the contract module, alias import, hoisted `abort`, two comments on intended catches. Could fold into the merged `prototype/workflows/` folder as `notice-question.ts`. Est. lines after: 29.

## Verification
Quint services model whose manifest entry lists this file (`specs/quint/services/manifest.json:3996-4051`; no harness reads the file's text — `git grep workflow-notice-question` hits only the manifest and feature-parity); Playwright `workflow-notice-taps.spec.ts`; Android tap handling is device acceptance.
