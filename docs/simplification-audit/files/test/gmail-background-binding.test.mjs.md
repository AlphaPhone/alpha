# test/gmail-background-binding.test.mjs
- Lines: 66 | Kind: source-text (tests 1-3) + re-run of upstream JVM tests (test 4) | Verdict: DELETE
- Covers: (claims) the installed Gmail background slot, notice identifiers, channel and bridge names; credential lifecycle lock order; that the upstream `MailHistoryReconciliation` and `MailBackgroundDelivery` JVM tests pass. Duplicates: `test/gmail-background-lock-contention.test.mjs` exercises the real lock order; upstream `plugin-native-notifications/test/native-host` owns test 4. Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 17-32 | T1 | Regex pins on `GmailBackground.java`, `AlphaGmailPlugin.java`, `gmail-background.ts`, plus `existsSync` checks that three deleted files stay deleted. | Delete. The persisted slot name `gmail-background:v1` and notice prefixes must stay byte-identical (G5), but a source regex is not the guard; an instrumented Gmail notice test or the bundle/APK audit is. | low |
| 2 | 34-53 | T1 | Regex over `AlphaCredentialStore`, `inbox-cloud-adapter.ts`, `AlphaLocalAgentPlugin`, `AlphaGmailPlugin` (including counting `configureGmailBackground(` calls). | Delete; behaviour belongs to the lock-contention test and an inbox journey. | low |
| 3 | 56-66 | T5 | Compiles and runs upstream test classes from `vendor/eliza`. | Delete; upstream runs its own suite. | none |

## Proposed end state
Gone. Lock order stays covered by the (rewritten) lock-contention JVM test; persisted identifiers by the instrumented
Gmail notice coverage.
