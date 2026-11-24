# apps/app/src/browser/content-question.ts
- Lines: 49 | Role: "Ask Alpha" review dialog that lets the user edit a question and excerpt (optionally OCR an image) before composing into the conversation. | Verdict: MOVE to `apps/app/src/prototype/` (or a shared `ui/dialogs/`), SIMPLIFY
- Importers: 8 (`prototype/browser-adapter.ts`, `camera-adapter.ts`, `notifications-adapter.ts`, `own-notice-question.ts`, `selection-adapter.ts`, `workflow-notice-question.ts`, `runtime/hosted-notice-question.ts`, `runtime/source-renewal-question.ts`). It imports back from `prototype/summary-source` and `prototype/local-ocr` (folder cycle). Text/path pins: `specs/quint/application/manifest.json:1232,3053,3402`, `specs/quint/services/manifest.json:785`, Quint harnesses `refinement/application/hosted-digest-refresh.mjs`, `own-notice-question.mjs`, `photos-window.mjs`, `refinement/services/reading.mjs`, `scripts/test-own-notice-question.ts`, `test/browser-session-persistence.test.mjs`, `test/selection-ask-readiness.test.mjs`, `test/fixtures/shade-notice-question.mjs`, browser specs `content-review-layout`, `dev-content-question`, `dev-image-question`, `media-polish`, `summary-source-note`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | — | D11 | Product UI used only by prototype/runtime, living in `browser/`, importing back into `prototype/`. | Move to `prototype/content-question.ts`; update every path pin listed above in the same change. | Medium (many path pins) |
| 2 | 7-9, 26-34, 47 | C4 | Dialog kit by copy: token loop `['bg','fg','mut','line','s2','acc']` with `--source-*`, alpha-back/pagehide/visibility listeners and teardown, focus restore. `research/app-prototype.md:524` names `source-review-dialog.ts` as the canonical review scaffold. | Build on `openReview`/`openOwnedDialog`. | Medium |
| 3 | 19, 21, 25, 37-38 | D12 | Five inline `style.cssText` strings. | `note-source-dialog` CSS classes. | Low |
| 4 | 33 | D9 | 900-character `proceed.onclick`. | Split into `lockInputs()`, `verifySource()`, `finish()`. | Low |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| input object type | type (inline) | 6 | none | name it `ContentQuestionInput` |
| `SourceUnavailableError` | class | 4 | error classes in `prototype/summary-source.ts` | keep |

## Proposed end state
~45 lines in `prototype/`, using the shared review dialog scaffold and CSS classes; behaviour and copy unchanged.

## Verification
Quint `own-notice-question`, `photos-window`, `reading`, `hosted-digest-refresh`; `test/browser/dev-content-question.spec.ts`, `dev-image-question.spec.ts`, `content-review-layout.spec.ts`.
