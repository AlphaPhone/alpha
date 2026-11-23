# test/avatar-initials-audit.test.mjs
- Lines: 38 | Kind: tooling (imports `scripts/audit-production-bundle.ts`, runs `auditWebBundle` on a temp bundle dir) | Verdict: MERGE into `test/production-bundle-audit.test.mjs`
- Covers: the production bundle audit fails on any hard-coded avatar-initials badge (raw markup or JSON-escaped), and ignores ordinary text and data-bound initials. Duplicates: none for this rule; `test/production-bundle-audit.test.mjs` tests the other rules of the same audit. Callers/importers: `npm test`. The audit gates release (AGENTS.md).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 20, 29 | A8, T1 | `'PENDING_AVATAR_INITIALS' in audit` and `'pendingAvatarInitials' in former` check that a removed allowance stays removed: a tombstone test. | Drop both assertions. | — |
| 2 | 10-15 | — | The detector cases (raw, JSON-escaped, ordinary text, `{{e.initials}}`) are the useful part. | Carry. | — |
| 3 | 19-38 | — | The "former MC, JP and +2" wording is history. Keep one bundle with two badges and one JSON-escaped badge. | Shorten when moving. | — |
| 4 | 17 | D8 | Destructures after first use (`avatarInitials` is used at line 11, bound at line 17; works only because tests run later). | Import named symbols at the top. | — |

## Proposed end state
Two cases in `test/production-bundle-audit.test.mjs`: the detector table and "a bundle with hard-coded initials fails the audit with one finding per badge".
