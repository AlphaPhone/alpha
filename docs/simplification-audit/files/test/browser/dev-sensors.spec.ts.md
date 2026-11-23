# test/browser/dev-sensors.spec.ts
- Lines: 28 (9 KB) | Kind: Playwright, chromium; 5 module-in-page tests of `AlphaDevice`/`AlphaVoiceCloud`/`ElizaLocation` stand-ins (T6/P7), 2 UI cases | Verdict: REWRITE: case 4 into `journeys/settings.spec.ts`, case 7 into `journeys/notes.spec.ts`; delete the rest
- Covers: disabling microphone/location sensors cancels pending permission requests, stops live tracks, clears geolocation watches; shade and privacy settings share switches; media volume; Notes recorder stops when the microphone is disabled. Duplicates: `dev-location.spec.ts` (location stand-in), `notes-audio-journey.spec.ts` / `canonical-notes.spec.ts` (recorder). Callers: chromium only. Helpers: `helpers/legacy-notes.ts`, `cloud-voice-fixture.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-13, 18-24 | T6, P7 | Redefines `navigator.mediaDevices.getUserMedia`, `navigator.geolocation.watchPosition/clearWatch`, `navigator.permissions.query`, then calls stand-in plugins in-page and checks returned objects. Android owns these rules natively. | Delete. | Low for product; the browser stand-in loses its check, which is the intent (P7). |
| 2 | 4 | B4 | `Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:navigator.mediaDevices})` in every test so later tests can redefine members. | Gone. | None. |
| 3 | 19 | T6 | Constructs `BrowserVideoCapture` directly with a fake `{srcObject,readyState…} as any` element. | Delete (unit test). | Low. |
| 4 | 14-17 | — | Shade "Agent can listen" toggle reflected in privacy settings and persisted across reload. | Carry (UI half; replace raw `devicePreferencesDocument.readRaw()` with the visible switch state after reload). | None. |
| 5 | 25-28 | A1 | Notes recorder case uses `openLegacyNotes` ("Previous notes"), which goes with the legacy Notes deletion (A2/D1). | Re-target at canonical Notes in `journeys/notes.spec.ts`; disable microphone through the shade instead of `setSensor` in-page. | Medium: only check that the recorder exits on sensor disable. |

## Proposed end state
Two cases survive in journeys (shade microphone switch persists and appears in privacy settings; canonical Notes recorder stops with "The microphone stopped." when the microphone is switched off). File deleted.
