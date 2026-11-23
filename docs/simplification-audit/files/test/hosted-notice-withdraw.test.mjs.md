# test/hosted-notice-withdraw.test.mjs
- Lines: 15 | Kind: integration on host JVM (stages the patched upstream notifications plugin via `prepareNativeFixture`, javac of upstream `NoticeOwner` + real `HostedResultNotices.java` + `test/fixtures/HostedNoticeWithdrawTest.java`) | Verdict: MERGE with `hosted-result-notices.test.mjs` into one Gradle JVM test `HostedResultNoticesTest`
- Covers: a hosted result shown in the app withdraws its notification by key, a result for an open panel of the same scope posts silently, a pending tap survives withdrawal, withdrawal is bound to the scope. Duplicates: `test/quint-native-hosted-result-notices.test.mjs` (12 Quint traces over the same ledger: routes, redaction, durable tokens), `test/browser/workflow-notice-lifecycle.spec.ts`. Callers/importers: `npm test` glob; `test/fixtures/native-source.mjs`, `test/fixtures/jvm-tools.mjs`, fixture `test/fixtures/HostedNoticeWithdrawTest.java` (41 lines, only importer is this file).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-14 | C3 / T9 | Own `mkdtemp`/javac/java plumbing instead of `runJvm`; nearly identical to `hosted-result-notices.test.mjs` (only the fixture class differs). | One test, or one Gradle test class. | Low |
| 2 | fixture 22 | A7 | The fixture uses the 1-arg `capture(String)` overload that delete-candidates B36 lists as test-only. | When B36 lands, switch to `capture(key,false)`. | Low |
| 3 | — | T4 | Check which withdraw/silent-post cases the Quint traces already cover; keep only the rest (likely "open panel for this scope posts silently" and "pending tap survives withdrawal"). | — | Low |

## Proposed end state
`android/app/src/test/java/ai/alphacompute/alphaphone/HostedResultNoticesTest.java` (JUnit) holding the non-Quint cases of
both fixtures; this file and `test/fixtures/HostedNoticeWithdrawTest.java` deleted. Until a Gradle JVM source set
exists: one host test file running both fixtures through `runJvm`.
