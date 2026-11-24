# apps/app/src/browser/revision.ts
- Lines: 2 | Role: random 256-bit hex id generator | Verdict: KEEP (grow into lib/crypto.ts)
- Importers: 16 browser modules. Text/path pins: specs/quint/application/manifest.json; refinement browser-hosted-result-notice.mjs; test/calendar-empty-bootstrap-repro.test.mjs; test/support/feature-parity.mjs (exact inventory).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2 | C3 | Random-hex twin in runtime/connection-ui.tsx:1488,1555; SHA-256-hex has ~25 twins with no home. | Add `sha256Hex(value)` beside `revision()` (or move both to apps/app/src/lib/crypto.ts and re-point imports). | Low; Quint harness pins this path. |

## Local types and helpers
| Name | Kind (type/interface/helper/const) | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| revision | helper | 2 | runtime/connection-ui.tsx:1488,1555 | here / lib/crypto.ts |

## Proposed end state
revision() + sha256Hex() + bytes/base64 helpers (or lib/crypto.ts). Estimated lines after: 6 (current 2).

## Verification
any spec; Quint browser-hosted-result-notice.
