# apps/app/src/prototype/media-review-controls.ts
- Lines: 7 | Role: turns a text button into an icon button (Lucide mask glyph) while keeping its text as `aria-label`/`title`. | Verdict: SIMPLIFY (use the shared icon helper)
- Importers: `prototype/scan-correction-review.ts:1`, `scan-document.ts:2`, `scan-searchable-review.ts:1`, `video-edit-review.ts:1`. Stubbed by module id `./media-review-controls` in `specs/quint/refinement/native/video-edit-review.mjs:14`, `services/scan.mjs:10`, `services/scan-source-conformance.mjs:11`.
  Text/path pins: `test/support/feature-parity.mjs:386`; the three quint stubs above (module id).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5 | C3 | Hand-built `url('/icons/lucide/${icon}.svg')` (twice on one line); 12 other files build Lucide URLs by hand, while `apps/app/src/icon-style.ts` already resolves and validates names against `icon-catalog.json`. `workflow-filters.ts:19` has an identical `glyph()` span builder. | Export `iconUrl(name)` (validated) from `icon-style.ts` and use it here and in `workflow-filters.ts`, `inbox-cloud-adapter.ts:864,914`, `home-overview-cards.ts:7`, `voice-adapter.ts:1472`, `camera-adapter.ts:1466,1487`. | Low |
| 2 | 3 | NEW (a11y) | `aria-label` and `title` both set to the old text; fine. Empty `textContent` yields an unnamed button. | Keep; optionally assert non-empty label in dev. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `mediaToolIcon` | helper | 2-7 | `workflow-filters.ts:19` `glyph` | stays; uses `iconUrl` |

## Proposed end state
6 lines using `iconUrl(icon)` from `icon-style.ts`.

## Verification
Scan and video-edit browser specs (`test/browser/scan-*.spec.ts`, `video-edit*.spec.ts`), quint scan/video-edit replays (stubs unaffected).
