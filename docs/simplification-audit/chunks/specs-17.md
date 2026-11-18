# Chunk specs-17: `specs/quint/legacy/{maps,notes-view,photos-library,settings-nav}`

Four historical-design comparison harnesses (Vite dev server + Playwright Chromium mounting the flag-off renderer,
replaying traces into `test/fixtures/quint/*Comparison.qnt` wrappers of `specs/quint/legacy/*.qnt`) and their READMEs.
All four assert *expected mismatches* against a superseded design, so they pin drift rather than behaviour (P6, D11).

| File | Lines | Kind | Verdict | Target |
|---|---|---|---|---|
| `specs/quint/legacy/maps/README.md` | 52 | docs | DELETE | — |
| `specs/quint/legacy/maps/check-maps-refinement.mjs` | 519 | historical refinement harness (mounted Chromium) | DELETE after MOVE + PORT of shared mount helpers | `specs/quint/refinement/application/maps-mount.mjs` |
| `specs/quint/legacy/notes-view/README.md` | 42 | docs | DELETE | — |
| `specs/quint/legacy/notes-view/check-notes-view-refinement.mjs` | 460 | historical refinement harness (mounted Chromium) | DELETE (already broken: watches deleted `notes-trash-adapter.ts`; drives deleted "Previous notes") | — |
| `specs/quint/legacy/photos-library/README.md` | 45 | docs | DELETE | — |
| `specs/quint/legacy/photos-library/check-photos-library-refinement.mjs` | 473 | historical refinement harness (mounted Chromium) | DELETE | one case → `journeys/camera-photos.spec.ts` |
| `specs/quint/legacy/settings-nav/README.md` | 36 | docs | DELETE | — |
| `specs/quint/legacy/settings-nav/check-settings-nav-refinement.mjs` | 314 | historical refinement harness (mounted Chromium) | DELETE | — |

Delete together with: `test/fixtures/quint/{Maps,NotesView,PhotosLibrary,SettingsNav}Comparison.qnt` (only importers
are these harnesses), `test/quint-legacy-{maps,notes-view,photos-library,settings-nav}-refinement.test.mjs`, and the
four imports plus `settingsNavDifferences` in `specs/quint/refinement/legacy/index.mjs`.

## Blocker the research missed

`specs/quint/refinement/application/maps-reroute-ownership.mjs:4` (live model `MapsRerouteOwnership`, run by
`test/quint-maps-reroute-ownership.test.mjs` and the application aggregate) imports `geo, mountClosedMaps, route,
start` from `legacy/maps/check-maps-refinement.mjs`. `research/ci-and-formal.md` §3 lists three shared pieces to
relocate before retiring `legacy/`; this is a fourth. Deleting `legacy/maps/` first turns a live model red (D11).

Required move: `setup`, `mountClosedMaps`, `route`, `start`, `geo` (+ `open`, `search`, `result`, capability
helpers, selectors) → `specs/quint/refinement/application/maps-mount.mjs`. Port its T10 splice: it injects
`window.inspectHistoricalMaps` into `apps/app/src/prototype/maps-adapter.ts` before the literal `'  let returningToEvent:'`
and reads closure locals `mapsController`, `surface.guidance()`, `screen.navSession`, `screen.reroutePublication`.
The Maps module needs a dev-gated exported inspector returning `{route, arrived, guidance, session, publication}`.
Export-name contract the live harness keeps: `connectionController.getCloudClient` (`runtime/connection-ui.tsx`),
`cloudMapsDiagnostics` (`maps/cloud-maps.ts`), `mapsConnection` (`maps/runtime.ts`), `residentMapsNavigationPort`
(`maps/agent-navigation.ts`).

## Behaviours that lose all end-to-end coverage if the DELETEs happen

1. **Maps guidance hit targets at 150 % text and in landscape** (guidance buttons, Map information, attribution
   links, status own their sampled points; right-docked assistant pill keeps its controls; disclosure's first action
   tappable) — `check-maps-refinement.mjs:250-338`. Add one landscape/150 % case to `journeys/maps.spec.ts`.
2. **Stale Photos share review** — peer revision change while "Share 1 item?" is open → "Item changed", no second
   `navigator.share` — `check-photos-library-refinement.mjs:289-306`. Add to `journeys/camera-photos.spec.ts`.
3. Possibly: **Notes save does not auto-transcribe** and **license-detail Back retains search text**; both appear
   elsewhere in parts (`notes-browser-segments.spec.ts`, `user-selected-settings.production.spec.ts`), verify when
   merging into `journeys/notes.spec.ts` / `journeys/settings.spec.ts`.

Everything else is covered by live models (`MapsRerouteOwnership`, `CanonicalNotes*`, `NotesTrashSession`,
`PhotosTrash`, `PhotosWindow`, `SettingsPageFocus`) and existing Playwright specs named in each file report.

## Shared helpers worth keeping

- The mounted-renderer boot (Vite `createServer` with `hmr:false, watch:null`, Chromium, `page.route` network fence,
  WebSocket fence for Vite's token socket, pageerror/navigation assertions, mock-flag env save/restore, hash-pin
  `transform` plugin) is copied verbatim in all four files and in other mounted harnesses. One
  `mountRenderer({watched, initScript})` in `specs/quint/refinement/support.mjs` for the surviving harnesses.
- `'shell = value;'` splice into `main.tsx` (notes-view, photos-library, settings-nav, and likely other live
  harnesses): any surviving user should switch to a dev-gated exported shell handle.

## Cross-file actions

- Before deleting `specs/quint/legacy/`: do the Maps move above; also the three items in `ci-and-formal.md` §3.
- `test/browser/helpers/legacy-notes.ts` loses this importer; it is still imported by `scripts/test-notes-documents-browser.ts`
  and ~8 Playwright specs, all of which drive "Previous notes" and should be resolved under D1.
- Lower the `legacy` floor in `test/quint-checker.test.mjs:32` when the family goes.

## Owner questions

- Should the "packaged licenses contain exactly one React notice at the lockfile version" rule
  (`check-settings-nav-refinement.mjs:237-240`) become a check in `scripts/audit-production-bundle.ts`, or be dropped?
