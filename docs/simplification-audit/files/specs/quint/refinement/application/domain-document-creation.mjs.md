# specs/quint/refinement/application/domain-document-creation.mjs
- Lines: 46 | Kind: Quint trace replay against `BrowserDomainDocument` (imports through `loadProductModule`) | Verdict: DELETE (with `specs/quint/application/DomainDocumentCreation.qnt`, its manifest entry and `test/quint-domain-document-creation.test.mjs`)
- Covers: first access to a browser domain document **including the legacy import** ("a domain with legacy bytes is imported once", "a legacy write seen after the import stops normal access"). Duplicates: none. Callers/importers: `test/quint-domain-document-creation.test.mjs` only; manifest note at `application/manifest.json:7603`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2-3, 7, 15-21, 26, 35 | A1 / D1 | The model and replay exist for the legacy reader (`legacyWrite`, baseline, "Older browser data changed" blocking). Stage A already removed it: the working-tree `browser/domain-document.ts` constructor is `(documents, key)` and writes `legacy: null` always. The harness still passes a third legacy-reader argument, which is now ignored, so the required `legacyWrite` action and the "legacy import" witness cannot match. | Delete harness, model, manifest entry and test together. | Low |
| 2 | – | T10 | The manifest pins `readOrCreate` and `unchanged` for this model; neither exists in the working tree any more (`grep -cw` = 0). `quint-lib.ts:238-244` checks symbols at load, so **every** Quint command fails until this entry goes. | Remove the manifest entry in the same commit as the reader deletion. | High if left |
| 3 | test file | T1 | The test's mutation case rewrites `"if(actual!==expected)throw"`, a line that no longer exists. | Goes with the test. | – |

## Proposed end state
Gone. What survives in the product (empty read writes nothing, first edit creates, unrecognized envelope raises
"Browser document metadata needs recovery") has no model; it is exercised by `google-access-publication.mjs` (edits through
`BrowserDomainDocument`) and by the Settings/preferences Playwright journeys. If the owner wants a check, one case in a
browser-storage integration test is enough, not a Quint model.
