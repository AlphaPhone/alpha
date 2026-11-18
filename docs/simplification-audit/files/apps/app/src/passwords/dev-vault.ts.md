# apps/app/src/passwords/dev-vault.ts
- Lines: 63 | Role: in-memory synthetic `ElizaPasswordsPlugin` for the browser development profile (test-mocks builds only); stubbed to a throwing `createDevelopmentVault` in flag-off builds by vite.config.ts:33-34,80 | Verdict: MOVE to `apps/app/src/dev/` (D6) + SIMPLIFY
- Importers: 1 (passwords/password-manager.ts:6). test/password-dev-editor.test.mjs:4 bundles it; specs/quint/refinement/application/contracts.mjs:94 (`bundledSource`).
- Text/path pins: vite.config.ts:33-34 keys the stub on the specifier `'./dev-vault'` and vite.config.ts:80 applies it only when the importer is `passwords/password-manager.ts` (a move must update both); specs/quint/application/manifest.json:390; test/support/feature-parity.mjs:335; test/password-dev-editor.test.mjs:4.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-2 | D13 / research P18 | `from '../../../../vendor/eliza/plugins/plugin-native-passwords/src/definitions.ts'` and `.../bindings.ts` — direct `vendor/eliza` imports (the projection `.eliza/client-features` does not carry plugin-native-passwords; vite `server.fs.allow` does not list it either, research browser §3) | Project `plugin-native-passwords/src/{definitions,bindings,client,transfer}.ts` through `scripts/prepare-client-features.ts` and import via the alias; or add one `@elizaos/capacitor-passwords` alias | Medium: projection change touches upstream.lock-driven tooling |
| 2 | 25-34 | C4, D12 | `surface()` builds a `<dialog>` imperatively with two inline `style.cssText` strings, wires `oncancel`, appends to `.os`, `showModal()`, and a 30 s `setTimeout` — one of ~21 hand-built dialog lifecycles (research browser P4) | Use the shared dialog helper once it exists (browser/dialog-layout.ts already supplies layout); move the inline styles to a dev CSS class | Low (dev-only surface) |
| 3 | 33 | B1-adjacent | `setTimeout(done,30_000)` is never cleared when the user presses Hide; `done()` runs twice (harmless `remove()` of a detached node) | Clear the timer in `done` | None |
| 4 | 11 | C1 | `type Record_` — local record shape, trailing underscore to dodge the global `Record` | Rename `DevRecord` | None |
| 5 | 13 | C3 | `fail(code,message)` → `Object.assign(new Error(message),{code})` — the same coded-error constructor exists upstream (`passwordsError` maps codes) and in other dev simulators | Keep (dev-only, 1 line) or reuse an upstream coded-error factory if plugin-native-passwords exports one | None |
| 6 | 16-63 | D6 | Development/simulator code inside a product folder, kept out of production only by a vite stub keyed on importer path | Move to `apps/app/src/dev/password-vault.ts` together with the other dev simulators, behind the one dev dynamic import (D5). Update vite.config.ts stub key/owner, specs/quint/application/manifest.json:390, contracts.mjs:94, password-dev-editor.test.mjs:4, feature-parity.mjs:335 | Medium (several path pins) |

Contract to keep: no method resolves with a password; error codes `locked`, `invalid`, `unavailable` and their messages (asserted by test/password-dev-editor.test.mjs and the CredentialVault quint model).

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `Record_` | type | 11 | none | rename `DevRecord` |
| `UNLOCK_MS` | const | 12 | `unlockSeconds:60` literal on line 38 (same value) | derive `unlockSeconds: UNLOCK_MS/1000` |
| `fail` | helper | 13 | coded-error factories in browser/simulated-*.ts | stays (dev) |
| `display` | helper | 14 | upstream bindings `display` field computation | stays |
| `surface` | helper | 25-34 | ~21 imperative `<dialog>` builders (research browser P4) | shared dialog helper |

## Proposed end state
Same behaviour, ~55 lines, under `apps/app/src/dev/`, importing upstream types through the alias, no inline style strings, timer cleared on Hide.

## Verification
test/password-dev-editor.test.mjs; test/browser/password-manager.spec.ts (dev profile); quint application CredentialVault contracts refinement; `scripts/audit-production-bundle.ts` (dev vault strings must stay out of production bundles).
