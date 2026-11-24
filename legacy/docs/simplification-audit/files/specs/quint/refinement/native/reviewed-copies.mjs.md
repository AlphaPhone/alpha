# specs/quint/refinement/native/reviewed-copies.mjs
- Lines: 33 | Kind: Quint refinement harness (Java, whole classes) | Verdict: KEEP (small SIMPLIFY)
- Covers: model `ReviewedCopies` (live, `specs/quint/native/manifest.json`) against the whole product `ReviewedCopies.java` and `AlphaMailFileProvider.java` plus upstream `ReviewedFileHandoff`/`DocumentExport`, over stubs in `test/fixtures/reviewed-copies-jvm/`. Duplicates: `test/quint-reviewed-copies-refinement.test.mjs` re-runs the same campaign that `test/quint-native-refinement.test.mjs` runs through `index.mjs` (T4). Callers/importers: `index.mjs:39,205`, `test/quint-reviewed-copies-refinement.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-12 | – | No source slicing: product classes compile whole. This is the target shape for the other native harnesses. | Keep. | – |
| 2 | 16-18 | B5 | `AlphaMailAttachmentsPlugin.java`, `mail_attachment_paths.xml` and `AndroidManifest.xml` are hashed into the receipt but never compiled or read. Any manifest edit changes the receipt for no behavioural reason. | Drop them from `sources` (or keep only `mail_attachment_paths.xml` if the provider path rules are meant to be pinned; then assert them in the Java harness). | L |
| 3 | 30-33 | C5 | Obligations are exported as a separate constant and spliced in by `index.mjs:205`; every sibling returns `{receipt, obligations}` from its check. | Return `{receipt, obligations}` like the others; drop the export and the `index.mjs` splice. | L |
| 4 | – | T4 | Per-model test duplicates the aggregate run. | Delete `test/quint-reviewed-copies-refinement.test.mjs` once the aggregate is the one runner (lead decision for all native wrappers). | L |
| 5 | – | P1 | Inputs are product Java + one upstream media module. | Lane: `android/app/src/main/java/**/{ReviewedCopies,AlphaMailFileProvider}.java`, `test/fixtures/reviewed-copies-jvm/**`, this file, `ReviewedCopiesTraces.java`, `upstream.lock.json`. | – |

## Proposed end state
Same harness, compile-only inputs listed in `sources`, obligations returned from `checkReviewedCopies`, run once from the
native aggregate. Not a deleted feature: `DocumentExport` is the upstream "save a reviewed copy" handoff, not the
backup/export workflow of D3.
