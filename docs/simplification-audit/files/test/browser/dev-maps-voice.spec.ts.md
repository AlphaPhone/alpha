# test/browser/dev-maps-voice.spec.ts
- Lines: 27 (10 call sites, 13 tests with the loop) | Kind: Playwright `chromium`, dev build; UI navigation with fake geolocation, speech fixtures and a fixture Maps provider configured in-page | Verdict: **MERGE** into `journeys/maps.spec.ts` (2 cases)
- Covers: turn-by-turn voice guidance speaks each step once on fresh fixes, arrival stops speech and clears the watch, mute/enable repeats the current instruction, speech retires on inaccurate fixes, off-route, background and provider loss, pending Cloud synthesis is dropped on mute, another consumer's playback survives Maps leaving, poor initial accuracy stays silent, speech failure offers retry, mid-segment fixes keep guidance, retired callbacks stay silent, guidance continues outside Maps until End. Duplicates: `voice-owned-navigation.spec.ts` (voice ownership while navigating). Callers/importers: `chromium` project; imports `voice-fixture.ts` (`agentBrowserVoice`), `generic-cloud-speech-fixture.ts`, `app-navigation.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10 | P2 | The provider is installed with `configureMapsProvider` imported from `/src/maps/runtime.ts`. That is a provider boundary, but through a module import. | Move to a harness `maps.provider(page, fixture)` that routes the provider's network or bridge. | Low |
| 2 | 13-14, 27 | — | Core journeys: each step spoken once, arrival stops, mute/enable, guidance continues outside Maps until End. | Carry as two cases ("spoken guidance", "guidance outside Maps"). | none |
| 3 | 15 | D9, A7 | The loop's `else if(kind==='home')` branch is unreachable: the array is `['inaccurate','off-route','background','provider']`. | Keep inaccurate and off-route as steps; drop the dead branch, `background` (synthetic event) and `provider` (module call). | none |
| 4 | 16, 18, 21 | P3, T4 | Held Cloud synthesis, other-consumer playback (also in `voice-owned-navigation`), and calling `utterance.onerror()` by hand. | Delete. | Low |
| 5 | 20, 23, 25 | — | Poor initial accuracy, mid-segment fix and End navigation silence. | Fold "poor accuracy stays silent" and "after End nothing speaks" into case 1. | none |
| 6 | 9 | P13 | Init script fakes `permissions` and `geolocation` inline. | Use `context.setGeolocation` plus the harness speech fixture. | none |

## Proposed end state
Two maps journey cases on one harness: start navigation, each instruction spoken once, inaccurate and off-route fixes stop speech, mute then enable repeats the current step, arrival stops speech; leaving Maps keeps guidance until End. Delete the file.
