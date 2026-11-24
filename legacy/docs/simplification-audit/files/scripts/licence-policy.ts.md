# scripts/licence-policy.ts
- Lines: 223 | Kind: shared release-tooling library (licence classification + notice text) | Verdict: KEEP (SIMPLIFY)
- Covers: SPDX expression parsing, per-licence flag classification, plain-words obligation notes and `LICENCE FLAG` lines used by the notices, SBOM and APK verification. Duplicates: none (the only `canonicalId` elsewhere, `apps/app/src/product/alpha-product.ts`, is an unrelated view-id helper). Callers/importers: `scripts/generate-licenses.ts`, `generate-sbom.ts`, `verify-apks.ts`, `audit-production-bundle.ts`, `font-license-blockers.ts`, `release-blockers.ts`; tests `test/licenses.test.mjs`, `font-license.test.mjs`, `runtime-licenses.test.mjs`, `sbom.test.mjs`; comment references in `qualify-head.ts`, `apps/app/src/prototype/settings-adapter.ts:52`, `licenses/README.md`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 42 | A7 | `SOURCE_OFFER_MISSING` is exported and the comment at 37-39 says "the licence review reports SOURCE_OFFER_MISSING", but whole-repo grep finds no importer and no other use. Either the review message was never wired or was removed. | Delete the constant and the sentence, or (owner) wire it into `generate-licenses.ts` where the Bun notice is built. | Low; behaviour question only if the owner expected the warning. |
| 2 | 41, 61-91, 97 | A7 | `SOURCE_OFFER_FILE`, `identifierFlags`, `licenceAlternatives`, `PERMISSIVE`, `PERMISSIVE_NOT_PREVIOUSLY_LISTED` are exported but only used inside this file. | Drop `export` from them. | None. |
| 3 | 201-213 | B3 | `licenceFlagLines` / `licenceFlagRecords` re-check `Array.isArray(entries)` and `Array.isArray(entry?.flags)` on parameters already typed `readonly FlaggedNotice[]`. | Iterate directly (`entry.flags ?? []`). | None; all callers are typed TS in this repo. |
| 4 | 4-32 | A8 | Two comment blocks narrate decision dates/IDs (P-09, A-21, 2026-10-10) and duplicate what `font-license-blockers.ts:20` and `release-blockers.ts:13` restate. | Keep one short statement of the rule here; drop dates and the restatements in the other files (point to this constant). | None. |
| 5 | 33 | A4 | `UNRESOLVED_FONT_LICENCE_BLOCKS_DISTRIBUTION = false` is a constant switch that keeps a strict branch alive in `font-license-blockers.ts`, `release-blockers.ts`, `verify-apks.ts`. It is an explicit owner policy switch, so it stays (D8 only covers switches with no requirement). | KEEP; note it in DECISIONS as an intended switch. | n/a |
| 6 | 115-116, 121 | D8 | Single-line `SEVERITY` map and JSDoc `@returns` duplicating the TS return type. | Drop the JSDoc type; format with Prettier in stage F. | None. |

## Proposed end state
One policy module (~190 lines): a short policy header, flag list, SPDX parser and classifier (non-exported internals),
`obligationNote`, and the three notice helpers without defensive array checks. Tests that import it
(`licenses.test.mjs`, `font-license.test.mjs`, `sbom.test.mjs`, `runtime-licenses.test.mjs`) are reviewed in their own
chunks; the integration value is in running `generate-licenses.ts` / `generate-sbom.ts` end to end, not in calling
`classifyLicence` directly. `SOURCE_OFFER_MISSING` either deleted or actually emitted (owner question).
