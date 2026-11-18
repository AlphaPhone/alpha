# specs/quint/refinement/application/camera-preview-retirement.mjs
- Lines: 90 | Kind: Quint refinement harness, mounted app in Chromium (Vite + Playwright via `test/fixtures/calendar-mounted-editor.mjs`) | Verdict: KEEP
- Covers: Camera leave callback retires the current preview request before the Home commit; late streams never take over the visible preview (`apps/app/src/prototype/camera-adapter.ts`, `browser-camera.ts`, `.eliza/.../plugin-native-camera/src/session.ts`). Duplicates: partly `test/camera-rapid-leave.test.mjs` (same media port fixture, rapid-leave regression). Callers: `test/quint-camera-preview-retirement.test.mjs`, `index.mjs` (aggregate).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3-4, 26 | — | Drives the real mounted renderer; product state is read through `window.quintCameraLeave` installed by `test/fixtures/camera-preview-port.mjs` (in-page monkey-patching, T6-like but it does click real Camera buttons). No source-text slicing in this file. | None here; keep the port fixture typed. | — |
| 2 | 10-12 | T10 (weak) | `inputs` pins file paths `prototype/model.js`, `template.html`; these will move in the structural pass (stage F). Paths are hashed, not sliced. | Update paths when files move, or derive inputs from Vite's module graph (`onSource` already does this) and drop the static list. | L |
| 3 | 14-21 | B3 | `project()` asserts fixture-shaped invariants (view enum, boolean) on values the fixture itself builds. | Drop the three asserts; Quint comparison already fails on bad values. | L |
| 4 | — | T4 | Run by both the per-model test and the application aggregate. | Delete the aggregate (see chunk summary); keep the per-model wrapper. | L |
| 5 | — | P1 | Runtime: Vite server + Chromium, three schedules; a minute-scale test. | Path-filter to camera adapter/session/model changes. | — |

## Proposed end state
Same three schedules; `inputs` replaced by the module graph the mounted page reports; assertion boilerplate removed.
Runs only from its per-model test, in a lane triggered by camera, shell or model changes.
