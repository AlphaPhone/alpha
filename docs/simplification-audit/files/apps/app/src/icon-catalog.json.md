# apps/app/src/icon-catalog.json
- Lines: 174 | Role: data — pinned lucide-react 1.18.0 icon map (`ic` 148 template keys → lucide names, `aliases` 1, `extra` 6, `filled` 7) | Verdict: KEEP
- Importers / references: `icon-style.ts:2`, `prototype/model.js:5`, `scripts/vendor-lucide-icons.ts:16,29-32` (vendors the SVGs into `apps/app/public/icons/lucide`), `test/canonical-icons.test.mjs:14`, `test/fixtures/workflow-execution-markup.mjs:14`, `test/automations-unified.test.mjs`. Every key is consumed (public SVGs exist per research browser §5).

Note: `icon-style.ts:3` and `scripts/vendor-lucide-icons.ts:29` both compute `new Set([...Object.values(catalog.ic),...catalog.extra])` (C3, trivial). A generated `type IconName` from this file would let `icon-style.ts` drop its runtime throw (B3).
