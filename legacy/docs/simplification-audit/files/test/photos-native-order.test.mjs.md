# test/photos-native-order.test.mjs
- Lines: 59 | Kind: source-text + host-JVM run of upstream Java (exact duplicate) | Verdict: DELETE
- Covers: `PermittedMediaCatalog` ordering and page continuation. Duplicates: `test/photos-library-patch.test.mjs:35-73` (same title, 43 of 45 lines identical); on-device `PhotosCatalogOrderInstrumentedTest.java`. Callers/importers: `npm test` only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-58 | T4 | A verbatim copy of the NewestNeverDropped test in `photos-library-patch.test.mjs`, including the stubs and the SQLite page check. | Delete. | none |
| 2 | 21-24 | T1 | Regexes on the Java `list(...)` body (`QUERY_ARG_SQL_SORT_ORDER`, no `outer:`). | Gone with the file. | none |
| 3 | 10, 20 | T5/T9 | The code under test is pinned upstream (no local patch, see `android/upstream-native-sources.json`). The test skips without the Android SDK, which the verify job does not have. | The upstream follow-up is recorded in the `photos-library-patch` report. | none |

## Proposed end state
Deleted. No coverage is lost (the duplicate and the device test remain until the upstream move).
