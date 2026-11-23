# apps/app/src/runtime/modal-inert.ts
- Lines: 7 | Role: reference-counted `inert` on the phone element so overlapping panels release it only when the last owner closes. | Verdict: KEEP
- Importers: 9 (`prototype/calendar-approval-review.ts`, `prototype/file-email-review.ts`, `prototype/source-review-dialog.ts`, `prototype/workflow-filters.ts`, `runtime/calendar-sync-settings.ts` (being deleted, DECISIONS D4), `runtime/connection-ui.tsx`, `runtime/google-connection-ui.tsx`, `runtime/hosted-digest-ui.tsx`, `runtime/inline-modal.ts`). Text/path pins: `specs/quint/application/manifest.json:96,2780,3087,8514-8527`, `specs/quint/refinement/application/boundaries.mjs:17`, `test/automations-unified.test.mjs:70`, `test/browser/notes-named-review.spec.ts:8`, `test/browser/notes-query-review.spec.ts:7`, `test/connection-chooser-focus.test.mjs:13`, `test/fixtures/modal-scrim-chromium.mjs:14`, `test/fixtures/workflow-clock-admission.mjs:18`, `test/quint-inert-hold.test.mjs:11`, `test/support/feature-parity.mjs:559`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | — | correction | The a–m research (§5) proposed merging this file into "its single caller"; it has 9 importers. | Keep as is. Once the C4 migration routes dialogs through `createInlineModal`, direct importers shrink to inline-modal.ts plus the React panels. | — |
| 2 | 4 | B2 | `if(!phone)return ()=>{}` — callers pass `querySelector('.os')`, which can be null before mount; specified. | Keep. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `owners` | const (WeakMap) | 2 | — | stays |

## Proposed end state
Unchanged (7 lines).

## Verification
Quint inert-hold model and `test/quint-inert-hold.test.mjs`; dialog Playwright journeys.
