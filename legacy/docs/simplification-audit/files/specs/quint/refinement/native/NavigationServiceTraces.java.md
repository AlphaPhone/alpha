# specs/quint/refinement/native/NavigationServiceTraces.java
- Lines: 231 | Kind: Quint refinement harness (whole `AlphaNavigationService` + `AlphaMapsTransportPlugin` + `PluginWorkers` compiled against generated Android/Capacitor stubs) | Verdict: PORT (observation side; scenarios KEEP)
- Covers: live model `specs/quint/native/NativeNavigationOwnership.qnt`: Maps foreground-navigation ownership across two renderer bridges: stale start/stop/update commands, notification Stop authority (saved PendingIntent, same public id reused), stop fallback with a successor, task removal by root component (HOME/launcher/assistant/power/missing), foreground refusal, dispatch failure after replacement, admission racing renderer destruction. 27 scenarios. Duplicates: androidTest `MapsBackgroundNavigationInstrumentedTest` covers the device path (uses `snapshot()` too). Same campaign runs in `test/quint-native-navigation-ownership.test.mjs` and the native aggregate (`index.mjs:170`).
- Callers/importers: `navigation-service.mjs` (`checkNativeNavigationOwnership`, `navigationServiceScenarios`).

## How it is tied to product code
- Compiles whole files (no text slicing): `AlphaNavigationService.java`, `AlphaMapsTransportPlugin.java`, `PluginWorkers.java`, real Capacitor `JSObject.java`.
- Pins by reflection / package access: `AlphaNavigationService.snapshot()` (52), private statics `active` (35) and `lock` (166), session fields `authority`, `owner`, `rootComponent`, service field `owned`, plugin fields `destroyed`, `navigationStops`; constants `ACTION_STOP`, `EXTRA_SESSION`, `EXTRA_AUTHORITY`.
- The stub `Plugin` carries `fixtureOwner`/`fixtureActivity`; stub `Service` carries `foreground`, `notification`, `latestStartId`, call counters.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 52, 69-71 | D7 / T10 | Observes `AlphaNavigationService.snapshot()` (`stopCount`, `lastStopReason`, `lastTitle`, `lastText`), which exists only for this harness and one androidTest (delete-candidates B27; product report finding 1 deletes it). | Observe `activeSession()` plus the stub service's posted notification title/text and the captured `navigationStopped` events (already recorded) instead; derive `terminalStops`/`lastReason` from `NavigationServicePorts.events`. Update the model's observed fields if a field cannot be derived. Land in the same change as B27. | Medium: model field mapping changes. |
| 2 | 34-36, 64-67, 165-167 | T10 (reflection) | Private field names `active`, `lock`, `owned`, `authority`, `owner`, `rootComponent`, `destroyed`, `navigationStops` are part of the contract. | Keep, but list them in a header comment so product renames find them; or add package-private read accessors only if the product already needs them. | Low |
| 3 | stub 20-23 | A7 (follow-up) | Base64/transport stubs exist because `AlphaMapsTransportPlugin` still holds the dev regional transport (B28 moves it to a testMocks subclass). | After B28, drop the `Base64` stub and the "regional transport disabled" assumption. | Low |
| 4 | 190-226 | D9 | 27 one-line scenario chains in a `switch`. Readable as a script. | None. | None |
| 5 | campaign | T4 / P3 | Runs in the per-model test and in the aggregate. | One runner. | None |

## Proposed end state
Keep all 27 scenarios and the whole-class compile (this is already the robust import style). Stop reading
`snapshot()` so the product test hook can go (B27), observing the active session id, the stub notification and the
stop events instead. Remove the transport stubs once the Maps dev transport moves to testMocks. Run from the native
family runner only.
