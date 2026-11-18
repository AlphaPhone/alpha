# specs/quint/refinement/legacy/index.mjs
- Lines: 258 | Kind: Quint refinement family aggregator (historical/legacy family) | Verdict: DELETE (whole `legacy` refinement family, D11)
- Covers: runs 24 historical campaigns — nine design-profile comparisons in `specs/quint/legacy/*/check-*-refinement.mjs` (ChatInput, SettingsNav, HomeLayout, FilesBrowser, NotesView, PhotosLibrary, Maps, SignIn, GoogleConnect), the two local historical comparisons, 14 upstream `Core*` conversions, and the services task scheduler — and turns expected mismatches into hard-coded obligation text. Duplicates: `collectLegacyCampaigns` duplicates `campaigns.mjs`; `CoreTaskScheduler` runs `services/task-scheduler` again (T4). Callers: `scripts/check-quint-refinement.ts:67` (family `legacy`), `test/quint-legacy-campaign-report.test.mjs` (tests `collectLegacyCampaigns`, T5).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2-27 | P6 / D11 | Every import is a historical design comparison or an upstream `Core*` conversion (`vendor/eliza` code, not this product). Research `ci-and-formal.md` §2.7: costs two upstream history fetches per verify (`quint:prepare-history`). | Delete the file and the `legacy` entry in `scripts/check-quint-refinement.ts`; retire `specs/quint/legacy/**` after the moves below. | Medium: ordering of moves matters. |
| 2 | 30-113 | A8 / B5 | ~85 lines of prose tables mapping *expected* mismatch ids to obligation text: the campaigns are designed to disagree with the model, so they verify nothing about the current product. | Gone with the file. | — |
| 3 | 89 | A1 | `NotesViewHistoricalLiveDurability` refers to "Previous Notes" records, a legacy reader deleted under D1. | Gone with the file. | — |
| 4 | 25, 231 | T4 | `runTaskSchedulerRefinement` (services family) re-run under the legacy family as `CoreTaskScheduler`. | Before deleting `specs/quint/legacy`, move `CoreTaskScheduler.qnt` (read by `services/task-scheduler/index.mjs:7`) into `services/` or delete it with its services twin `TaskSchedulerRuntime`. | Medium |
| 5 | 244-258 | C5 / T5 | `collectLegacyCampaigns` twin of `campaigns.mjs`; tested by `test/quint-legacy-campaign-report.test.mjs`. | Delete both. | Low |
| 6 | — | prerequisite | Live harnesses import from the legacy tree: `deferred`/`tick` from `legacy/core/source-support.mjs` (`application/{browser-deletion-poll,google-access-publication,resident-liveness}.mjs`), `legacy/core/formal-source-inventory.mjs` (`native/{mms,sms}-dispatch.mjs`), `test/browser/helpers/**` used by `legacy/maps`. | Move `deferred`/`tick` into `specs/quint/refinement/support.mjs`; decide on `mms-historical-sources.json` witnesses; then delete. Also drop `'legacy'` from `check-traces.mjs` family loops and `scripts/quint-lib.ts`. | Medium |

## Proposed end state
No `legacy` refinement family: this file, `calendar-navigation.*`, `camera-session.*`, `specs/quint/legacy/**`, `quint:prepare-history`, and the ~26 historical/core tests are deleted.
Shared helpers they held live in `specs/quint/refinement/support.mjs`.
`scripts/check-quint-refinement.ts` knows four families: application, services, native, composition.
