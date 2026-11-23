# apps/app/src/maps/saved-places.ts
- Lines: 18 | Role: binds upstream `SavedPlaces` to Alpha's installed storage key `alpha.maps.saved-places.v1` and refuses to save Google Maps results | Verdict: KEEP (alias import only)
- Importers: 4 app (prototype/maps-adapter.ts:18, browser/location-simulation.ts:5, browser/workflow-location.ts:3, browser/workflow-trigger-runtime.ts:6); maps/state.ts:4; scripts/test-maps-reroute-freshness.ts:8; test/google-maps-content.test.mjs:10; in-page imports in test/browser/dev-location.spec.ts:4,8,18, dev-workflow-triggers.spec.ts:19, location-settings-recovery.spec.ts:38 (monkey-patches `SavedPlaces.prototype.read`, T6).
- Text/path pins: test/browser/maps-list-focus.spec.ts:6 lists this path in a source list; test/support/feature-parity.mjs:330.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10 | C6 | `super('alpha.maps.saved-places.v1', storage)` — persisted key, written today; only occurrence in the repo | Keep byte-for-byte. Optionally list it in `ALPHA_PRODUCT_REGISTRATION.storage.retained` so the registry is the one source of installed keys (see alpha-product-registration report) | Low |
| 2 | 1, 4 | D13 | deep relative imports | alias | Low |
| 3 | 9 | — | `isGoogleProvider` injection is used in production (prototype/maps-adapter.ts:98) | keep | — |

User-visible copy to keep: `'Google Maps results cannot be saved on this device.'`.

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `SavedPlaces` | class | 6-18 | upstream base | stays |

## Proposed end state
Unchanged except alias imports. ~17 lines.

## Verification
test/google-maps-content.test.mjs; test/browser/dev-location.spec.ts, location-settings-recovery.spec.ts, maps-list-focus.spec.ts; scripts/test-maps-reroute-freshness.ts.
