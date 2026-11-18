# android/app/src/main/java/ai/alphacompute/alphaphone/LateLaunch.java
- Lines: 21 | Role: rejects a Capacitor call whose activity launcher was unregistered (activity destroyed) instead of crashing the bridge thread | Verdict: KEEP (until P18 upstream fix)
- Importers: 10 main files (`LateLaunch.ask` 18 uses in AlphaCalendar/DeviceApps/Files/HostedResults/System/VoiceCloud/DailyApps; `LateLaunch.CLOSED` in Contacts/PhotoLibrary/Photos). Text/path pins: `test/error-boundary-home-escape.test.mjs`, `test/native-deletion-admission.test.mjs`, `test/native-plugin-teardown.test.mjs`, `specs/quint/refinement/native/app-info-handoff-platform.mjs`, `note-bridge-platform.mjs`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 17-20 | P18 (android) / C4 | Workaround applied per plugin method (`requestPermissions`, `requestRole`, …) in 10 subclasses; same "call after destroy" family as `PluginWorkers` and `closedMessage()` overrides. | Fix once in the upstream base plugin (or one Alpha base plugin class that wraps `startActivityForResult`/permission launches); then delete this file and its 21 call sites. Requires a reviewed upstream commit (AGENTS.md). | Medium (crash regression if a site is missed). |
| 2 | 13-14 | — | `CLOSED` copy is user-visible; three plugins reject with it directly. | Keep the string byte-for-byte wherever it moves. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `ask(PluginCall, Runnable)` | helper | 17-20 | `PluginWorkers.submit` (same closed-bridge concern, executor flavour) | Alpha base plugin `background()/launch()` (P10/P18) |
| `CLOSED` | const | 14 | — | same base class |

## Proposed end state
Unchanged now; disappears into the base-plugin helper when P10/P18 land (together with `PluginWorkers`).

## Verification
`test/native-plugin-teardown.test.mjs`, `test/error-boundary-home-escape.test.mjs`, instrumentation that destroys the activity mid-call.
