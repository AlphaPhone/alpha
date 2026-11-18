# android/app/src/androidTest/java/ai/alphacompute/alphaphone/MailAttachmentInstrumentedTest.java
- Lines: 29 | Role: installed `FileProvider` for mail attachments: read-only content URI, 15-minute expiry, unshared path refused, `AlphaMailAttachmentsPlugin.validate` refuses wrong signature/oversize/traversal. | Verdict: KEEP
- Importers: none. Text/path pins: `scripts/android-instrumentation.ts:210` (arg `mailAttachmentNative`). (`MailAttachment` string hits in `apps/app/src/**` are unrelated renderer identifiers.)

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 20-26 | D8 | Each assertion group packed into one line. | Split when touched. | None |
| 2 | 24-26 | T3 | `validate(...)` refusals are pure-function checks; they ride along with a real provider test, so leave them. | Keep. | - |

## Local types and helpers
None.

## Proposed end state
Unchanged (29 lines).

## Verification
`npm run test:android:instrumentation -- --classes MailAttachment` (gate arg from the registry).
