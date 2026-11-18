# specs/quint/refinement/native/ReviewedCopiesTraces.java
- Lines: 231 | Kind: Quint refinement harness (whole product `ReviewedCopies.java`, `AlphaMailFileProvider.java` + upstream `ReviewedFileHandoff`, `DocumentExport` over `test/fixtures/reviewed-copies-jvm` stubs, real host files) | Verdict: KEEP
- Covers: the mail-attachment review cache: concurrent sweep vs peer load/write under the registry lock, retry of a failed first sweep, owner cancel/clear and stale timers keep a peer's live copy, expiry at the grant boundary, provider read-only/path-shape/age admission, unsafe-name and failed-write cleanup. Duplicates: none found (no host test or Playwright spec drives the provider). Callers/importers: `reviewed-copies.mjs` (`checkReviewedCopies`) <- `index.mjs` and `test/quint-reviewed-copies-refinement.test.mjs`.
- Model live: `specs/quint/native/ReviewedCopies.qnt`. Tie to code: whole-file `javac` (robust, no text slicing).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 72-90, 120, 149 | T10 | Private-field reflection on `ReviewedCopies`: `live`, `owner`, `writing`, `swept`, `LOCK`. | Keep; harness contract. | low |
| 2 | 34-37 | T8 | `requireBlocked` spins with `Thread.yield()` up to 5 s waiting for `Thread.State.BLOCKED`. Condition-based, bounded. | Keep. | none |
| 3 | 60 | D7 | `provider.attachForFixture(mainContext)` is a method of the stub `test/fixtures/reviewed-copies-jvm/androidx/core/content/FileProvider.java`, not product code. | none | none |
| 4 | driver `reviewed-copies.mjs:12-14` | B5 / P1 | Driver hashes `AlphaMailAttachmentsPlugin.java`, `mail_attachment_paths.xml` and `AndroidManifest.xml` as inputs although none is compiled; any manifest edit marks this model changed. | Drop non-compiled inputs from `sources` (or keep only for the path filter). | low |
| 5 | test | B5 | `receipt.traces === 7`. | Assert `passed`. | low |

## Proposed end state
Unchanged harness. Path filter: `ReviewedCopies.java`, `AlphaMailFileProvider.java`, upstream `plugin-native-media` (via `upstream.lock.json`), `test/fixtures/reviewed-copies-jvm/**`, `ReviewedCopies.qnt`, `Trace.java`, `java.mjs`.
