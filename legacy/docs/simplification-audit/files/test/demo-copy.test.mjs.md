# test/demo-copy.test.mjs
- Lines: 43 | Kind: test 1 source-text (walks `apps/app/src`, regex for string literals containing "MVP" or "deferred from the MVP"); test 2 mixed: source-text over `model.js` + tooling (runs `auditWebBundle` from `scripts/audit-production-bundle.ts` on a temp bundle) | Verdict: MERGE test 2's audit-fixture half into `test/tooling/apk-verify-audit.test.ts`; DELETE the rest, moving the "MVP" rule into the bundle audit
- Covers: internal scope wording ("MVP", "deferred from the MVP") never reaches users as copy; the unavailable-app copy is plain; the production bundle audit refuses the retired wording. Duplicates: `scripts/audit-production-bundle.ts:73` already denylists `deferred from the MVP` on the real build output. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-27 | T1 | Source scan: a release copy rule enforced on source instead of build output; also flags dev-only strings that never ship. | Add a `\bMVP\b` string-literal rule to the bundle audit DENYLIST (owner confirms no shipped string legitimately contains it) and delete the scan. | Low |
| 2 | 30-33 | T1 | `model.js` contains four exact copy strings. | Delete; the copy is visible in `journeys/home-shell.spec.ts` when opening an unavailable app. | Low |
| 3 | 34-42 | — | Audit refuses a fixture bundle with the wording: a test of release-gating tooling. | MERGE into `test/tooling/apk-verify-audit.test.ts` as one denylist case. | Low |
| 4 | 1-2 | A8 | Header narrates an owner decision date and "investor demo". | Drop with the file. | Low |

## Proposed end state
File deleted. The audit test gains one denylist case; the audit's DENYLIST gains the "MVP" rule so the gate runs on the
real bundle (`npm run verify` and `verify-apks`).
