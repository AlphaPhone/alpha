# specs/quint/native/ReviewedCopies.qnt
- Lines: 121 | Kind: Quint model (live) | Verdict: KEEP
- Covers: the process-wide temporary attachment cache shared by the main and assistant bridges: first startup sweep protects live copies, held sweep blocks peer writes, a cancelled writer cannot republish, expiry skips own and in-flight peer copies, provider opens read-only only for well-formed fresh URIs. Duplicates: none in Quint. Host JVM test `test/fixtures/ReviewedCopiesTest.java` (driven by `test/native-plugin-teardown.test.mjs`) exercises the same class; see host-test reports for which one stays. Callers/importers: manifest; `refinement/native/reviewed-copies.mjs` + `ReviewedCopiesTraces.java` (`index.mjs` `checkReviewedCopies`), `reviewed-copies.md`; comments in `ReviewedCopies.java`, `AlphaMailFileProvider.java`, `AlphaMailAttachmentsPlugin.java`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness | — | Tie compiles real `ReviewedCopies.java`, `AlphaMailFileProvider.java`, upstream `ReviewedFileHandoff`/`DocumentExport` against stubs in `test/fixtures/reviewed-copies-jvm/` and replays seven scenarios. No text slicing. | Keep. Note the harness depends on `test/fixtures/reviewed-copies-jvm/` — that fixture survives as long as this harness does. | low |
| 2 | 6 | B4 | `lastWrite` is only read by `cancelledWriterCannotRepublishTest`; acceptable test observation. | none | — |
| 3 | T4 | T4 | `test/fixtures/ReviewedCopiesTest.java` + `test/native-plugin-teardown.test.mjs` cover cache sweep/expiry on the same class. | Prefer this formal replay; drop the duplicate host JVM cases if the host-test reviewer agrees. | low |
| 4 | manifest sources | — | `mail_attachment_paths.xml` and `AlphaMailAttachmentsPlugin.java` are hashed as inputs but not compiled; fine as path pins. | none | — |

## Proposed end state
Unchanged. Product sources live (Mail attachments are not on a delete list). Fixture stubs move with the harness
if `test/fixtures` is reorganised (they are formal-harness inputs, not host tests).
