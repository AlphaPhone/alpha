# specs/quint/legacy/CameraSession.qnt
- Lines: 187 | Kind: Quint model, historical design comparison (legacy family) | Verdict: DELETE
- Covers: view-refresh design for the Camera session (focus, leave, lens, agent capture queue, chat grace), design vs as-built configurations; 10 scenario runs. Duplicates: live models `application/CameraFocusWrites`, `CameraPreviewRetirement`. Callers/importers: `legacy/manifest.json`; `legacy/view-refresh-configurations.json`; `specs/quint/refinement/legacy/camera-session.mjs:12`; `refinement/legacy/index.mjs`; `test/quint-historical-camera-session.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-4 | P6 / D11 | Historical design translation. `legacy/manifest.json` entry says "Historical current/proposed design comparison at source ef9fbf7cd7 (or a view-refresh design), not a runtime conformance claim". It models no live product code as it stands; DECISIONS D11 retires `specs/quint/legacy`. | Delete model, its manifest entry, harness and test. | Low |
| 2 | manifest | T4 | Live application models cover the current implementation of the same surface (`application/CameraFocusWrites`, `CameraPreviewRetirement`). | Rely on the live models. | Low; see coverage note |
| 3 | — | T10 / B5 | Harness (`refinement/legacy/camera-session.mjs` (+ `.md`), which reads `test/fixtures/camera-calendar-review.mjs` and hashes driver inputs) hashes or reads product files as text and compares against recorded mismatch receipts; it does not import product modules. | Delete with the model. | None |
| 4 | 5-6 | P6 | Manifest `sources` are `legacy/view-refresh-configurations.json` and `legacy/check-view-refresh.mjs` only: the model is tied to no product file at all. | Delete. | None |
| 5 | — | — | `test/fixtures/camera-calendar-review.mjs` must be checked for other importers before deleting it with the harness. | Grep at implementation time. | Low |

## Proposed end state
Delete `specs/quint/legacy/CameraSession.qnt`, its `legacy/manifest.json` entry, `refinement/legacy/camera-session.mjs` (+ `.md`), which reads `test/fixtures/camera-calendar-review.mjs` and hashes driver inputs, `legacy/manifest.json`; `legacy/view-refresh-configurations.json`; `specs/quint/refinement/legacy/camera-session.mjs:12`; `refinement/legacy/index.mjs`; `test/quint-historical-camera-session.test.mjs`.. Lower the `legacy` floor in
`test/quint-checker.test.mjs:32` (and then drop the `legacy` family from `scripts/quint-lib.ts:43`,
`scripts/check-quint.ts:42`, `check-quint-refinement.ts`, `check-changed-models.ts` once the Core models have moved, see
chunk summary). Invariants that encode still-wanted UX rules (capture queue survives leave, focus writes ordered) should be checked against the live twin's
invariant list before deletion; if missing, add them to the live model, not to a historical one.
