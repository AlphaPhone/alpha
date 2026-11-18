# apps/app/public/icons/lucide/source.json
- Lines: 727 | Role: generated provenance manifest for the vendored Lucide SVGs: package/version, sha256 of 136 upstream `dist/esm/icons/*.mjs` sources, sha256 + source of each of the 143 shipped SVG assets, licence hash, conversion note. Written only by `scripts/vendor-lucide-icons.ts:36`. | Verdict: KEEP (generated data)
- Importers: no product code reads it (git grep `source.json` / `icons/lucide/source`: only the SVG header comments). Readers: `test/canonical-icons.test.mjs:10-21` (asserts `package==='lucide-react'`, `version==='1.18.0'`, the exact `license` string, every asset sha256, sourceFiles hash shape, `licenseSha256`, and that `assets` keys equal `icon-catalog.json` ic+extra+filled). Generator `scripts/vendor-lucide-icons.ts` has no caller (manual regeneration tool, scripts.md:776). Verified now: 143 asset keys == 143 SVGs on disk; every asset `source` is in `sourceFiles` and vice versa.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2-3 | C6 | `"package": "lucide-react", "version": "1.18.0"` duplicates `apps/app/src/icon-catalog.json:2-3`; the generator copies them from the catalog and the test re-asserts both literals. | No edit to this generated file; the duplication is intentional provenance. In the test, compare against icon-catalog.json instead of the literal `'1.18.0'` (or delete per T1 below). | None. |
| 2 | 5-141 | B5 | `sourceFiles` (136 sha256s of upstream `.mjs` files) is only checked for shape (`/^[a-f0-9]{64}$/`) by canonical-icons.test.mjs; nothing can re-verify them without the upstream package. They are evidence of where geometry came from, read by no tool. | Keep as provenance (it is the audit trail for a vendored third-party asset) unless the owner accepts "package + version" as sufficient; then drop `sourceFiles` from the generator and this file (-137 lines). | Low. |
| 3 | — (tests) | T1 | `test/canonical-icons.test.mjs` re-hashes every SVG against this file and slices `var IC = {` out of `prototype/model.js` with `indexOf` and `vm.runInNewContext` (T2). tests-host.md:603 already recommends deleting it. | If deleted, the asset-hash check should move into the asset/licence audit (`scripts/audit-production-bundle.ts`) so a hand-edited SVG is still caught. | Medium: losing the only guard that SVGs equal the generator output. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| asset manifest shape `{source, sha256, fill?}` | type (data) | 143-723 | `scripts/vendor-lucide-icons.ts:28` `assets` record type | stays in generator |
| `package`/`version` | const | 2-3 | `apps/app/src/icon-catalog.json:2-3` | catalog is the source; this file copies it |

## Proposed end state
Unchanged (generated). 727 lines; 590 if owner drops `sourceFiles`. Any change goes through `scripts/vendor-lucide-icons.ts`, never by hand.

## Verification
`node --test test/canonical-icons.test.mjs`; `test/browser/canonical-icons.spec.ts` (rendered icons); `npm run verify`.
