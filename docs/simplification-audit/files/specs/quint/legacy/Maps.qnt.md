# specs/quint/legacy/Maps.qnt
- Lines: 165 | Kind: Quint model, historical design comparison (legacy family) | Verdict: DELETE (with C17)
- Covers: the November 2026 current/proposed Maps design (service health, route/nav screens, agent requests, 6 temporal properties) at source `ef9fbf7cd7`; manifest says "not a runtime conformance claim". Duplicates: live `services/MapsConnection.qnt`, `services/MapsGuidanceVoice.qnt`, `application/MapsRerouteOwnership.qnt`, `MapsEventReturn.qnt`, `MapPlaneOwnership.qnt`. Callers/importers: `specs/quint/legacy/manifest.json` (admitted by `scripts/quint-lib.ts:43` family list, so `quint:verify` checks it), `test/fixtures/quint/MapsComparison.qnt:3`, `specs/quint/legacy/maps/check-maps-refinement.mjs`, `test/quint-legacy-maps-refinement.test.mjs`, README command examples; cited by `docs/formal-model-audit-2026-11/05-browser-passwords-maps.md` A18–A21 (all "model is historical, drift").

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-165 | P6 | Model of a superseded design; the formal audit (A18–A21) found it disagrees with today's `maps-adapter.ts`/`cloud-maps.ts` (Back from Nav, Fault, Connect) and declined to fix it because it is historical. | Delete; liveness concerns A21 belong in `services/MapsConnection.qnt` (already the stated target). | Low |
| 2 | — | T4 | Its refinement test asserts six *mismatches* against the current renderer (`test/quint-legacy-maps-refinement.test.mjs:16-19`, ~27 s): it pins drift, not behaviour. | Delete the test, `MapsComparison.qnt` fixture and `legacy/maps/` harness together. | Low |
| 3 | 1 | A8 | Header comment "Historical design translation; the executable Quint model is retained here." is the only justification. | Goes with the file. | — |

## Proposed end state
File removed with the rest of `specs/quint/legacy/**` (delete-candidates C17). Same commit: `test/fixtures/quint/MapsComparison.qnt`, `specs/quint/legacy/maps/**`, `test/quint-legacy-maps-refinement.test.mjs`, its manifest entry, and the legacy floor in `test/quint-checker.test.mjs:32`. Current Maps behaviour stays covered by the services/application Maps models and the Maps Playwright journey.
