# test/gmail-lifecycle-custody.test.mjs
- Lines: 32 | Kind: Java transplant (four methods sliced from `AlphaGmailPlugin.java` into a hand-written host class with stubbed Android types) | Verdict: DELETE
- Covers: Gmail notice capture retries only the newest intent, a newer success retires an old retry, a queued stale intent is skipped, and the foreground check never posts to the main thread while holding the lifecycle lock. Duplicates: none behavioural. Callers/importers: none; uses `fixtures/jvm-tools.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2, 18-21 | T2, T10 | Slices `private boolean foreground(`, `private void requireForeground(`, `private void capture(`, `protected void handleOnResume(` by brace matching; everything around them (`Intent`, `Activity`, `Delivery`, `Queue`, `MailNoticePoster`) is a stub. | Delete. | medium: newest-intent custody of Gmail notice taps loses its only test |
| 2 | 5-31 | D8 | A 30-line Java class inside a JS template string. | Gone. | none |

## Proposed end state
Gone. If kept as behaviour, it becomes an instrumented case next to `HostedResultNoticeInstrumentedTest` (tap two
Gmail notices quickly; the newer one opens) in the emulator lane. Owner question listed in the chunk summary.
