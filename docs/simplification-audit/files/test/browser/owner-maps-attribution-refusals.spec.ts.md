# test/browser/owner-maps-attribution-refusals.spec.ts
- Lines: 88 | Kind: Playwright, chromium, `?mode=dev`; UI search over a provider installed by `/src/maps/runtime.ts` `configureMapsProvider` in page | Verdict: MERGE into `journeys/maps.spec.ts`
- Covers: Maps keeps the OpenStreetMap credit one tap away beside Cloud results; each typed Cloud Maps refusal (allowance unconfigured, subscription required, not configured, unsupported region, rate limited with retry-after, allowance exhausted, provider unavailable) shows its own message and no result. Duplicates: other maps specs exercise the provider but not the refusal table. Callers: chromium only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 17-37 | T6 | Provider installed by importing `configureMapsProvider`, `cloudMapsFailure`, `readServiceLimit` and building the failure in page. | Stub Cloud Maps at the bridge (HTTP status + `code`) so the real Cloud provider and failure mapping run. | Medium. |
| 2 | 30, 76-77 | T4 | `expected` is computed by the same product function (`cloudMapsFailure`) the UI uses, then compared to the UI: tautological. Only the regex at l.62-69 is independent. | Assert the UI text against the regex table only. | None. |
| 3 | 55 | D10 | Credits opened via CSS selector `.alpha-map-credits summary[aria-label=...]`. | `getByRole('button'/'group', {name:'Map information and credits'})`. | None. |
| 4 | 4-7 | A8 | Comment cites "#667 (H-16, H-35)". | Drop numbers. | None. |

## Proposed end state
Two cases in `journeys/maps.spec.ts`: (1) search shows a Cloud result with the OSM copyright link reachable; (2) loop over the seven refusal codes: status text matches its regex, no result shown, the two unconfigured codes share one message and the rest are distinct. Cloud stubbed at the bridge; delete this file.
