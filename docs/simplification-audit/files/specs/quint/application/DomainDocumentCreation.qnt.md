# specs/quint/application/DomainDocumentCreation.qnt
- Lines: 62 | Kind: Quint model (live: listed in specs/quint/application/manifest.json, loaded by scripts/quint-lib.ts / check-quint.ts) | Verdict: DELETE
- Covers: First access to a browser domain document: imports legacy localStorage bytes once and fences later legacy writes. Duplicates: DurableStore models the same class (read/create/CAS). Callers/importers: `specs/quint/refinement/application/domain-document-creation.mjs`, `test/quint-domain-document-creation.test.mjs`, README; 5 symbol pins (BrowserDomainDocument, readOrCreate, unchanged, load, edit).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-4,141-149 (all) | A1/D1 | The model exists to describe the `{version:1,legacy,value}` envelope and legacy import; cross-file-actions "Browser store envelopes" removes the `legacy` parameter and lists this harness for update. | Delete model, harness, test and manifest entry. Fold the two non-legacy facts (empty read writes nothing; first edit creates) into DurableStore as scenario runs. | Loses nothing once the envelope goes; DurableStore harness (storage.mjs) imports the real class. |

## Proposed end state
File gone; DurableStore carries the remaining obligations.
