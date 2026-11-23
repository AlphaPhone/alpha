# test/fixtures/browser-daily-stores.mjs
- Lines: 50 | Kind: integration harness (esbuild bundles the real BrowserCalendar/Daily/Clock and calendar/reminder stores over jsdom, 10 stubbed edge modules) | Verdict: KEEP (become the calendar/reminders integration harness)
- Covers: real browser Calendar, Reminders and Clock document logic over an in-memory CAS Documents port. Duplicates: none at this level. Callers/importers: `test/browser-calendar-series.test.mjs`, `browser-clock.test.mjs`, `browser-journal-retention.test.mjs` (research: merge into calendar/browser-view integration), and live Quint `specs/quint/refinement/application/browser-deletion-poll.mjs`, `browser-journal-retention.mjs`, `browser-reminder-orphan.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-23 | - | Installs jsdom globals on `globalThis` at import time (side effect for every importer). | Make `install()` explicit and restore on teardown. | Low |
| 2 | 24-35 | T3/T10 | Stub map keyed by import specifier (`'./documents'`, `'../runtime/deletion-owner'`): renaming an import in the product breaks the bundle silently into the real module. | Prefer injecting the Documents port through a constructor parameter in the product; fewer stubs. | Medium |
| 3 | 42 | C7 | Own esbuild bundling pipeline; `browser-source.mjs` is a second one. | Use `loadBrowserModule` with a stub option, one bundler helper. | Low |
| 4 | 10-16 | C4 | `MemoryDocuments` CAS store; similar in-memory stores exist in other fixtures. | Share one in-memory documents port. | Low |

## Proposed end state
Becomes `test/integration/support/browser-daily.mjs`, used by one `calendar-reminders.integration.test.mjs` that absorbs the three host tests' worthwhile cases (series edits, clock ring/lock, journal retention), and by the three Quint harnesses. Loaded through one shared bundler helper.
