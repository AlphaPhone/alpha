# android/app/src/androidTest/java/ai/alphacompute/alphaphone/ResetPolicyInstrumentedTest.java
- Lines: 50 | Role: native "Reset Alpha data?" review can be cancelled without effect; reset marker persistence in an isolated directory; migration plugins report unsupported in production. | Verdict: SIMPLIFY
- Importers: none. Text/path pins: `scripts/android-instrumentation.ts:152` (`ResetPolicy: { note: "Non-destructive cancellation, migration refusal and isolated marker checks ..." }`).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 33-37 | A3 | Asserts `AlphaNoteDocuments.importText/exportText` resolve `"unsupported"` and `ElizaPasswordTransfer` is absent on a flag-off build. `AlphaNoteDocumentsPlugin.java:26-27` keeps both methods, active only under test mocks (backup/import/export are PRD-excluded). | When the import/export stubs are removed from the plugin and `apps/app/src/prototype/notes-document-adapter.ts`, replace these lines with "method not implemented" or drop them; the password-transfer absence belongs to the production bundle audit. | low |
| 2 | 16 | D11 | Method name bundles three unrelated checks (cancel review, no migration plugins). | Split into `cancelledReviewLeavesData` and (if kept) `migrationSurfacesAbsent`. | none |
| 3 | 28-29, 35-36 | C3 | Two hand-rolled `while(deadline)` polls. | `WebViewTestDriver.until`. | none |
| 4 | 22, 31 | C6 | `'alpha.connection.selection.v1'` literal. | Shared constant (also in ResidentAlwaysPresent, ResetExternalFixture, RemoteAgent). | none |

## Local types and helpers
None beyond inline polls.

## Proposed end state
Cancel-review and marker tests remain; migration-surface lines shrink with the plugin cleanup. ~42 lines.

## Verification
`--classes ResetPolicy` on a flag-off build (method 1 skips under test mocks).
