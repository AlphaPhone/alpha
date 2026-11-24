# test/browser/camera-media.production.spec.ts
- Lines: 75 | Kind: Playwright, production project (flag-off bundle), 2 tests; real UI journey (s0 r35), CSP-violation recorder | Verdict: KEEP as journeys (split): test 1 → production section of `journeys/camera-photos.spec.ts`, test 2 → `journeys/files.spec.ts`
- Covers: (1) in the shipped bundle a camera capture persists to Photos, the camera Ask flow reviews an unsaved frame, and Photo actions → Ask Alpha attaches the photo to chat without sending, with no page errors or CSP violations; (2) Files shows categories, Internal storage and Trash, no picker/search/Recents, and New folder works. Duplicates: Ask review also in `camera-controls.spec.ts` (dev lane); Files categories likely overlap `dev-files.spec.ts`. Callers/importers: production project only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 58-75 | D11 | The Files test sits in a camera spec. | Move to `journeys/files.spec.ts`. | None |
| 2 | 7-15 | C4 | `offline`, `recordViolations`, `fakeCamera` init scripts re-written per spec. | Harness fixtures (`cspViolations` auto-check, `fakeCamera`). | None |
| 3 | 24, 63 | — | Absence lists (`'Ask Alpha about this'`, `'Receipts'`, `'Import folder'` …) pin removed UI; acceptable as product scope gating. | Keep. | None |
| 4 | 27 | A8 | "mainline #815's check" comment. | Drop the reference. | None |

## Proposed end state
Same two journeys, unchanged assertions, on shared fixtures, living in their area journey files. These stay the production-lane coverage for Camera → Photos → Ask Alpha and for Files.
