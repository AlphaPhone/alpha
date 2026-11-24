# android/gradle/verification-reviewed-groups.json
- Lines: 150 (9.3 KB, of which ~6 KB is line 3) | Role: list of Maven publisher groups admitted by `scripts/gradle-verification.ts --check`, plus a free-text review log | Verdict: SIMPLIFY
- Importers: `scripts/gradle-verification.ts:62` (`REVIEWED_GROUPS`), reads only `.groups` (`:191`). Text/path pins: `test/gradle-verification.test.mjs:153-155` asserts `reviewedAt` is a date and that `groups` equals exactly the groups in `verification-metadata.xml`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3 | A8 | `"review": "Every group in android/gradle/verification-metadata.xml as generated on 2026-10-11 … Addition 2026-10-14 … Addition 2026-10-17 … Addition 2026-11-09 …"` is a ~6,000-character dated changelog of dependency admissions inside data. No code reads `review` (grep `\.review\b`: 0 hits in scripts/test). | Replace with one sentence stating the rule ("Publisher groups reviewed for android/gradle/verification-metadata.xml; SHA-256 pins are enforced by Gradle"); the per-addition history lives in git log / PR bodies. | None (no reader). |
| 2 | 4-149 | — | Groups list: verified exactly equal to the groups in `verification-metadata.xml` (python check: 0 unused, 0 unreviewed). | Keep. | — |
| 3 | 2 | B5 | `reviewedAt` is only asserted by the test to be a date. | Keep (cheap, the test pins it) or drop together with the assertion at `test/gradle-verification.test.mjs:154`. | Low |

## Local types and helpers
None.

## Proposed end state
Same file with `reviewedAt`, a one-sentence `review` and the 145-entry `groups` array. ~150 lines, ~3.3 KB.

## Verification
`node --test test/gradle-verification.test.mjs`; `npm run android:deps:check` (`scripts/gradle-verification.ts --check`).
