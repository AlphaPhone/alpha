# specs/quint/refinement/application/retained-reminder-tap-admission.mjs
- Lines: 66 | Kind: Quint refinement harness over a **transplant** fixture (`test/fixtures/retained-reminder-tap.mjs`) | Verdict: KEEP model; PORT the fixture onto `reminder-adapter-fixture.mjs`
- Covers: a saved reminder-notification token is consumed only after the exact Calendar detail actually renders in the same visit, with no chooser, sensitive context, form or background in between; chooser close retries; native token replacement refuses the old token (live model `RetainedReminderTapAdmission.qnt`, manifest ~l.2619). Duplicates: `ReminderTapTokens` covers the check/consume cycle before render (manifest note ~l.6247); `test/retained-reminder-tap-admission.test.mjs` re-drives the fixture. Callers/importers: `index.mjs:40`, `test/retained-reminder-tap-admission.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2 | T2 | Fixture strips types from the whole `reminder-adapter.ts`, deletes `import` lines and `export ` keywords, slices `reminder-creations.ts` between `export function reminderEvents(` and `/** Specific, stable reason`, and evaluates in `vm`; the upstream journal is imported for real. Any new adapter import becomes a free name; reformatting breaks the slice. | PORT onto `buildReminderAdapter()`/`reminderAdapterFixture()` (already bundles the adapter, reminder-creations and journal with ports, holds `setState` commits via `state.holdCommits`, exposes `listeners`, `opened`, `state.chooser/sensitive`). Add a `consumeReminderTap` handler that checks the exact token. | Medium |
| 2 | 11-12 | B5, P1 | Sources include `upstream.lock.json`, `scripts/prepare-client-features.ts`. | Bundle metafile inputs only. | None |
| 3 | — | T4 | `test/retained-reminder-tap-admission.test.mjs` (tests-host.md:1322: transplant/delete). | Delete after the port; every case is a scenario here. | Low |
| 4 | — | T4 | Could live in the same file as `reminder-tap-tokens.mjs` once both use one fixture. | Owner question (merge models or keep the split). | Low |

## Proposed end state
~70 lines on `reminderAdapterFixture`; `test/fixtures/retained-reminder-tap.mjs` and its direct test deleted.
