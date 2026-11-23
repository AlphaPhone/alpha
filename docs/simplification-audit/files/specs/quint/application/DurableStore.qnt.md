# specs/quint/application/DurableStore.qnt
- Lines: 58 | Kind: Quint model (live: listed in specs/quint/application/manifest.json, loaded by scripts/quint-lib.ts / check-quint.ts) | Verdict: KEEP model; SIMPLIFY (drop legacy)
- Covers: BrowserDomainDocument read/create/CAS, competing writers, corruption recovery, failed writes retain drafts. Duplicates: DomainDocumentCreation (deleted, its non-legacy facts move here). Playwright `domain-atomicity.spec.ts`. Callers/importers: `specs/quint/refinement/application/storage.mjs` (`durableStore`, via `test/quint-application-refinement.test.mjs` (via `refinement/application/index.mjs`)), refinement README, application README.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-16 (legacy, baselineLegacy, capturedLegacy, legacyWrite, CommitLegacyCurrent, LegacyRetained, legacyWriteAfterPrepareTest) | A1/D1 | Legacy-write fencing models the envelope removed by cross-file-actions "Browser store envelopes". | Delete the legacy members; add `emptyDomainReadWritesNothingTest` and `firstEditCreatesTest` from DomainDocumentCreation. | storage.mjs must drop its legacy port in the same change. |
| 2 | manifest sources | — | Sources include `json-domain-document.ts` (to be merged into domain-document.ts) and `notes-secure-store.ts`. | Update when files merge. | quint-lib throws on missing source. |
| 3 | harness | — | storage.mjs uses `sourceModule` (bundle import). | None. | — |

## Proposed end state
One durable-store model over the envelope-free BrowserDomainDocument; import-based harness.
