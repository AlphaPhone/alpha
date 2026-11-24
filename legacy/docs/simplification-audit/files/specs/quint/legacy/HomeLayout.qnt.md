# specs/quint/legacy/HomeLayout.qnt
- Lines: 93 | Kind: Quint model, historical design comparison (legacy family) | Verdict: DELETE
- Covers: Home grid design (grid stable under keyboard/insets, cards have content, no loading cards, date line, negative-grid floor division); 5 scenario runs. Duplicates: live models `application/HomeSurface`, `DockClearanceOwnership`, `HomeGesture`, `HomeFailureNotice`. Callers/importers: `legacy/manifest.json`; `test/fixtures/quint/HomeLayoutComparison.qnt`; `legacy/home-layout/check-home-layout-refinement.mjs`; `test/quint-legacy-home-layout-refinement.test.mjs`; `.github/workflows/quint-model-check.yml:50` (compare).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-4 | P6 / D11 | Historical design translation. `legacy/manifest.json` entry says "Historical current/proposed design comparison at source ef9fbf7cd7 (or a view-refresh design), not a runtime conformance claim". It models no live product code as it stands; DECISIONS D11 retires `specs/quint/legacy`. | Delete model, its manifest entry, harness and test. | Low |
| 2 | manifest | T4 | Live application models cover the current implementation of the same surface (`application/HomeSurface`, `DockClearanceOwnership`, `HomeGesture`, `HomeFailureNotice`). | Rely on the live models. | Low; see coverage note |
| 3 | — | T10 / B5 | Harness (`legacy/home-layout/check-home-layout-refinement.mjs` (receipt JSON at line 436)) hashes or reads product files as text and compares against recorded mismatch receipts; it does not import product modules. | Delete with the model. | None |
| 4 | manifest | T10 | Manifest sources are `prototype/template.html`, `phone.css`, `runtime/dock-clearance.ts`: a CSS/HTML pin that breaks on the Prettier pass (D9) for no behavioural reason. | Delete. | None |

## Proposed end state
Delete `specs/quint/legacy/HomeLayout.qnt`, its `legacy/manifest.json` entry, `legacy/home-layout/check-home-layout-refinement.mjs` (receipt JSON at line 436), `legacy/manifest.json`; `test/fixtures/quint/HomeLayoutComparison.qnt`; `legacy/home-layout/check-home-layout-refinement.mjs`; `test/quint-legacy-home-layout-refinement.test.mjs`; `.github/workflows/quint-model-check.yml:50` (compare).. Lower the `legacy` floor in
`test/quint-checker.test.mjs:32` (and then drop the `legacy` family from `scripts/quint-lib.ts:43`,
`scripts/check-quint.ts:42`, `check-quint-refinement.ts`, `check-changed-models.ts` once the Core models have moved, see
chunk summary). Invariants that encode still-wanted UX rules (GridStable (174 px keyboard regression), TopNeverBlank) should be checked against the live twin's
invariant list before deletion; if missing, add them to the live model, not to a historical one.
