# test/theme-palette.test.mjs
- Lines: 53 | Kind: source-text lint (T1); imports the product record only to read `theme.palette` | Verdict: DELETE (owner question: keep the hex rule as a lint step)
- Covers: no hex colour literals in six prototype files (`template.html`, `development-rail.html`, `development-system-surfaces.html`, `model.js`, `phone.css`, `scan-dialog.css`), every `var(--alpha-…)` used is defined, every palette entry is used, palette values are uppercase hex. Duplicates: none. Callers/importers: `npm test`. Research classed it as "imports a real app module (B)"; it is a text lint.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-30 | T1 | Regex scan of source files with a hand-rolled comment stripper (lines 15-21). | Delete; if the owner wants the rule, express it as a stylelint `color-no-hex` rule on CSS plus the `npm run lint` step, not a node test. | low |
| 2 | 32-45 | T1, A7 | "Defined" is guessed by regex over `dock-clearance.ts`, `browser-adapter.ts`, `main.tsx`; "unused palette entry" is a dead-resource check. | Delete; unused palette entries are A7 candidates found once by grep. | none |
| 3 | 47-53 | B3 | Re-validates the format of constants in our own record. | Delete. | none |
| 4 | 14 | A8 | Comment cites issue numbers. | Goes with the file. | none |

## Proposed end state
Deleted. Owner question: is "no hex colours outside the palette" a rule worth a lint config? If yes, one stylelint/eslint
rule in the lint step; the record's palette stays the single source.
