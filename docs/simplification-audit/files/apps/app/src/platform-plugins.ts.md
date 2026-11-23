# apps/app/src/platform-plugins.ts
- Lines: 8 | Role: memoised `registerPlugin(name, impl?)` so every module shares one Capacitor proxy per plugin name (the first registration wins) | Verdict: KEEP (extend: late web implementation + typed helpers)
- Importers: ~75 app files (every `registerPlugin` user in browser/, prototype/, runtime/, maps/, passwords/, main.tsx, daily.ts, native.ts, local-speech-playback.ts). test/browser/browser-voice-registration.spec.ts:5 imports `/src/platform-plugins.ts` in-page.
- Text/path pins: specs/quint/application/manifest.json:17,2304 (sources); test/support/feature-parity.mjs:337; stubbed by specifier in scripts/test-inbox-multiple-drafts.ts:18, specs/quint/refinement/application/calendar-adapter-fixture.mjs:16 (`/platform-plugins$/`), files-recent-index.mjs:28 (`'../platform-plugins'`); preloaded by URL in specs/quint/legacy/files-browser/check-files-browser-refinement.mjs:27-29 and legacy/notes-view/check-notes-view-refinement.mjs:264-283. Renaming or moving this file breaks all of them; keep the path.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4-7 | NEW (import-order coupling, research browser P12) | `if(!plugin){plugin=capacitorRegister(name,implementations);registered.set(name,plugin);}` — a later call with a `web` implementation is silently ignored, so browser registration must run before any plain `registerPlugin('X')` (comments in browser/register.ts:17 and register-hosted-results.ts:4-6 defend the order; main.tsx:1 already violates the "first import" claim) | When a later call supplies `implementations` and the cached proxy was created without one, throw in development (`devSurfacesEnabled`) so ordering bugs surface, or register web implementations in a separate entry evaluated first. Then delete register-hosted-results.ts and the ordering comments | Medium — needs a browser smoke run; production Android never passes web implementations |
| 2 | — | C2 / C3 | No typed per-plugin exports: each caller supplies its own `T` (16 `registerPlugin<any>` calls repo-wide; `AlphaVoiceCloud` typed 16 ways, `AlphaDevice` 18 call sites, `ElizaSystem` 5) | Keep this file as the low-level registrar; add `native/plugins.ts` exporting one typed handle per plugin (research n–z P7) and ban direct `registerPlugin` calls outside it (lint rule or grep test) | Low (types only), large mechanical diff |
| 3 | — | C3 | PluginHeaders sniffing is re-implemented in native.ts:21, runtime/native-connection.ts:14,18,25,217, main.tsx:369 | Add `pluginHasMethod(name, method)` here (one cast) and use it everywhere | Low |
| 4 | 1 | — | `workflow-presentation.ts:46` calls `@capacitor/core` `registerPlugin` directly, bypassing this cache | Route it through this module | Low |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `registerPlugin` | helper | 4-8 | direct `@capacitor/core` use in runtime/workflow-presentation.ts:46 | stays |
| `registered` | const | 2 | none | stays |
| (proposed) `pluginHasMethod` | helper | — | native.ts:21, native-connection.ts:14,18,25,217, main.tsx:369 | here |

## Proposed end state
~15 lines: the cache, a development-time error on a late web implementation (or attach semantics), and `pluginHasMethod`. Typed handles live in `native/plugins.ts`.

## Verification
test/browser/browser-voice-registration.spec.ts; any browser spec in `?mode=dev` (all depend on web registrations); quint launcher drawer model; Android build (native registration unaffected).
