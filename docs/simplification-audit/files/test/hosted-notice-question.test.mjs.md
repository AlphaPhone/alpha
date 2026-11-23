# test/hosted-notice-question.test.mjs
- Lines: 32 | Kind: unit (esbuild-bundles real `apps/app/src/runtime/hosted-notice-question.ts` with a plugin replacing `browser/content-question`, `alpha-client` and `hosted-digests` by inline stub modules) | Verdict: DELETE
- Covers: Ask on a retained hosted-result notice only composes a draft when owner and content are unchanged and the conversation can take it; cancel keeps the notice; the tap resolver admits one tap at a time and releases on failure. Duplicates: `test/quint-hosted-notice-question.test.mjs` (Quint refinement of the same module), `test/browser/gmail-notice-question.spec.ts`, `reminder-notice-question.spec.ts`, `workflow-notice-taps.spec.ts`, `journey-f-hosted-result.spec.ts`. Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 12 | T3 | Three imports stubbed by regex on specifier; a 600-character stub module inline. | Delete. | Low |
| 2 | 14-32 | T4 | Same decisions are checked by the Quint refinement and by the notice-question browser specs. | Delete. | Low |
| 3 | 26-30 | — | "Unreadable result falls back to open" and "sensitive surface refuses Ask". | Confirm `journey-f-hosted-result.spec.ts` asserts one of them; otherwise carry one case to `journeys/notifications.spec.ts`. | Low |

## Proposed end state
File deleted. Hosted-notice Ask is covered by the Quint replay and `journeys/notifications.spec.ts`.
