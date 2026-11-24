# scripts/vendor-lucide-icons.ts
- Lines: 40 | Kind: manual regeneration tool (writes `apps/app/public/icons/lucide/*.svg`, `LICENSE.txt`, `source.json` from an installed `lucide-react`) | Verdict: KEEP, add an npm alias and name it in the generated `source.json`
- Covers: reproducible vendoring of the 145 Lucide SVGs listed by `apps/app/src/icon-catalog.json`, with per-file source hashes and the licence. Duplicates: none. Callers: none (git grep of the name across repo, README, docs, package.json: no hit). It is the only way to regenerate the committed icons when the catalog changes.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | A7 | Undiscoverable: nothing names it. | Add `"icons:vendor": "node scripts/vendor-lucide-icons.ts"` and write `generator: "scripts/vendor-lucide-icons.ts"` into `source.json`. | None |
| 2 | 23 | C3 | Local SHA-256 helper. | `scripts/lib/hash.ts`. | None |
| 3 | 17–18 | C3 | Positional `process.argv[2]` with a throw. | Fine for a one-argument tool. | None |
| 4 | 39 | D8 | 400-character single-line `source.json` write. | Format as an object literal. | None |

## Proposed end state
Unchanged behaviour; npm alias; shared hash; `source.json` names its generator so the icons folder documents how to rebuild itself.
