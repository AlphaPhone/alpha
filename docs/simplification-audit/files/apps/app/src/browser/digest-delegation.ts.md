# apps/app/src/browser/digest-delegation.ts
- Lines: 25 | Role: pure dev-fake delegation state machine (start/status/complete/cancel/revoke) | Verdict: MOVE to apps/app/src/dev/
- Importers: 2 (development-digest-document.ts, development-digests.ts). Text/path pins: inventory only; test/support/feature-parity.mjs (exact inventory).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2 | A7 | `export type DevelopmentGrant` has no importer outside this file (git grep -w: 0). | Unexport. | None. |
| 2 | 11 | C3 | `/^[a-f0-9-]{36}$/` UUID-ish regex; same in digest-authorization-document.ts:13, files.ts:29-30. | `isUuid` in lib/ids.ts. | None. |

## Local types and helpers
| Name | Kind (type/interface/helper/const) | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| kinds | helper | 5 | digest-authorization-document.ts:14 (same kinds check) | share one `readScopeKinds` in dev module |

## Proposed end state
Unchanged logic in dev/, unexported type, shared kinds/uuid helpers. Estimated lines after: 24 (current 25).

## Verification
dev-digest-*.spec.ts.
