# apps/app/src/maps/state.ts
- Lines: 37 | Role: Alpha subclass of upstream `MapsController` — composes Alpha's `SavedPlaces` and `NativeMapsLocation` and drops a provider-sourced origin when the provider changes or the origin is a non-local (Google) saved place | Verdict: KEEP (alias import, small tidy)
- Importers: 1 app (prototype/maps-adapter.ts:29); test/google-maps-content.test.mjs:11; test/browser/maps-list-focus.spec.ts:24 (in-page).
- Text/path pins: specs/quint/application/manifest.json:2836; specs/quint/native/manifest.json:633,3685 and symbol pin :3705 (`NativeMapsLocation` usage in this file); specs/quint/services/manifest.json:408,4506 and symbol pin :4539 (`MapsController`); test/browser/maps-list-focus.spec.ts:5 (source list); test/support/feature-parity.mjs:333.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10 | D8 | Constructor signature of five positional params with defaults on one 220-char line | Wrap one parameter per line | None |
| 2 | 15-17 | D9 | `'label' in candidate && !isLocalMapsPlace({origin:'saved', providerId:candidate.providerId}, config.status === 'configured' ? config.providerId : undefined, this.isGoogleProvider)` | Extract `private remoteSavedOrigin(candidate)` predicate | None |
| 3 | 1, 6 | D13 | deep relative imports | alias | Low |
| 4 | 10 | — | `isGoogleProvider` default + injection used by maps-adapter.ts:98 | keep | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `MapsController` | class | 8-37 | upstream base | stays |
| `originProviderId` | field | 9 | none | stays |

## Proposed end state
~38 lines (formatting adds a few, predicate extraction removes a few). Same behaviour.

## Verification
test/google-maps-content.test.mjs; test/browser/maps-list-focus.spec.ts; quint native maps-location and services maps-screen refinements.
