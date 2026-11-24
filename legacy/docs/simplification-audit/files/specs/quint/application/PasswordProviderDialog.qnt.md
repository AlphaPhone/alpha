# specs/quint/application/PasswordProviderDialog.qnt
- Lines: 141 | Kind: Quint model (live; bundle-and-replay harness) of a DEVELOPMENT surface | Verdict: KEEP (with dev code; D6/D20)
- Covers: Development-only password provider dialog: admitted only under the browser dev profile, one dialog bound to the settings revision, hide/lock ends it, sample sign-in only when unlocked and selected. Duplicates: test/browser/dev-password-provider.spec.ts and password-provider-storage.spec.ts drive the same dialog end to end. Callers/importers: manifest row (browser/password-provider.ts, dev-profile.ts, preference-documents.ts; 9 symbol pins, `browserDevProfile` twice); harness specs/quint/refinement/application/password-provider-dialog.mjs (loadBundled with stubbed dev-profile/preference-documents: import-based); wrapper test/quint-password-provider-dialog.test.mjs

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-3 | D6 | Code is dev-only (C21 keeps `password-provider.ts`, moved behind `dev/`). D20: keep code and proof together. | Keep; update source path when the file moves to `dev/`. | L |
| 2 | manifest symbols | T10 | `browserDevProfile` pinned twice; `validate`, `opening`, `dismiss`, `revision` are local names. | Drop symbol pins. | L |
| 3 | harness | - | Import-based already. | Keep. | L |
| 4 | policy | owner | A formal model of a dev-only dialog that holds sample data is high cost for low value; the Playwright specs cover it. | Owner question: retire model and harness with the dev surface instead. | L |

## Proposed end state
Model unchanged, file pin follows the move to `apps/app/src/dev/`; or deleted with its harness if the owner prefers e2e-only coverage for dev surfaces.
