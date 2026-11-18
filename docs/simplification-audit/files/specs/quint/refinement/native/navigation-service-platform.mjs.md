# specs/quint/refinement/native/navigation-service-platform.mjs
- Lines: 210 | Kind: Android/Capacitor stub set for the navigation service harness (no product text read) | Verdict: KEEP content; MERGE into a shared Android stub library
- Covers: Deterministic command delivery, PendingIntent identity (`type:action:data:request`), foreground refusal, notification channel/actions and plugin replies for `AlphaNavigationService` + `AlphaMapsTransportPlugin`. Duplicates: the same Android classes are hand-written again in `note-recording-platform.mjs`, `reminder-delivery-platform.mjs`, `resident-platform.mjs`, `main-activity-platform.mjs` and others. Callers/importers: only `native/navigation-service.mjs:4`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-205 | C5 | `Intent`, `Context`, `PendingIntent`, `Notification(.Builder)`, `Service`, `Plugin`, `PluginCall` stand-ins duplicated per harness, each slightly different. | One stub library with per-harness hooks (static port classes already exist: `NavigationServicePorts`). | Medium (behaviour of each stub differs; merge carefully) |
| 2 | 199-204 | — | Stubs `MainActivity.consumeNavigationOpen/clearNavigationOpen` and `AlphaAssistActivity`/`AlphaPowerVoiceActivity` (kept, D7). When `NavigationOpenRequest` folds into `MainActivity` (delete-candidates A63) these stubs must follow. | Update with that change. | Low |
| 3 | 206-209 | C5 | Same temp-dir write/close boilerplate as every platform. | Shared helper. | None |

## Proposed end state
A short file that declares only navigation-specific stubs (or none) on top of the shared Android stub set.
