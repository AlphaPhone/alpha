# capacitor.config.ts
- Lines: 12 | Role: Capacitor CLI configuration: app id and name come from `app.config.json`, web output dir `web-dist`, logging off, SystemBars plugin config, https Android scheme, Android project path. | Verdict: KEEP
- Importers: no TS importer. Capacitor CLI reads it during `cap sync` (android packaging), and `tsconfig.json:124` type-checks it. Text/path pins: `scripts/quint-lib.ts:34` lists it as a source input; `scripts/source-snapshot.ts:5` lists it; `test/owner-merge-review.test.mjs:30,42,50-57` uses the *filename* inside synthetic diffs (it does not read the file, so renaming or editing the file does not affect that test).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10 | B4 (redundant default) | `android: { path: "android", allowMixedContent: false }`: `path: "android"` and `allowMixedContent: false` are both Capacitor 8.5.2 defaults. | Optional: drop both keys, or keep `android` only if an owner wants the security setting written down. This saves 1 line, so it is worth doing only in the same commit as other edits. | Very low. `npx cap sync android` must produce an identical `android/app/src/main/assets/capacitor.config.json`. |
| 2 | 9 | none (keep) | `server: { androidScheme: "https" }` is also the Capacitor 6+ default. **Keep it.** It pins the WebView origin (`https://localhost`), and every IndexedDB, localStorage and document-store record is keyed by that origin. If the default ever changed, user data would be lost. | None. Optionally add a one-line comment saying why it is there. | n/a |
| 3 | 8 | NEW-ish / owner question | `plugins: { SystemBars: { style: "LIGHT", insetsHandling: "disable" } }` configures Capacitor's built-in SystemBars. The renderer drives bar appearance in two ways: `@capacitor/core` `SystemBars.setStyle` (`apps/app/src/prototype/agent-adapter.ts:80,1534-1535`) and the `AlphaDevice.setSystemBarAppearance` bridge (`apps/app/src/prototype/system-bar-appearance.ts`, `main.tsx:181`). | None in this file. The duplicate mechanism belongs to those files' reports (C5). This config must stay as long as `SystemBars.setStyle` is used. | n/a |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `config` | const | 3-11 | none | stays |
| `identity` (JSON import) | import | 2 | ~31 scripts each re-read `app.config.json` with their own expression (see `files/app.config.json.md` finding 1). This file already uses the clean form `import … with { type: "json" }`, which is the model for the proposed `scripts/lib/app-identity.ts` and for `vite.config.ts:18-19`. | stays |

## Proposed end state
Unchanged, or 11 lines if the two default keys on line 10 are dropped. This file is already minimal and correct. It is also the reference pattern for reading `app.config.json` that `vite.config.ts` should copy.

## Verification
`npm run android:build:local` (its `cap sync` step) for both distribution variants. Diff the generated `android/app/src/main/assets/capacitor.config.json` before and after. Also run `npm run typecheck`.
