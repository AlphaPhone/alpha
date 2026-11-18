# test/runtime-licenses.test.mjs
- Lines: 301 | Kind: tooling integration (real `scripts/generate-licenses.ts`, `agent-bundle-dependencies.ts`, `licence-policy.ts` on a synthetic staged runtime in a temp dir) | Verdict: MERGE with `test/sbom.test.mjs` into `test/release-licences.test.mjs`
- Covers: the on-device notices list Bun (LGPL JavaScriptCore notice, source offer) and every bundled agent/worker package; tampered or missing dependency inventory fails generation; copyleft/unknown/text-less packages are flagged, not errors. Duplicates: `test/sbom.test.mjs` builds the same staged-runtime fixture (sbom.test.mjs:166-203) and checks notice/SBOM agreement. Callers/importers: `npm test` glob. Research said "F+A … python unittest": wrong, there is no Python here.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 22-59 | C3 | `stagedRuntime()` fixture duplicated (smaller) in `sbom.test.mjs:166-203`. | One shared fixture in the merged file. | Low |
| 2 | 69-77 | A1 | "cannot silently fall back to legacy bundle comments" names a removed legacy reader; the remaining assertion (missing inventory fails) is the same as test at 258-266. | Merge into the missing-inventory case. | Low |
| 3 | 92-120 | B3 | Eight tamper mutations of an inventory the same build just wrote. Keep two (bundle hash, package identity) and the escape-by-symlink case. | Trim. | Low |
| 4 | 130-140 | T1-ish | Ten regexes on notice prose. Keep the legal facts (LGPL, corresponding-source URL, relink); drop wording checks. | Trim. | Low |
| 5 | 275-287 | T9 | Assertion branches on whether this checkout currently has a staged runtime. | Make it deterministic with the temp fixture, or drop. | Low |
| 6 | 289-301 | D8 | Dense single-line statements. | Reformat on merge. | Low |

## Proposed end state
`test/release-licences.test.mjs` holds one staged-runtime fixture and ~8 cases: packaged notices (Bun + bundle + worker
+ Google host), flag policy table, broken input fails, missing inventory fails, tamper refused, source offer, no
runtime = umbrella entry only, plus the SBOM cases from `sbom.test.mjs`. Gates a release (notices ship in Settings).
