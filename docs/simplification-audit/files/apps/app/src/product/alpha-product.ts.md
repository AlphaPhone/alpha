# apps/app/src/product/alpha-product.ts
- Lines: 73 | Role: validates the registration (`ALPHA_PRODUCT`), builds Alpha's view registry for the MVP availability policy and exposes navigation answers (`alphaViewKey`, `alphaCanonicalViewId`, `alphaViewPaths`, `alphaViewPath`) plus theme helpers | Verdict: KEEP (minor trims)
- Importers: 6 app (main.tsx:82, prototype/agent-adapter.ts:71, prototype/home-shell.ts:5, prototype/model.js:18, prototype/voice-adapter.ts:10, runtime/view-navigation.ts:9); tests via tsImport: chat-navigation-detent, development-voice-navigation, voice-prepared-navigation (`alphaNavigation`), home-agent-navigation, voice-completed-action-context, product-identity (`alphaThemeVariables`), fixtures/cloud-voice-view.mjs, quint-back-dispatch.test.mjs:32.
- Text/path pins: specs/quint/refinement/application/launcher-favorites.mjs:11,34 compiles `export {alphaNavigation, ALPHA_PRODUCT} from './apps/app/src/product/alpha-product.ts'`; specs/quint/application/manifest.json:2095. (Not in the feature-parity inventory.)

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 64-67 | A3 (conditional) | `alphaPaletteColor(name)` has one caller: prototype/model.js:3995 (`c.fg === alphaPaletteColor("--alpha-black")`, a Wallet card chip colour) | If Wallet is removed (A3), delete `alphaPaletteColor`; otherwise keep | Owner |
| 2 | 71-73 | D4 | `alphaThemeVariables(appearance)` is a one-line pass-through to `mobileShellThemeVariables(ALPHA_PRODUCT, appearance)`; one app caller (model.js:5730) and test/product-identity.test.mjs:145 | Keep (it binds the product record so model.js does not import the registration); acceptable shim — note only | — |
| 3 | 24 | D7 | `export function alphaNavigation(available)` — the app uses only the instance built at :55; the factory is exported for three host tests and the launcher-favorites quint harness that pass their own availability | Keep (the quint model needs it); no change | — |
| 4 | 56-60 | D4 | Five `export const alphaX = navigation.x` aliases | Keep — they are the stable call names used by 6 app files and tests | — |
| 5 | 25-26, 38-41 | A8 | Comments are current-behaviour descriptions ("keeps accepting the paths it was accepted with before the shared registry") — borderline changelog | Rephrase as "also accepts `/<id>` and `/apps/<id>`" | None |
| 6 | 16 | — | Uses the `@elizaos/ui/mobile-shell/core` alias — the model for D13 | keep | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `alphaNavigation` | helper | 24-52 | hard-coded view-id mapping runtime/view-navigation.ts:83 (research n–z §6.6) duplicates part of `viewKey` | stays; view-navigation should call it |
| `alphaPaletteColor` | helper | 64-67 | none | delete with Wallet |
| `alphaThemeVariables` | helper | 71-73 | upstream `mobileShellThemeVariables` | stays |

## Proposed end state
~65-70 lines; same exports minus `alphaPaletteColor` if Wallet goes; comments describe current behaviour only.

## Verification
test/home-agent-navigation.test.mjs, chat-navigation-detent, development-voice-navigation, voice-prepared-navigation, voice-completed-action-context, product-identity, quint-back-dispatch; quint launcher-favorites refinement; `npm run verify`.
