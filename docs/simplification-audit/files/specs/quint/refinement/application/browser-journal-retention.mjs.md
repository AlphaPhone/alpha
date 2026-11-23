# specs/quint/refinement/application/browser-journal-retention.mjs
- Lines: 278 | Kind: Quint refinement harness (imports real modules: `sourceModule` esbuild bundle of `journal-retention.ts`; real `BrowserCalendar`/`BrowserDaily` via `test/fixtures/browser-daily-stores.mjs`) | Verdict: KEEP (simplify after D1)
- Covers: receipt/deletion journal retention at the exact 199/200/201 and 126/127/128 neighbourhoods, own-key `__proto__` identities, acknowledgement, replay refusal, against `BrowserJournalRetention.qnt`. Duplicates: `test/browser-journal-retention.test.mjs` (167 lines, same fixture, same `BrowserCalendar` creation pruning and acknowledgement rules) (T4); run twice via `test/quint-browser-journal-retention-refinement.test.mjs` and aggregate `index.mjs:77`. Callers/importers: those two.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 55-62, 64-79, 108-117 | A1 | Traces "exact receipt count … stable legacy order", "dated zero ties…" and "legacy document missing both journal maps" exercise rows with no `at` — the legacy branch `journal-retention.ts:12-13` ("Rows without a time predate this policy", B171, D1). The missing-maps case is also the fresh-document state, so keep that one. | When D1 removes timeless rows: give every fixture row an `at`, drop the `dated` dimension from the model, and remove the `at === undefined` `//@ ensures` lines of the Lemma proof of `journalRowRetires` together. | M |
| 2 | 275-276 | A1 / A8 | Obligation "Review recovery of legacy orphaned Reminder markers" concerns data that cannot exist (D1). | Delete with `BrowserReminderOrphan`. | L |
| 3 | 4, 243 | C5 | Uses `services/support.mjs` `sourceModule` while sibling harnesses use `application/support.mjs` `bundledSource` and `browser-model-traces.mjs` `loadBundled`: three esbuild-to-data-URL loaders. | One `loadModule(path, stubs)` in `refinement/support.mjs`. | L |
| 4 | 245-266 | C4 | Manual save/restore of 10 globals + `Date.now` + `performance.now`; identical block in `browser-reminder-orphan.mjs:264-332`. | Shared `withBrowserGlobals(fn)` in the fixture. | L |
| 5 | — | T4 | `test/browser-journal-retention.test.mjs` checks 1,001 acknowledged creations → 201 rows and "never an unacknowledged row" — already traced here at the cap neighbourhoods. | Delete the host test (its 1,000-row loop adds runtime, not coverage), or keep only a case this harness lacks after comparing. | L |

## Proposed end state
- Same direct + five store traces, all rows dated; model without the `dated` flag.
- Globals handled by a fixture helper; one module loader.
- Single run (per-model test); host twin removed.
