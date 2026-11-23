# apps/app/src/runtime/dock-clearance.ts
- Lines: 99 | Role: binds the shared dock-clearance measurer to Alpha's selectors and adds a header-clearance measurer that publishes `--alpha-header-clearance`. | Verdict: SIMPLIFY
- Importers: 2 product (`main.tsx` – `installDockClearance()` with the return value ignored; `prototype/chat-overlay-motion-adapter.ts` – `visibleDocks`). Text/path pins: `scripts/prepare-client-features.ts` (path), `specs/quint/application/manifest.json`, `specs/quint/legacy/manifest.json`, `specs/quint/refinement/application/dock-clearance-ownership.mjs`, `test/accessibility-coverage.test.mjs` (reads source text for the property names), `test/theme-palette.test.mjs`, `test/browser/dock-clearance.spec.ts`, `test/browser/accessibility-states.ts`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2-24 | A8 | 23-line header narrating history: "Home used to scroll underneath it with a fixed 108px … (round 8 emulator run)". | Replace with 4 lines: what the two properties mean and that measurement uses layout coordinates. | None |
| 2 | 39-57 | D7/B4 | `installed` once-guard and returned uninstaller; `main.tsx:401` calls it once and discards the result. Only tests/specs uninstall. | Keep the uninstaller (cheap, used by `test/browser/dock-clearance.spec.ts` and the Quint harness) but drop the `installed` re-entrancy dance (`if (installed !== stop) return`). | Low |
| 3 | 25-26 | A7/D7 | `DOCK_CLEARANCE_PROPERTY`, `DOCK_REST_PROPERTY` exported; only `test/accessibility-coverage.test.mjs` references them (text). | Un-export (T1 test goes). | None |
| 4 | 60-99 | — | `installHeaderClearance` is Alpha-specific glue (selectors) around ResizeObserver/MutationObserver. Similar measuring code lives upstream for the dock. | Owner/upstream question: upstream `installSharedDockClearance` could accept a `header` selector; until then keep. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `APP_HEADERS`, `DOCK` | const | 31-32 | selectors; `[data-alpha-layer=…]` literals also in prototype CSS | stay |
| `installHeaderClearance` | helper | 60-99 | upstream dock measurer pattern | stay (or upstream) |

## Proposed end state
Short header comment, private property constants, simpler install/uninstall, unchanged measuring. ~75 lines.

## Verification
`test/browser/dock-clearance.spec.ts`, accessibility-states screenshots, Quint `dock-clearance-ownership.mjs`; `test/accessibility-coverage.test.mjs` reads text (update or delete).
