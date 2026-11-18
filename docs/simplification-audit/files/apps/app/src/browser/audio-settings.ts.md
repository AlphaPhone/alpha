# apps/app/src/browser/audio-settings.ts
- Lines: 5 | Role: maps the Alpha media-volume preference onto `.os` audio/video elements. | Verdict: SIMPLIFY
- Importers: 2 (`browser/device.ts:5,41` calls `installBrowserAudioSettings`; `browser/voice.ts:8` imports `browserMediaVolume` only). Text/path pins: `test/browser/dev-sensors.spec.ts`, `test/browser/device-storage-migration.spec.ts` (A1 migration spec), `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4-5 | B4 | `let installed=false; … if(installed)return;installed=true;` — the only caller is `BrowserDevice`'s constructor (`device.ts:41`), constructed once in `register.ts:23`. | Delete the guard. | None |

## Local types and helpers
None.

## Proposed end state
4 lines: `browserMediaVolume()` and an unguarded `installBrowserAudioSettings()`.

## Verification
`test/browser/dev-sensors.spec.ts`.
