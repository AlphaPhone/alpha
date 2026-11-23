# apps/app/src/browser/documents.ts
- Lines: 4 | Role: the single upstream BrowserDocumentStore instance for namespace alpha.browser.documents.v1 | Verdict: KEEP (optionally MERGE into domain-document.ts)
- Importers: 21 (calendar-store, development-*, digest-*, hosted-results, json-domain-document, notification-store, preference-documents, reminder-store, voice, workflow-drafts, workflow-notices, prototype/agent-adapter, prototype/agent-calendar-adapter, runtime/browser-notes-document, runtime/media-copy-intent, runtime/workflow-intents). Text/path pins: specs/quint/application/manifest.json; specs/quint/refinement/application/{account-sheet,browser-album-storage,calendar-preservation-confirmation,canonical-calendar-draft-handoff,media-copy-intent}.mjs and ~30 browser specs import `/src/browser/documents.ts` via page.evaluate; test/support/feature-parity.mjs (exact inventory).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1 | D13 | `../../../../.eliza/client-features/...` deep relative import. | `@eliza/packages/ui/src/platform/browser-document-store` alias. | Low. |

## Local types and helpers
| Name | Kind (type/interface/helper/const) | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| - | - | - | none | - |

## Proposed end state
Unchanged (path is imported by ~35 specs; moving it costs more than it saves). Estimated lines after: 4 (current 4).

## Verification
domain-atomicity.spec.ts, domain-initialization.spec.ts.
