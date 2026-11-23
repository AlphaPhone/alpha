# test/fixtures/canonical-calendar-draft-owner.mjs
- Lines: 160 | Kind: unit harness (esbuild bundles `canonical-calendar-drafts.ts` + codec + upstream durable-draft with 4 stubbed ports, fake Host class) | Verdict: DELETE as a test fixture; Quint harness PORTs
- Covers: per-owner Calendar draft slot binding, held reads/writes, resume/restore/discard/recover, foreign-owner drafts, read retry failure. Duplicates: Calendar draft Playwright specs; `calendar-mounted-*` tests. Callers/importers: `test/canonical-calendar-draft-ownership.test.mjs` (research: delete, C) and live Quint `specs/quint/refinement/application/canonical-calendar-draft.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 13-28 | T3/T10 | Stubs resolved by import specifier only when the importer ends with `/canonical-calendar-drafts.ts`; renaming any of the four imports silently loads the real module. | PORT: product accepts its ports as parameters of `installCanonicalCalendarDrafts`. | Medium |
| 2 | 50 | T2 | `new Function(...)` over CJS bundle output. | Import with `browser-source.mjs`. | Low |
| 3 | 80-93 | D2 | Fake `Host` class mirrors the monkey-patch adapter pattern (`install*(Host, views)`). | Goes with the D2 hook-registry work. | - |
| 4 | 132-137 | T8 | 150 x 10 ms polling for read retry. | One `waitFor`. | Low |

## Proposed end state
Delete with the host test. The Quint `canonical-calendar-draft` replay keeps a driver that imports the real module through the shared loader with injected ports (moved under `specs/quint/refinement`). Journey coverage in `journeys/calendar.spec.ts`: draft survives leaving Calendar, switching owner hides another owner's draft, discard asks and clears.
