# test/fixtures/native-source.mjs
- Lines: 15 | Kind: test support (stages the patched upstream native sources into a private root via `preparePatchedNative`) | Verdict: KEEP; absorb `sharedSpeechSource` from `jvm-tools.mjs`
- Covers: nothing alone; gives host-JVM tests and Quint native harnesses the reviewed patched upstream notification sources without writing through shared staging. Duplicates: `jvm-tools.mjs:59-63` `sharedSpeechSource` (calls `preparePatchedNative({root})` on the shared root). Callers/importers: 6 Quint native harnesses (`app-info-handoff`, `crash-journal`, `gmail-background`, `mms-dispatch`, `settings-handoff`, `sms-dispatch`) and 10 host tests (`hosted-notice-withdraw`, `hosted-result-notices`, `native-digest-sources`, `native-notification-session`, `resident-result-transport`, `secure-store-memory`, `shared-deletion-window`, `source-renewal-notices`, `workflow-approval-notice`, `workflow-notice-delivery`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-15 | — | Small, clear. Survives because the 6 Quint harnesses need it, even if most of the 10 host tests (javac transplants) are deleted. | Keep. | None. |
| 2 | 6 | D10 | `noticeSources` hard-codes one upstream plugin path; fine. | Keep. | None. |
| 3 | — | C5 | Two ways to get staged patched sources (this, and `jvm-tools.sharedSpeechSource`). | Move `sharedSpeechSource` here; one module owns patched-native staging for tests. | None. |

## Proposed end state
`test/support/native-source.mjs`: `prepareNativeFixture`, `noticeSources`, `sharedSpeechSource`. Unchanged behaviour.
