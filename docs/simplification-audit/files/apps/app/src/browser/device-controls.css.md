# apps/app/src/browser/device-controls.css
- Lines: 14 | Role: styles for the development device-controls dialog | Verdict: MOVE to apps/app/src/dev/ with device-controls.tsx
- Importers: device-controls.tsx:16 dynamic import. Text/path pins: specs/quint/application/manifest.json (path); test/support/feature-parity.mjs (exact inventory).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2-14 | D6 | Dev-only stylesheet in browser/. | Move beside the dev component. | Update manifest + inventory paths. |
| 2 | 5-9 | C4 | `--dev-bg/--dev-fg/--dev-line/--dev-s2` variables exist only because the dialog is body-mounted and tokens are copied in device-controls.tsx:21. | Mount inside `.os` (dialog kit) and use `--bg/--fg` directly. | Low; the comment line 1 says the controls must stay visible on dark/locked screens, so keep explicit colours for `.alpha-dev-tools`. |

## Local types and helpers
| Name | Kind (type/interface/helper/const) | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| - | - | - | none | - |

## Proposed end state
Same 13 rules in dev/; dialog rules use theme variables directly once mounted in .os. Estimated lines after: 12 (current 14).

## Verification
test/browser/dev-controls-accessibility.spec.ts.
