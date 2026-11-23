# test/password-dev-editor.test.mjs
- Lines: 10 | Kind: unit (esbuild bundle of `apps/app/src/passwords/dev-vault.ts`, imported as a `data:` module) | Verdict: DELETE
- Covers: the development vault refuses the native password editor (`openEditor` rejects `unavailable`) without changing records. Duplicates: `test/browser/password-manager.spec.ts:28,87,286` and `test/browser/dev-password-provider.spec.ts` drive the development vault through the UI. Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-10 | T3 / D6 | Unit test of a developer-only surface (exists only with dev surfaces / test mocks, AGENTS.md); asserts one refusal path of a fake. | Delete. | None |
| 2 | 4-5 | C3 | Another inline esbuild-then-`data:` loader (tests-host.md P-loader row). | Gone. | None |

## Proposed end state
File deleted. If the dev vault must never offer the native editor, the Settings journey (`journeys/settings.spec.ts`, dev-surface project) asserts that no "Edit in Android" control appears for the development vault.
