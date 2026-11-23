# specs/quint/legacy/SettingsNav.qnt
- Lines: 379 | Kind: Quint model, historical design comparison | Verdict: DELETE (with C17)
- Covers: the 2026-11 Settings navigation design, including the full historical row inventory (labels/kinds/targets) and destructive-confirmation rule. Duplicates: live `application/SettingsSession.qnt`, `SettingsPageFocus.qnt`, `SettingsReads.qnt`. Callers/importers: `legacy/manifest.json` (sources `prototype/model.js`, `prototype/settings-adapter.ts`), `test/fixtures/quint/SettingsNavComparison.qnt:4,16`, `legacy/settings-nav/check-settings-nav-refinement.mjs`, `test/quint-legacy-settings-nav-refinement.test.mjs`; cited in `docs/formal-model-audit-2026-11/06-identity-comms-dev.md:49` as the only Settings navigation model.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | ~12-200 | P6 / T1-like | Most of the 379 lines are a hard-coded inventory of historical Settings rows ("including duplicate historical entries"): a file list in Quint form. Any Settings copy change is drift. | Delete. | Low |
| 2 | — | T4 | Destructive-action confirmation and navigation stack are behaviours better held by a Settings Playwright journey (`journeys/settings.spec.ts`). | Carry "destructive row asks for confirmation; Back pops one level" into that journey if not already present. | Medium: the formal audit notes no current Settings *navigation* model exists. |

## Proposed end state
Deleted with the legacy family plus its fixture, harness and test. Settings navigation (open sub-page, Back pops, destructive confirm) is asserted by `journeys/settings.spec.ts`; no replacement Quint model unless the owner wants one (owner question in chunk summary).
