# apps/app/src/maps/cloud-provider.ts
- Lines: 29 | Role: re-exports the upstream Cloud Maps provider and adds Alpha's Google-content policy (`isGoogleMapsCoverage`, `isGoogleMapsProvider`, `isLocalMapsPlace`) | Verdict: SIMPLIFY
- Importers: 2 app outside the folder (prototype/maps-adapter.ts:16 — upstream `describeMapsDisclosure`, `insideCloudCoverage`, `CloudMapsDisclosure` plus the 3 local helpers; runtime/cloud-protocol.ts:11 type `CloudMapsRoute`, upstream); inside the folder cloud-maps.ts:1, saved-places.ts:2, state.ts:5. scripts/test-cloud-maps.ts:5 (upstream names only), scripts/test-maps-reroute-freshness.ts:9 (local helpers); test/google-maps-content.test.mjs:9; test/maps-navigation.test.mjs:170 (`createCloudMaps`, upstream); test/browser/owner-maps-attribution-refusals.spec.ts:19 (`cloudMapsFailure`, upstream, in-page).
- Text/path pins: specs/quint/refinement/application/map-plane-ownership.mjs:37 reads this file's text and strips `^export \*.*;\n` before vm-running it (T2/T10) — the file must stay self-contained (no imports besides the stripped ones) or that harness breaks; specs/quint/refinement/application/maps-event-return.mjs:217 and services/maps.mjs:28,32 (sourceModule on this path); specs/quint/refinement/services/maps-connection.mjs:31,49 (stub resolution keyed on `'./cloud-provider'` with importer check); specs/quint/services/manifest.json:350,399,4386; specs/quint/legacy/manifest.json:374; test/support/feature-parity.mjs:318.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3 | D4 | `export * from '.../cloud-provider.ts'` — half the importers take only upstream names through this file (runtime/cloud-protocol.ts:11, scripts/test-cloud-maps.ts:5, test/maps-navigation.test.mjs:170, owner-maps-attribution-refusals.spec.ts:19, and 3 of the 6 names in maps-adapter.ts:16) | Drop the `export *`; those importers import upstream through the alias. This file then exports only the three Alpha policy helpers (rename candidate: `google-content-policy.ts`, D11) | Medium: map-plane-ownership.mjs:37 strips the `export *` line by regex — without it the regex is a no-op (harmless); maps.mjs/maps-connection.mjs build the module from this path and use `createCloudMaps` from it — repoint them to upstream |
| 2 | 1-2 | D13 | deep relative import of upstream types | alias | Low |
| 3 | 5 | C6 | `const defaultGoogleProvider = 'eliza-cloud-google'` — only occurrence in the repo; the Cloud default provider id belongs to upstream cloud-provider | Owner question: should upstream export `ELIZA_CLOUD_GOOGLE_PROVIDER`? If so import it; otherwise keep | Low |
| 4 | 17-29 | D9 | `isLocalMapsPlace(place, verifiedProviderId?, isGoogleProvider = isGoogleMapsProvider, live?)` — four positional parameters, two optional in the middle; 6 call sites (state.ts:15, maps-adapter.ts:71,216,221, google-maps-content.test.mjs x13) | Optional: take `{verifiedProviderId, isGoogleProvider, live}` as an options object | Medium for churn (13 test call sites); do it only when touching the callers anyway |
| 5 | 25-27 | D8 | the `liveProviderId` ternary spans three lines with a four-term condition | Extract `const liveMatch = live?.controller.status==='configured' && live.connection.status==='configured' && live.controller.providerId===live.connection.providerId;` | None |

Not findings: the `isGoogleProvider` injection is used in production (prototype/maps-adapter.ts:62,72,98 pass an adapter-level predicate that also remembers Google coverage ids), so it is not test-shaped (D7).

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `defaultGoogleProvider` | const | 5 | none in repo | stays (or upstream constant) |
| `isGoogleMapsCoverage` | helper | 8-10 | none | stays |
| `isGoogleMapsProvider` | helper | 12-14 | adapter wrapper prototype/maps-adapter.ts:62 (adds a remembered-id set) | stays |
| `isLocalMapsPlace` | helper | 17-29 | none | stays |
| inline place type `{origin:'manual'\|'location'\|'saved'\|'provider'; providerId?}` | type | 18 | upstream `SavedPlace`/place origin union in plugin-maps state/contracts | import the upstream origin type if exported |

## Proposed end state
~24 lines: the three policy helpers with the `ProviderConfig`/`CloudMapsCoverage` types imported via alias, no `export *`. Upstream-only importers repointed. Optionally renamed to make the role clear (every path pin above then moves too — do the rename only together with the shim removals).

## Verification
test/google-maps-content.test.mjs; scripts/test-maps-reroute-freshness.ts; test/maps-navigation.test.mjs; quint application map-plane-ownership and maps-event-return, services maps and maps-connection refinements; test/browser/owner-maps-attribution-refusals.spec.ts; `npm run verify`.
