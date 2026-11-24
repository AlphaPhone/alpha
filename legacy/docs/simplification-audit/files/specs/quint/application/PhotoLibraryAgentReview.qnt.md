# specs/quint/application/PhotoLibraryAgentReview.qnt
- Lines: 112 | Kind: Quint model (live in manifest; no harness) | Verdict: KEEP + add import replay
- Covers: Assistant-proposed photo library change: one review over the visible grid, opened only for a current revision, double Confirm dispatches once, Android re-checks the revision. Duplicates: test/browser/photo-agent-review-leave.spec.ts (journey slice); test/photo-library.test.mjs + test/fixtures/photo-library-adapter.mjs (host, other chunk). Callers/importers: manifest row (prototype/photo-library-adapter.ts; 7 symbol pins); application README. No refinement harness or quint wrapper (grep)

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | B5 | Live product model with nothing tying it to code except symbol-name regex pins. | Add a trace replay that bundles `photo-library-adapter.ts` (`createDeviceLibrary(port)` already takes the port: ideal for import-based replay) like test/quint-phone-recents.test.mjs. | M |
| 2 | manifest symbols | T10 | Pins `reviewOpen`, `requestChange`, `validCurrent` (locals). | Drop once bound. | L |
| 3 | A94 | A7 | delete-candidates A94 (runtime/photo-library.ts wrappers) touches this file's imports. | Check pins after A94. | L |

## Proposed end state
Model unchanged; one import-based replay test replaces the symbol pins; test/fixtures/photo-library-adapter.mjs reused if it already builds the adapter.
