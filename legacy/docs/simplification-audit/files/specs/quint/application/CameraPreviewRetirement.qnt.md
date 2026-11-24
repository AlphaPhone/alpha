# specs/quint/application/CameraPreviewRetirement.qnt
- Lines: 61 | Kind: Quint model (live, 3 runs, 3 invariants) | Verdict: KEEP model; harness is a browser journey (consider REWRITE as Playwright)
- Covers: leaving Camera retires the preview synchronously before the Home commit; a late stream for a retired request is ended and cannot replace the fresh preview. Duplicates: Playwright camera specs (`camera-photos` area) and `test/camera-preview-recovery.test.mjs`. Callers/importers: manifest (5 sources incl. `prototype/model.js`, `template.html`, upstream `plugin-native-camera/src/session.ts`); harness `camera-preview-retirement.mjs` (90 lines, + `.md`) on `test/fixtures/calendar-mounted-editor.mjs` (starts a **Vite dev server and Chromium**) and `test/fixtures/camera-preview-port.mjs`; `test/quint-camera-preview-retirement.test.mjs` **and** aggregate (index.mjs:69).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness | T4 / P1 | A Quint harness that boots Vite + Chromium inside `npm test` is a Playwright journey in disguise, run twice (wrapper + aggregate). | Run only from the per-model wrapper, in the browser lane (not the host `npm test` lane). Longer term, drive the three runs from `journeys/camera-photos.spec.ts` with an ITF trace check helper. | Low |
| 2 | sources | §2.3 | `model.js` and `template.html` in `sources` select this model for most shell edits. | Keep only `camera-adapter.ts`, `browser-camera.ts` and the upstream session. | None |

## Proposed end state
Model unchanged; one test entry point in the browser lane; narrowed sources.
