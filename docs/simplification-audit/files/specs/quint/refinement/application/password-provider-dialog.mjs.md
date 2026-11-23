# specs/quint/refinement/application/password-provider-dialog.mjs
- Lines: 129 | Kind: Quint scenario/witness/random replay against the bundled real module in JSDOM (import-based) | Verdict: KEEP
- Covers: the development password-provider dialog `openPasswordProvider` (`apps/app/src/browser/password-provider.ts`): production refuses, install/select/fill, external settings changes close the dialog, hide/lock aborts opening, failed save needs reopen. Model `PasswordProviderDialog.qnt`. The dev simulator is retained (D6/D19: a retained spec, `test/browser/password-provider-storage.spec.ts`, drives it); D3 deletes password import/export, not this dialog.
- Duplicates: `test/browser/password-provider-storage.spec.ts` covers storage of the same dialog in Chromium (partial T4). Callers: `test/quint-password-provider-dialog.test.mjs`, manifest row `manifest.json:5526`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 24-26 | — | Loads the real module with two stubbed imports (`./dev-profile`, `./preference-documents`). Good shape. | None. | — |
| 2 | 14 | C5 | Uses `browser-model-traces.mjs`, the third replay engine. | Merged helper. | Low. |
| 3 | 24 | D6 | Path changes when Stage F moves the dev simulator to `apps/app/src/dev/`. | Update path with the move. | Low. |

## Proposed end state
Unchanged except for the helper merge and the dev-folder path.
