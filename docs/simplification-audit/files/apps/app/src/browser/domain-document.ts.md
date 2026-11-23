# apps/app/src/browser/domain-document.ts
- Lines: 96 | Role: BrowserDomainDocument: per-domain read/edit/capture/restore/reset over the upstream store with a frozen legacy localStorage shadow envelope | Verdict: SIMPLIFY
- Importers: 24 (calendar-store, development-*(6), device-preferences, digest-*, domain-recovery, hosted-results, json-domain-document, notification-store, preference-documents, reminder-store, workflow-drafts, workflow-notices, runtime/assistant-draft-store, runtime/browser-notes-document, runtime/google-agent-access, runtime/media-copy-intent, runtime/native-assistant-draft-recovery, runtime/workflow-intents). Text/path pins: specs/quint/application/manifest.json; refinement harnesses domain-document-creation.mjs, browser-deletion-poll.mjs, browser-hosted-result-notice.mjs, google-access-publication.mjs, storage.mjs; test/quint-domain-document-creation.test.mjs; test/calendar-connect-policy.test.mjs + calendar-empty-bootstrap-repro.test.mjs (read source); test/browser/domain-atomicity.spec.ts, domain-initialization.spec.ts; test/support/feature-parity.mjs (exact inventory).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-16, 24-26, 36-49, 58-69, 78-95 | A1 | `{version:1,legacy,value}` envelope, `legacy:()=>string\|null` reader and `unchanged(...)` checks on every read/edit/restore/reset; no code writes any `alpha.browser.*` legacy key (research P2; git grep localStorage.setItem). | Reduce to `{read, readRaw, edit, capture, restore, reset}` over raw values: no envelope, no `legacy`, `DomainRecovery={snapshot,raw}`. Bump to a new document key or clear once. | HIGH coordination: 20 call sites drop the 3rd constructor arg; Quint domain-document-creation + browser-deletion-poll encode the envelope; owner sign-off on pre-Oct data (§7 Q1). |
| 2 | 2-8 | C1 | `Snapshot` and `Documents` re-declare upstream `BrowserDocumentSnapshot`/`BrowserDocumentStore`; note-recording-journal.ts:1-2 declares them a third time. | Import upstream types. | None. |
| 3 | 62 | D10 (P9) | Generic class throws device-specific copy `'Device settings changed. Review the current choice and try again.'`. | Generic message (e.g. "Settings changed. Review and try again.") or injected text; device-preferences is the only `expected` user (device-preferences.ts:32). | Low; check specs asserting the text (google-access-publication, device-storage-migration). |
| 4 | 71 | B4 | `if(raw===undefined)throw` — JSON.stringify of a parsed object never yields undefined unless initial() returns undefined. | Keep only if a caller can return undefined; otherwise delete. | Low. |

## Local types and helpers
| Name | Kind (type/interface/helper/const) | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| Snapshot | type | 2 | note-recording-journal.ts:1; upstream BrowserDocumentSnapshot | import upstream |
| Documents | type | 3-8 | note-recording-journal.ts:2; upstream BrowserDocumentStore | import upstream |
| Envelope | type | 9 | none | delete |
| DomainRecovery | type | 10-16 | used by 10 files | stay, reduced |

## Proposed end state
~35 lines: class wraps upstream store with parse/stringify, edit with optional expected snapshot, capture (snapshot+raw, unrecognized flag only if still needed), restore, reset. No legacy. Upstream types imported. Estimated lines after: 40 (current 96).

## Verification
test/browser/domain-atomicity.spec.ts, domain-initialization.spec.ts, test/quint-domain-document-creation.test.mjs, Quint refinement harnesses above, plus every *-migration spec (most become deletions under A1).
