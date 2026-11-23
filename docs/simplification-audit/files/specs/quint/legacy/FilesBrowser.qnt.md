# specs/quint/legacy/FilesBrowser.qnt
- Lines: 195 | Kind: Quint model, historical design comparison (legacy family) | Verdict: DELETE
- Covers: files-browser/Spec.tla translation: move/restore conflict, missing selection, stale review, category and identity fixes over four TLC configurations; 8 scenario runs. Duplicates: live models `application/FilesBrowserController`, `FilesTree`, `FilesPreview`, `FilesFilter`, `FilesRecentIndex`, services `FilesAndSharing`. Callers/importers: `legacy/manifest.json`; `legacy/view-refresh-configurations.json`; `test/fixtures/quint/FilesBrowserComparison.qnt`; `legacy/files-browser/check-files-browser-refinement.mjs`; `test/quint-legacy-files-browser-refinement.test.mjs` (~27 s).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-4 | P6 / D11 | Historical design translation. `legacy/manifest.json` entry says "Historical current/proposed design comparison at source ef9fbf7cd7 (or a view-refresh design), not a runtime conformance claim". It models no live product code as it stands; DECISIONS D11 retires `specs/quint/legacy`. | Delete model, its manifest entry, harness and test. | Low |
| 2 | manifest | T4 | Live application models cover the current implementation of the same surface (`application/FilesBrowserController`, `FilesTree`, `FilesPreview`, `FilesFilter`, `FilesRecentIndex`, services `FilesAndSharing`). | Rely on the live models. | Low; see coverage note |
| 3 | — | T10 / B5 | Harness (`legacy/files-browser/check-files-browser-refinement.mjs` (receipt JSON at line 396)) hashes or reads product files as text and compares against recorded mismatch receipts; it does not import product modules. | Delete with the model. | None |
| 4 | 1-4 | P6 | Manifest sources are the view-refresh config + `check-view-refresh.mjs`; no product file. | Delete. | None |

## Proposed end state
Delete `specs/quint/legacy/FilesBrowser.qnt`, its `legacy/manifest.json` entry, `legacy/files-browser/check-files-browser-refinement.mjs` (receipt JSON at line 396), `legacy/manifest.json`; `legacy/view-refresh-configurations.json`; `test/fixtures/quint/FilesBrowserComparison.qnt`; `legacy/files-browser/check-files-browser-refinement.mjs`; `test/quint-legacy-files-browser-refinement.test.mjs` (~27 s).. Lower the `legacy` floor in
`test/quint-checker.test.mjs:32` (and then drop the `legacy` family from `scripts/quint-lib.ts:43`,
`scripts/check-quint.ts:42`, `check-quint-refinement.ts`, `check-changed-models.ts` once the Core models have moved, see
chunk summary). Invariants that encode still-wanted UX rules (restore never overwrites on name conflict; review bound to file version) should be checked against the live twin's
invariant list before deletion; if missing, add them to the live model, not to a historical one.
