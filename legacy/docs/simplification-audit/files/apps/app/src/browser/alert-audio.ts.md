# apps/app/src/browser/alert-audio.ts
- Lines: 12 | Role: Web Audio beep for ring/alarm streams, primed on first user gesture, honouring device preferences. | Verdict: KEEP (minor)
- Importers: 1 (`browser/clock.ts:6`). Text/path pins: `specs/quint/application/manifest.json:6404` (file path in the alarm-owner model), `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7 | C3 | `document.hidden\|\|document.documentElement.dataset.devBackground==='true'` — the "page hidden or dev-background" predicate, one of 13 inline copies in `browser/` (also `clock.ts:39`, `notice-action.ts:2`). | Call the shared `foregroundBlocked()` (P5 module, e.g. `screen-locked.ts`). | Low |
| 2 | 5, 11 | B1 | `try{this.context??=new AudioContext();void this.context.resume().catch(()=>{});}catch{}` and `try{tone.stop();}catch{}`. The constructor/resume fallback (no sound) is the specified behaviour; `tone.stop()` throws only for an already-stopped node. | Keep, add a one-line comment naming the fallback ("no audio device: alerts stay silent"). | — |
| 3 | 8 | B3 | `Number(settings[stream]??70)` then clamps 0..100 — `cachedDevicePreferences()` already returns validated preferences (`device-preferences.ts` validator). | `const volume=(settings[stream]??70)/100`. | Low |

## Local types and helpers
None.

## Proposed end state
Unchanged class, ~11 lines; shared foreground predicate; no re-clamping of validated preferences.

## Verification
`test/browser/journey-c-alarms.spec.ts`, `test/browser/dev-clock.spec.ts`; Quint alarm-owner model in `specs/quint/application` (path pin only).
