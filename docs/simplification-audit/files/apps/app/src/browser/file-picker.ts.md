# apps/app/src/browser/file-picker.ts
- Lines: 15 | Role: one-owner-at-a-time file picker wrapper and hidden <input type=file> helper | Verdict: KEEP
- Importers: 3 (files.ts, prototype/note-source-adapter.ts, prototype/scan-document.ts). Text/path pins: specs/quint/services/manifest.json; refinement services/system-picker-visibility.mjs, scan-source-conformance.mjs, application/note-source-dialog.mjs; test/quint-system-picker-visibility.test.mjs, test/scan-document-drafts.test.mjs; test/support/feature-parity.mjs (exact inventory).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5, 8 | C4 | Retire set (`alpha-back` capture, pagehide, alpha:device-state) — same pattern as dialogs. | Use shared `onRetire` helper when the kit exists. | Low. |
| 2 | 7 | C3 | `error instanceof DOMException&&error.name==='AbortError'` — isAbortError twin (C3 list). | Use shared `isAbortError`. | None. |

## Local types and helpers
| Name | Kind (type/interface/helper/const) | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| isAbortError (inline) | helper | 7 | simulated-workflows.ts:83 and ~10 runtime files | apps/app/src/lib/abort.ts |

## Proposed end state
Unchanged behaviour, uses shared retire/abort helpers. Estimated lines after: 14 (current 15).

## Verification
test/quint-system-picker-visibility.test.mjs, files-picker specs.
