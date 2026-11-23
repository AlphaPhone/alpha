# apps/app/src/maps/resident-relay.ts
- Lines: 25 | Role: offers device Maps navigation to the resident agent during one conversation turn through the upstream `withMapsNavigationRelay`, dispatching `select`/`start`/`reroute`/`stop` operations | Verdict: SIMPLIFY (small)
- Importers: 1 app (runtime/connection-ui.tsx:21); scripts/test-connection-history.ts:42 and scripts/test-maps-device-navigation.ts:8.
- Text/path pins: specs/quint/services/manifest.json:407,5141 and symbol pins :5147-5159 (`activeOffer`, `withResidentMapsNavigation`, `connected`, `withMapsNavigationRelay`); specs/quint/refinement/services/resident-maps-relay-offer.mjs:3,28 (compiles `export {withResidentMapsNavigation} from './apps/app/src/maps/resident-relay.ts'`); test/support/feature-parity.mjs:327.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7 | C1 | `type Request = (path: string, body: unknown, signal: AbortSignal) => Promise<unknown>` — same type in runtime/view-navigation.ts:12 and runtime/device-view-profile.ts:7 (body optional there) | Export one `OwnerRequest` type from runtime/alpha-client.ts (research n–z §4) and import it | Low |
| 2 | 15-20 | D9 | Four `if(operation?.kind===...)` lines after a hand-rolled plain-object guard `value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:undefined` | `switch (operation?.kind)`; reuse the shared `asRecord()` plain-object guard (C3, ~35 copies repo-wide). The guard itself is legitimate — `value` arrives from the agent over the wire (trust boundary) | Low |
| 3 | 16-17 | B3 (inverse) | `operation.place as AgentPlaceRef` and `operation.request as {...}` are unchecked casts at the trust boundary | Confirm that upstream `navigation.select/start` validate their input (they do in device-navigation's `DeviceMapsNavigation`, which throws `DeviceNavigationFailure`); if so, keep the casts and say so in one comment | Low |
| 4 | 23 | D8 | `connected(value,id){if(value){...}else if(activeOffer===id){...}}` on one line | Format over 4 lines; keep the pinned names `connected`, `activeOffer` | None |
| 5 | 1-5 | D13 | upstream imports through the local shims `./agent-navigation.ts`, `./device-navigation.ts`, `./contracts.ts` | Import upstream via alias once those shims are deleted | Low |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `Request` | type | 7 | runtime/view-navigation.ts:12, runtime/device-view-profile.ts:7 | `OwnerRequest` in runtime/alpha-client.ts |
| plain-object guard (inline) | helper | 15 | remote-protocol.ts:65, view-navigation.ts:22, native-calendar-sync.ts:14, owner-reminder-notification-protocol.ts:24, ~35 repo-wide | shared `asRecord()` in `apps/app/src/lib/` |
| `activeOffer` | module state | 8 | none | stays (pinned) |

## Proposed end state
~22 lines: shared `OwnerRequest` type, `asRecord` + `switch` dispatch, formatted `connected` callback, alias imports. Behaviour and pinned names unchanged.

## Verification
scripts/test-maps-device-navigation.ts, scripts/test-connection-history.ts (via their test shims); quint services resident-maps-relay-offer refinement; `npm run verify`.
