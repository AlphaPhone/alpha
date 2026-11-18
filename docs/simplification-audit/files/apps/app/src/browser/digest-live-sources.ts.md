# apps/app/src/browser/digest-live-sources.ts
- Lines: 22 | Role: dev: bounded read of local Inbox/Calendar for development digests | Verdict: MOVE to apps/app/src/dev/
- Importers: 1 (development-digests.ts). Text/path pins: test/browser/dev-digest-live.spec.ts; test/support/feature-parity.mjs (exact inventory).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 15 | C6 | Literal `'alpha.dev.app.inbox'`; key builder exists in simulator-recovery.ts:8 (`key(name)`). | Import a `simulatorKey('inbox')` helper. | None. |
| 2 | 7 | D8 | One 430-char validation condition. | Split into named checks. | None. |

## Local types and helpers
| Name | Kind (type/interface/helper/const) | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| text | helper | 10 | none | stay |

## Proposed end state
Same logic in dev/ with shared simulator key helper. Estimated lines after: 21 (current 22).

## Verification
test/browser/dev-digest-live.spec.ts.
