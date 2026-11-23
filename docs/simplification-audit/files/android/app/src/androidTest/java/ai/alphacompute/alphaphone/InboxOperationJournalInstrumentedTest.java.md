# android/app/src/androidTest/java/ai/alphacompute/alphaphone/InboxOperationJournalInstrumentedTest.java
- Lines: 33 | Role: through the WebView bridge, compare-and-exchange on an `inbox-operation:v1:<sha>` slot: create, stale conflict, recreation readback, invalid slot refused, CAS remove, no leftover files. | Verdict: MERGE into android/app/src/androidTest/java/ai/alphacompute/alphaphone/LargeInboxAttachmentInstrumentedTest.java (as one `InboxSecureSlotsInstrumentedTest`)
- Importers: none. Text/path pins: `scripts/android-instrumentation.ts:209` (`InboxOperationJournal: { args: { inboxOperationNative: "1" } }`).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 18-31 | T4 | Same scenario as `LargeInboxAttachmentInstrumentedTest.maximumPayloadCasSurvivesRecreation` (CAS create -> stale `conflict` -> `scenario.recreate()` -> exact read -> remove -> no `""/.bak/.new` files) on the same slot family `inbox-operation:v1:`. Only differences: invalid-slot refusal (L27) and CAS-to-null removal (L28). | Merge: one class, two methods (ordinary-size with invalid slot + CAS removal; maximum size), one gate argument. | Low |
| 2 | 14-17 | C3 | `js`, `ready`, `call`, `sha` are line-for-line copies of `LargeInboxAttachmentInstrumentedTest.java:14-17`. | Shared driver helpers (`WebViewTestDriver.call/until`, `TestDigests.sha256Hex`). | Low |
| 3 | 30 | D8 | Whole try/catch/finally with suppressed-cleanup logic on one 500-char line (the same block in `LargeInboxAttachmentInstrumentedTest.java:38-39`, `NoteOriginInstrumentedTest.java:75-77`, `JourneyJ05InstrumentedTest.java:47-52`). | A shared `Cleanup.run(primary, action)` helper. | Low |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `sha(String)` | helper | 17 | `LargeInboxAttachmentInstrumentedTest.sha`, `NoteAudioMetadataEncryptedInstrumentedTest.hash`, `NoteOriginInstrumentedTest.hex`, `InboxDraftInstrumentedTest.java:104` (30 files) | `TestDigests.sha256Hex` |
| `call(String)` | helper | 16 | see HostedResultNotice report | `WebViewTestDriver.call` |

## Proposed end state
File removed; its two distinct assertions become a method of the merged Inbox secure-slot class. Registry: one entry (`InboxSecureSlots`), gate args merged. 0 lines here (+~12 in the merged class).

## Verification
`npm run test:android:instrumentation -- --classes InboxSecureSlots` with the merged gate arg; `node --test test/android-instrumentation-runner.test.mjs`.
