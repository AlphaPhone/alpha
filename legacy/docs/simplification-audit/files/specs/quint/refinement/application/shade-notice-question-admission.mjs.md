# specs/quint/refinement/application/shade-notice-question-admission.mjs
- Lines: 91 | Kind: Quint refinement harness over `test/fixtures/shade-notice-question.mjs` (which slices `notifications-adapter.ts` by text and runs it in a VM with JSDOM) | Verdict: KEEP (fixture PORT)
- Covers: `ShadeNoticeQuestionAdmission` — asking about a shade notice composes a draft only for the current exact lease; successor review, shade departure, lock, visibility loss, device-state and unmount retire held reads; changed revision/excerpt reports refusal. Product: `apps/app/src/prototype/notifications-adapter.ts`, `prototype/context-selection.ts`, `browser/content-question.ts`. Duplicates: `test/shade-notice-question.test.mjs` (same fixture, and its last test calls this harness again). Callers: `index.mjs` aggregate, `test/shade-notice-question.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2 | T10 (via fixture) | The fixture cuts `notifications-adapter.ts` between `'const opaque'` and `'type Notice ='` plus from `'export function installNotificationsAdapter'`, and strips imports from `content-question.ts`. | Port the fixture to bundle `installNotificationsAdapter` (it is already exported) with esbuild and stub only the bridge. Owned by the `test/fixtures` chunk; this file needs no change. | M |
| 2 | — | T4 | Executed three ways: aggregate, the host test's last case, and nowhere as a `quint-*` per-model test. The host test's other cases replay the same schedules without the model. | Make the host file the per-model wrapper (only the harness case) and delete its duplicate fixture cases, or add `test/quint-shade-notice-question-admission.test.mjs` and delete the host test. | L |
| 3 | 12-14 | B5 | Hashes its own path and `support.mjs` as provenance. | Drop with receipts. | L |

## Proposed end state
Same 13 schedules over a bundled real adapter; one test entry point; no fixture text slicing.
