# test/fixtures/SmsSendJournalTest.java
- Lines: 45 | Kind: integration/contract (host JVM: upstream `SmsSendJournal`, `SmsRecords`, `SmsPageCursor`; hash expected value computed in JS from the renderer's `smsBindingText`) | Verdict: KEEP; SIMPLIFY (drop the "earlier Alpha releases" block)
- Covers: the native binding hash equals the renderer's `JSON.stringify` binding (cross-language contract); Alpha's retired-ID namespace `alpha-sms-operation:v1:` keeps compacted operation ids refused after reload. Duplicates: upstream `vendor/eliza/plugins/plugin-native-messages/android/src/test/java/ai/eliza/plugins/messages/SmsSendJournalTest.java` covers journal parsing (`w1|`, `t1|`, `v1|` lines) and tombstones. Callers/importers: only `test/aosp-sms.test.mjs:35-44` (test 1, kept by the test-02 review).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 20-30 | A8, T4 | Labelled "a journal line exactly as the pre-upstream Alpha encoder wrote it". The `w1|`/`t1|`/`v1|` format is the *current* upstream format (`SmsSendJournal.java:549-625`), and upstream's own test loads it. The "earlier releases" framing is a tombstone (the package starts with empty data, D1), and the case duplicates upstream. | Delete lines 20-30 and the `#421` / "earlier Alpha releases" doc text. Persisted format stays byte-identical (G5) and is protected upstream. | Low |
| 2 | 18 | — | Binding-hash parity with the renderer is Alpha-owned and worth keeping. | Keep. | — |
| 3 | 32-41 | — | Namespace retention is Alpha's identity (G5). | Keep. | — |
| 4 | importer 40 | T1 | The namespace argument is regex-extracted from `AlphaTelephony.java` text. | In the Gradle move, reference the `AlphaTelephony` constant directly. | Low |

## Proposed end state
About 25 lines: hash parity with the renderer string and the namespace retention check. Merged with
`SmsActionJournalResultTest` into one `phone` host-JVM test.
