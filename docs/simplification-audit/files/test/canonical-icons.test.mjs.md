# test/canonical-icons.test.mjs
- Lines: 26 | Kind: source-text + transplant (hashes asset files, slices the `IC` literal out of `model.js` and evals it in `vm`) | Verdict: REWRITE as a check mode of `scripts/vendor-lucide-icons.ts` (asset provenance) and delete the rest
- Covers: published Lucide SVGs match their recorded sha256/licence, the icon catalog keys equal `model.js`'s `IC` map, every SVG has the stroke attributes, and the template has no inline stroke-width. Duplicates: `test/browser/canonical-icons.spec.ts` (rendered glyphs per view, light/dark; the file itself says so on line 6). Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 15-20 | T2/D7 | Slices `var IC = {` … `\n};` and the `IC.x = IC.x || "…"` extension lines out of `model.js` and runs them in `vm`. Breaks on any reformat or the `model.js` split. | Delete. If `icon-catalog.json` is the authority, `model.js` should import it and the equality is then true by construction. | Low |
| 2 | 11, 21 | T1/B5 | Exact-constant assertions: package version `1.18.0`, licence string, `length === 148`. Every icon addition edits the test. | Delete. | None |
| 3 | 12-13, 23-24 | B5 | Asset sha256 / licence sha256 / stroke-attribute checks are a real provenance rule (licence audit), but they belong to the tool that writes `source.json`. | Add `--check` to `scripts/vendor-lucide-icons.ts` (re-derive and compare) and run it from `verify`. | Low |
| 4 | 25 | T1 | Regex over `template.html` for inline `stroke-width`. Style lint, not behaviour. | Delete. | None |

## Proposed end state
Host test deleted. `scripts/vendor-lucide-icons.ts --check` verifies hashes and licence against `source.json` in
`verify`; rendered icons remain covered by `journeys/home-shell.spec.ts` (from `canonical-icons.spec.ts`).
