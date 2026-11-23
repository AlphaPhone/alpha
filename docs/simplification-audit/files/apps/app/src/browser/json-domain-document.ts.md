# apps/app/src/browser/json-domain-document.ts
- Lines: 17 | Role: BrowserDomainDocument subclass storing JSON values inside a {raw} archive inside the envelope | Verdict: MERGE into domain-document.ts
- Importers: 14 (reminder-action-document, reminder-creation-document, prototype/inbox-unsaved, prototype/note-origin-adapter, runtime/{assistant-draft-store,calendar-linked-storage,calendar-sync-host,cloud-personal-intent,conversation-selection,inbox-local-store,note-audio-deletions,notes-folders,notes-trash,service-read-cache-store}). Text/path pins: specs/quint/application/manifest.json; test/browser/assistant-draft-recovery.spec.ts, inbox-unsaved-recovery.spec.ts; test/support/feature-parity.mjs (exact inventory).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4-9, 12 | A1 | `{raw}` archive exists only to preserve original legacy localStorage bytes (incl. null/malformed); JSON-in-JSON-in-JSON. | After A1, `readJson/editJson` become `read/edit` on BrowserDomainDocument with `initial=()=>null`; delete the class. | Coordinated: 14 importers rename calls; persisted format changes (needs key bump/clear). |
| 2 | 7 | B3 | Validator of the module's own archive shape. | Gone with the archive. | - |

## Local types and helpers
| Name | Kind (type/interface/helper/const) | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| Archive | type | 4 | none | delete |
| decode | helper | 6-9 | none | delete |

## Proposed end state
Deleted; importers use `new BrowserDomainDocument(browserDocuments,key)` with `read(()=>null)`/`edit`. If A1 is refused, keep as-is. Estimated lines after: 0 (current 17).

## Verification
assistant-draft-recovery.spec.ts, inbox-unsaved-recovery.spec.ts, notes-trash*.spec.ts, conversation-selection-storage.spec.ts.
