# apps/app/src/passwords/password-manager.ts
- Lines: 330 | Role: Settings → Password manager over the shared plugin-native-passwords vault: client resolution (native / dev vault / none), unlock-window lifecycle, list/search, add/edit/delete, reveal/copy, damaged-vault reset, autofill status, and a test-mocks-only import/export ("transfer") section | Verdict: SIMPLIFY
- Importers: 2 app (prototype/settings-adapter.ts:40 — `leavePasswordEntry`, `leavePasswordManager`, `passwordEntryPage`, `passwordManagerGroups`, `passwordManagerLifecycle`, `refreshPasswordManager`, `PASSWORD_PAGES`; prototype/agent-adapter.ts:42 — `passwordSurfaceOpen`). Bundled whole by test/password-manager.test.mjs:14, test/password-manager-fences.test.mjs:22, test/password-manager-hidden.test.mjs:22; in-page import in test/browser/password-manager.spec.ts:290,294.
- Text/path pins: test/settings-truth.test.mjs:217-219 regex-matches the exact text `export function leavePasswordEntry() { clearSecrets(); }` and `function clearSecrets() { if (draft) draft.password = ''; draft = null; }` (T1 — any formatting change of lines 62/141 breaks it); test/support/login-surfaces.mjs:146-147 pins the pattern `input\(helpers\.ic, 'Password',[^\n]*'password'` (line 305); test/login-surfaces.test.mjs:336 asserts no `console.*` in this file; vite.config.ts:33,80 treats this file as the only importer allowed to receive the dev-vault stub; specs/quint/refinement/application/contracts.mjs:95,107 (`sourceContext([...], ['passwordSurfaceOpen'])`) and vault-coordinator.mjs:25,50 (sourceContext of the exported API names); specs/quint/application/manifest.json:389; test/support/feature-parity.mjs:336.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8, 54-60, 133-136, 245-263 | A3 | Password import/export: `transferClient()` returns null unless `testMocksEnabled && isNativePlatform() && isPluginAvailable('ElizaPasswordTransfer')`; the "Import passwords"/"Export passwords" rows and the `name === 'export'`/`'import'` notice overrides in `run()`. The PRD rules out import/export (docs/prd.md:56-58); android ResetPolicyInstrumentedTest.java:33 asserts the plugin is absent in product builds | Delete the import (line 8), `transfer`/`transferClient` (54-60), the two notice lines in `run` (133-136) and the transfer group (245-263); delete the transfer cases in test/browser/password-manager.spec.ts (fixture lines ~125-137, steps ~205-225) and the `PasswordTransferPlugin` registration at android MainActivity.java:360 | Medium — owner decision already listed in research n–z §3 ("Medium (owner)"); ~31 lines here |
| 2 | 7-10 | D13 / research P18 | Four direct `../../../../vendor/eliza/plugins/plugin-native-passwords/src/*` imports; plugin-native-passwords is not in `.eliza/client-features/plugins/` | Project the plugin's client sources and import via an alias (same action as dev-vault.ts) | Medium (projection tooling) |
| 3 | 23, 164-171 | C1 | `type Bag = Record<string, any>` (one of ~60) and `interface Helpers { ...; ic: Bag }` | Import the shared view-row type (types.md); type `ic` as `Record<string,string>` | Low |
| 4 | 167-171 | C3 | Row builders `nav`, `button`, `input`, `captioned` produce the template's `kNav`/`kBtn`/`kInput` row shapes; settings-adapter.ts:763,775 and native-adapter.ts:335 define their own `nav`/`action` builders for the same `kNav` shape, model.js:5060 `stRow('kInput', ...)` | One settings-row factory module (e.g. `prototype/settings-rows.ts`) exporting `navRow`, `buttonRow`, `inputRow`, `group`; pass it instead of the partial `Helpers` | Medium: row shape is consumed by template.html; keep field names (`kNav`, `lbl`, `chev`, `noAB`, `hasSub`, `trailCss`, ...) exactly |
| 5 | 28-40 | D3 | 16 module-level `let` variables (`client`, `resolving`, `status`, `entries`, `query`, `busy`, `notice`, `draft`, `generation`, `lifetime`, `operation`, `active`, `damaged`, `confirmReset`, `expiry`, `browserFill`, `notify`, `toast`, `toasted`) form one hidden state object | Group them in one `const state = {...}` with a `reset()` used by `leavePasswordManager` (line 146 resets six of them by hand) | Medium: three fence tests (password-manager-fences/hidden) rely on the generation/lifetime/operation semantics — keep the counters exactly |
| 6 | 147, 225 | B1 | `void resolveClient().then(vault => vault?.lock()).catch(() => {})` and `await v.lock().catch(() => {})` swallow native lock failures | Keep both (leaving must never throw; the native side enforces the unlock window independently — comment at :104) but add a one-line comment, or route to runtime/crash-log.ts | Low |
| 7 | 82 | B1 | `catch { if (current()) browserFill = null; }` — maps any failure to "Unavailable" | Keep: that is the specified display ("Browser autofill: Unavailable"); add the reason in a comment | None |
| 8 | 80 | C2 | `registerPlugin<{ loginFillStatus(): ... }>('AlphaBrowser')` — `AlphaBrowser` is also registered as `registerPlugin<any>` in prototype/browser-adapter.ts:23 and with a web implementation in browser/register.ts:40 | Typed `AlphaBrowser` handle in `native/plugins.ts` | Low |
| 9 | 159 | D7, A7 | `export const passwordManagerHoldsEntries` — no app importer; read only by test/password-manager*.test.mjs (13 asserts) and test/browser/password-manager.spec.ts:290,294 | Keep only if those fence tests stay (they cover a real secret-retention rule); otherwise drop the export with the tests. Mark it test-only in a comment if kept | Low |
| 10 | 25-26 | — | `PASSWORD_PAGES` and `passwordSurfaceOpen` are real cross-module API (settings-adapter.ts:726,899; agent-adapter.ts sensitive-observation rule, pinned by test/login-surfaces.test.mjs) | Keep | — |
| 11 | 167, 194, 219-229, 302 | D8 | Lines of 200-500 characters (row builders, `vault.save({...})`, reset confirm block, length segment) | Format when touching; keep line 305's pinned pattern on one line or update login-surfaces.mjs | Low |
| 12 | 215 | — | `status.reason === 'no-screen-lock' ? 'Needs screen lock' : 'Unavailable'` user copy | keep | — |

No A1/A4 issues beyond the transfer block. B2: `Capacitor.isNativePlatform()` checks gate a real browser/Android split — fine.

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `Bag` | type | 23 | ~60 files (research n–z P10) | shared view-row type |
| `Draft` | type | 24 | none | stays |
| `Helpers` | interface | 164 | the helper bag built in prototype/settings-adapter.ts for this call | shared settings-row factory module |
| `nav` | helper | 167 | settings-adapter.ts:763, native-adapter.ts:335 | `prototype/settings-rows.ts` |
| `button` | helper | 168 | settings-adapter.ts:775 `action` | `prototype/settings-rows.ts` |
| `iconInfo` | helper | 169 | none | stays or rows module |
| `input` | helper | 170 | model.js:5060 `stRow('kInput', ...)` | `prototype/settings-rows.ts` |
| `captioned` | helper | 171 | none | rows module |
| `transferClient` | helper | 56-60 | none | delete (A3) |

## Proposed end state
~295 lines: no transfer code, imports through a projected alias, one `state` object with `reset()`, row builders imported from a shared settings-rows module, comments on the two deliberate lock catches. The pinned `leavePasswordEntry`/`clearSecrets` text either preserved verbatim or test/settings-truth.test.mjs:217-219 deleted (T1). Splitting further (client/lifecycle vs page rendering) is optional; at ~295 lines the file is cohesive.

## Verification
test/password-manager.test.mjs, test/password-manager-fences.test.mjs, test/password-manager-hidden.test.mjs, test/settings-truth.test.mjs, test/login-surfaces.test.mjs, test/browser/password-manager.spec.ts; quint application CredentialVault and vault-coordinator refinements; Android build + `scripts/audit-production-bundle.ts` (no dev vault, no transfer UI in production); android ResetPolicyInstrumentedTest (device-only).
