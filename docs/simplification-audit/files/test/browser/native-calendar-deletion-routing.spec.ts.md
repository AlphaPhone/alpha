# test/browser/native-calendar-deletion-routing.spec.ts
- Lines: 31 | Kind: renderer routing test with in-page prototype patching and a platform flip (T6); project `chromium`, 2 tests (occurrence/series) | Verdict: **MERGE** into `journeys/calendar.spec.ts` (native deletion step), re-based on a native bridge fake
- Covers: on native, deleting a recurring event's occurrence or series inspects with the right scope and stages `removeScoped` with exactly the inspected identity (never the legacy `remove`), leaving the local document untouched. This is the only renderer coverage of `calendar-adapter.ts:393-398`. Duplicates: none. Callers/importers: none; imports `helpers/browser-calendar.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-15 | T6 | Patches `BrowserCalendar.prototype.list/inspect/inspectDeletion/remove/removeScoped` on the browser (dev) provider. | Drive the flag-off Android composition with an `AlphaCalendar` bridge fake that answers `inspectDeletion`/`removeScoped` (the native interface in `native/alpha-calendar.ts`). | Medium |
| 2 | 23 | T6 | `Capacitor.isNativePlatform = () => true` after the browser provider loaded: a half-native renderer that cannot exist. | Covered by item 1 (real Android composition). | Low |
| 3 | 8 | T6 | Seeds the event through `registerPlugin('AlphaCalendar').save` on the web implementation. | Seed through the bridge fake's event list. | none |
| 4 | 11, 14 | A1 | "legacy" here means the non-scoped `remove`; it is the current browser path, not legacy data. | Rename the counter (`unscopedRemoves`). | none |

## Proposed end state
One parameterised test (occurrence / series) in `journeys/calendar.spec.ts` on the shared Android bridge with a typed
`AlphaCalendar` fake. It asserts the staged `removeScoped` identity and that no unscoped remove happens.
