# test/maps-notification-open.test.mjs
- Lines: 42 | Kind: unit of `runtime/maps-notification-open.ts` with stub ports (8-30) + host-javac unit of `NavigationOpenRequest.java` with `test/fixtures/NavigationOpenRequestTest.java` (31-36) + source-text over `MainActivity.java` (37-41) | Verdict: DELETE
- Covers: tapping the navigation notification opens Maps once, after the shell is safe, and never replays after HOME. Duplicates: Quint `specs/quint/refinement/application/maps-event-return.mjs` and `map-plane-ownership.mjs` import `maps-notification-open`; `specs/quint/refinement/native/main-activity-platform.mjs`, `home-instance-handoff.mjs`, `assistant-entry.mjs`, `renderer-background-rebuild.mjs` compile `NavigationOpenRequest`. Callers/importers: `npm test` glob; it is the only user of `test/fixtures/NavigationOpenRequestTest.java`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-30 | T3 / T4 | Stub-port unit test of a class the maps refinements execute. | Delete. | Low |
| 2 | 31-36 | T3 / T4 | javac of one class + fixture main; the native refinements compile the same class. | Delete with `test/fixtures/NavigationOpenRequestTest.java`. | Low |
| 3 | 37-41 | T1 | Regex over `MainActivity.java`. | Delete. | None |

## Proposed end state
File and its Java fixture deleted. The real tap path is an instrumentation/device item (Maps notification), not provable on host.
