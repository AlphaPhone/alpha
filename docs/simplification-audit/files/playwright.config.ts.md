# playwright.config.ts
- Lines: 73 | Kind: test config (Playwright projects and web servers) | Verdict: KEEP, SIMPLIFY
- Covers: five projects (chromium dev server, production preview build, firefox+webkit storage specs, opt-in live) and the two web servers they need. Duplicates: none; `scripts/storage-specs.ts` is its data list. Callers/importers: `npm run test:browser*`, `browser.yml`, `test/playwright-projects.test.mjs` (asserts project shapes: T5, delete).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5 | D11 | The storage-spec list lives in `scripts/storage-specs.ts`; it is test data, also imported by `scripts/ci/affected.ts` and `scripts/qualify-head.ts`. | Move to `test/browser/storage-specs.ts` (or a `@storage` tag/`test.describe` annotation and `grep` in the project, which removes the list entirely). | Low |
| 2 | 68-69 + `storage-specs.ts` | A1/A2/A3 | The cross-engine list names specs of deleted features: `calendar-linked-storage` (D4), `calendar-backup-restore` (D3), `calendar-sync-settings` (D4), and seven `*-migration` specs including `cloud-account-migration` (D1 where they exercise legacy readers; check each). | Remove them from the list with the spec deletions; the firefox/webkit lane then covers only current persisted formats. | Low |
| 3 | 18-25 | — | Hand-rolled `--project` argv scan. It is needed because `webServer` is not per-project; keep, but it is the only place the config reads argv. | Keep; add a one-line comment that `npx playwright test` without `--project` starts both servers. | None |
| 4 | 33 | D5 | The config mutates `process.env.ELIZA_DEV_ALLOW_TEST_MOCKS` globally for in-process Vite specs (dev-hosted-journey, dev-reload, reading-source). | Once those specs are rewritten as journeys on the shared dev server (tests-browser), delete the mutation. | Low |
| 5 | 45 | P3 | The production server command rebuilds (`upstream:prepare-client`, `vite build`, bundle audit) every run; in CI `browser.yml` already built and audited. | Let CI pass a prebuilt output dir via env (`ALPHA_PRODUCTION_OUTPUT`) and skip the build when it is set. | Low |
| 6 | 68-69 | C5 | Firefox and WebKit entries repeat baseURL/viewport already set in `use`. | Spread `devices[...]` then re-apply one shared `use` object. | None |
| 7 | 9-13, 66-70 | T4 | `<name>.production.spec.ts` twins (51 files) are a second copy of the same journey on the production server. | Per tests-browser plan: one journey spec per area, with a `production` project that runs the subset tagged `@production`. | Medium (spec rewrite) |

## Proposed end state
Same five projects with one shared `use`, storage/production membership by tag instead of file-name lists, no global env mutation, and an optional prebuilt production output for CI. `test/playwright-projects.test.mjs` is deleted (it re-asserts this file's text/shape).
