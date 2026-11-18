# apps/app/src/prototype/fixtures.js
- Lines: 671 (54.5 KB) | Role: Seed data for the test-mocks simulated phone (people, calls, messages, mail, events, browser pages, 32 photo URLs, places, notes, contacts, files, wallet, workflows, settings, notifications, heads-up, voice demo, Home defaults, per-view scripted copy and canned replies). Only test-mocks builds bundle it; `vite.config.ts:21-22` resolves `./fixtures.js` to `fixtures.empty.js` otherwise. | Verdict: MOVE to `apps/app/src/dev/fixtures/` + SIMPLIFY (delete dead exports)
- Importers: `model.js:8-16` (all 53 exports; nothing else imports the module). `model.d.ts:5,7` documents it.
  Text/path pins: `vite.config.ts:21` (path of the swap); `test/browser/fixtures-empty-runtime.spec.ts:15` and `test/browser/shaw-ui-fixtures.spec.ts:73` (route-rewrite `/fixtures.js` → `/fixtures.empty.js`); `test/support/feature-parity.mjs:371`; `apps/app/src/prototype/README.md:11,24-25,37-38` (also names `test/fixtures-parity.test.mjs` and `test/fixtures-swap.test.mjs`, which do not exist). Fixture values are asserted indirectly by `test/home-views-model.test.mjs` (`PN_SCRIPT`, `MAPS_FAR`, `CT_SEED`), `test/notes-view-defaults.test.mjs` (`NOTES_SEED`), `test/history-initial-state.test.mjs` (`QUICK_SETTINGS`), `test/reset-wiring.test.mjs` (`COPY`), `test/agent-always-local.test.mjs` (`VOICE`), and Quint harnesses `specs/quint/refinement/application/shell-core-fixture.mjs`, `surfaces.mjs` (`PEOPLE`, `QUICK_SETTINGS`, `VOICE`, `PN_SCRIPT`).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 550-554 | A7 | `LOCK_SUM` — imported by `model.js:14` and used nowhere (`grep -cw LOCK_SUM model.js` = 1, the import) | Delete here, in `fixtures.empty.js:69` and from the `model.js` import list | None |
| 2 | 558-559 | A5 | `HEADS` feeds the heads-up banner whose `showHeads()` is an empty stub and whose values have no template binding (research §3 "Heads-up banner … Confirmed") | Delete with the heads-up code in `model.js`, the dev-rail button, and `fixtures.empty.js:72` | None |
| 3 | 404-437, 648-658 | A3 | Wallet seeds `WAL_CARDS`, `WAL_TRIPS`, `WAL_MERCH`, `WAL_PASSES` and `COPY.wallet` (incl. `addForm.num: "4000 1234 5678 9017"`) — Wallet is PRD AP-13 deferred and registered only in test-mocks | Delete with the Wallet owner decision (model `:3848-4160`, template `:3231-3526`, `fixtures.empty.js:51-54`, `test/browser/dev-wallet.spec.ts`) | Owner decision |
| 4 | 1-671 | D6 | 54 KB of seed data and 42 images (`fixtures/img/`, 4.1 MB) inside the production renderer folder; the Vite plugin swaps the module | Move `fixtures.js`, `fixtures.empty.js`, `fixtures/img/` and the two `development-*.html` files to `apps/app/src/dev/`; keep the swap in `vite.config.ts` pointing at the new paths; update the two route-rewrite specs | Low |
| 5 | 1-671 | A8 / D11 | Header (7): "Every name, address, number and organisation below is fictional", but the seeds name real businesses and places (Tartine, Equinox SoMa, Sightglass/Blue Bottle/Philz Coffee, Alaska Airlines, Delta, UA 1542, SFMOMA, The Warfield, Rainbow Grocery, Zuni Café, Nopa, Pixel Buds Pro 2) | Correct the header, or (owner) replace real business names with fictional ones | Owner question; test-mocks only |
| 6 | 10-52 | KEEP | 32 `new URL("./fixtures/img/…", import.meta.url).href` lines look generatable but must stay literal so Vite emits the assets only when this module is bundled | Keep literal | — |
| 7 | 561-562, 563-576 | A5 / D4 | `HOME_DEFAULTS` and `ATTENTION_ROWS` reach Home through `model.js` re-exports and the `mock-attention.ts` shim, and are then overridden in non-fixture runs by `data-adapter.ts:149` | When fixtures move to `dev/`, have the fixture installer apply Home defaults directly instead of `installPrototypeHomeBindings` reading `HOME_DEFAULTS \|\| {}` in every build | Low |
| 8 | 556-557 | A5 | `QUICK_SETTINGS`/`QUICK_TILES` drive the simulated shade tiles (dev only, research P8) | Keep while the dev shade exists | — |
| 9 | 361-367 | D8 | ES5 helpers `ctIni`/`ctMake` and an IIFE (`PH_SEED`, 213-258) | Leave (dev data); format with the formatter pass | None |
| 10 | 644-656 | NEW (logic in data) | `COPY.wallet.spendNotes` is a function inside the copy table | Goes with Wallet (#3) | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `BR_NEWS`, `BR_ENC`, `BR_BOOK` | const | 193 | none | stays |
| `CT_EXTRA`, `CT_MORE` | const | 346-360 | none | stays |
| `ctIni` | helper | 361 | initials helpers: `telephony-presenters.ts initials`, upstream `overviewAttendeeInitials` | stays (dev data) |
| `ctMake` | helper | 362 | none | stays |
| PH_SEED `at`/`rel` | helper (IIFE) | 213-258 | none | stays |

## Proposed end state
`apps/app/src/dev/fixtures/fixtures.js`, ~620 lines: `LOCK_SUM` and `HEADS` removed now; Wallet seeds and `COPY.wallet` removed with the Wallet decision (~-45 lines); header corrected. Export list stays identical to `fixtures.empty.js` (Rollup fails the production build on a missing named import, which is the real parity check).

## Verification
`npm run build` both with and without `ELIZA_DEV_ALLOW_TEST_MOCKS=1` (named-import parity), `scripts/audit-production-bundle.ts` (no fixture names/images in flag-off bundles), `test/browser/fixtures-empty-runtime.spec.ts`, `test/browser/shaw-ui-fixtures.spec.ts`, the dev/fixture-mode browser specs, `test/home-views-model.test.mjs`, `test/notes-view-defaults.test.mjs`, `test/history-initial-state.test.mjs`, `test/reset-wiring.test.mjs`, `test/agent-always-local.test.mjs`, Quint `shell-core-fixture.mjs`/`surfaces.mjs` harnesses.
