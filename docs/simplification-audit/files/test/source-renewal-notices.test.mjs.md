# test/source-renewal-notices.test.mjs
- Lines: 15 | Kind: JVM unit (javac upstream notice sources + `HostedResultNotices.java` + `SourceRenewalNotices.java` + `test/fixtures/SourceRenewalNoticesTest.java`) | Verdict: MERGE into the host-JVM runner
- Covers: Source-renewal notifications bind owner and revision, survive process restart and keep cancellation. Duplicates: `test/browser/digest-source-renewal.spec.ts` (renderer side). Callers/importers: `npm test` glob only; `native-source.mjs` (`prepareNativeFixture`, `noticeSources`), `jvm-tools.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-15 | C3 | Own tmp/javac plumbing; prepares the full native fixture (cost ~5-10 s). | JVM-runner row. | Low |

## Proposed end state
File deleted; one JVM-runner row. Hosted results are live product (AlphaHostedResultsPlugin), not part of the D5 deletion.
