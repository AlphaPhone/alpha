# test/quint-domain-document-creation.test.mjs
- Lines: 14 | Kind: Quint replay wrapper (`replayDomainDocumentCreation`, `specs/quint/refinement/application/domain-document-creation.mjs`) + a source-rewrite canary | Verdict: MERGE into `test/quint-refinement.test.mjs`
- Covers: browser domain documents (`browser/domain-document.ts`) follow DomainDocumentCreation on read, edit and `legacyWrite` (40 traces). Duplicates: none (the driver is not in any family index, so this file is the only execution). Callers/importers: `npm test` glob; its path is also named in the model's `abstractions` prose in the family `manifest.json` (update the text when the file goes). Its driver `.md` gives the `node --test` command.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-10 | T4 (none) | Only execution of this model. | Register in the application index. | Low |
| 2 | 9 | A1 | Requires the `legacyWrite` action: the legacy envelope path in `domain-document.ts` that C6 deletes (cross-file-actions lists this test and driver as dependants). | Remove `legacyWrite` from the model and driver with C6. | High (fails when C6 lands) |
| 3 | 11-14 | T5, T10 | Canary rewrites `if(actual!==expected)throw` (minified text) to `if(false)throw`. Breaks under Prettier. | Delete. | Medium |

## Proposed end state
Deleted. The model, without `legacyWrite`, runs from the application index.
