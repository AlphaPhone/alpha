# specs/quint/refinement/native/listener-service-platform.mjs
- Lines: 89 | Kind: Quint refinement fixture (Android framework/audio stubs layered on `listener-store-platform.mjs`) | Verdict: KEEP (move stubs to files)
- Covers: ports for `listener-service.mjs`, `listener-input(-platform).mjs`, `listener-admission-probe.mjs`. Overwrites the store platform's `Context`, `Intent`, `ComponentName`, `PackageManager`, `Settings` and removes its `Listener`/`ListeningService`/`SenseConfig` stubs (real ones are compiled). Callers/importers: those four files.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-85 | D6 / D8 | ~75 one-line Java stubs in strings, partly replacing the store platform's versions (two definitions of `Context`, `Intent`, `PackageManager` for the same package). | One static `stubs/sense/` folder covering store+service+input, with behaviour flags in the port classes. | Low |
| 2 | 86-88 | — | Mutates the base platform's `paths` array in place and filters by suffix. | Disappears with #1. | None |

## Proposed end state
One stub folder for all listener campaigns; this module removed.
