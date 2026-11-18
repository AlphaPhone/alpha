# apps/app/src/startup-permission-progress.ts
- Lines: 23 | Role: Alpha's installed walkthrough progress record (`alpha:startup-permission-walkthrough:v1`) bound to the shared `walkthroughProgress`, with version→step-count maps for native and browser. | Verdict: SIMPLIFY
- Importers: `startup-permissions.tsx:11` (`readStartupPermissionProgress`, `writeStartupPermissionProgress`, `startupPermissionProgressKey`). Tests: `test/startup-permission-completion.test.mjs`, `test/product-identity.test.mjs` (key string). Specs: `quint/refinement/application/contracts.mjs:114` (`permissionWalkthrough` writes version 4), `permission-choices.mjs:15`, `startup-permissions-coordinator.mjs:15` (key literal).
- Text/path pins: `specs/quint/application/manifest.json` (path); `test/support/feature-parity.mjs:633`; the key literal also in `product/alpha-product-registration.ts`, `android/.../AppNavigation.java`, `scripts/test-inbox-drafts-browser.ts`, several Playwright specs (`browser-cloud-dev`, `cloud-notes-voice-fixture`, `context-selection`, `flag-off-android`, `startup-permissions-walkthrough`) — the key and the written shapes `{version:4,…}` (native) / `{version:1,…}` (browser) must stay.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-10, 13-14 | A1 | Native map `{1: 4, 2: 5, 3: 6, 4: 7}` keeps three historical native progress versions ("2 the historical five-step native list", "completed historical installations stay completed"). The package was renamed and starts with empty data; no install can hold v1-v3 native progress. | Native: `walkthroughProgress(KEY, {4: nativeStartupPermissionKeys.length}, 4)`. Browser keeps `{1: 4}` (it is the *current* browser format). Type `version: 1 \| 4`. Delete tests `startup-permission-completion.test.mjs:63` ("legacy skipped choices …"), `:66` ("historical completed v1/v2 …"), `:68` ("… unfinished v3 progress continues as v4"). | Low; Quint contracts.mjs already uses version 4 only. |
| 2 | 12-13 | A7 | `StartupPermissionChoice` (0 importers) and `StartupPermissionProgress` (used only here). | Delete `StartupPermissionChoice`; keep `StartupPermissionProgress` local or use upstream `WalkthroughProgress`. | None. |
| 3 | 11 | C6 | Key literal duplicated in `alpha-product-registration.ts` (research: startup permission keys in three places). | Import from the product registration. | Low. |
| 4 | 18 | NEW (cast) | `read(...) as StartupPermissionProgress` cast to narrow `version`. | With one version per platform the cast becomes accurate; acceptable. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `startupPermissionProgressKey` | const | 11 | `product/alpha-product-registration.ts`, Quint drivers, Playwright specs | product registration |
| `StartupPermissionChoice` | type alias | 12 | upstream `WalkthroughChoice` | delete |
| `StartupPermissionProgress` | type | 13 | upstream `WalkthroughProgress`; `startup-permissions.tsx:37` local `Progress` (in-memory shape) | stays |

## Proposed end state
~14 lines: key (imported), two `walkthroughProgress` bindings with only the current version each, read/write functions. Written formats unchanged byte-for-byte.

## Verification
`node --test test/startup-permission-completion.test.mjs test/product-identity.test.mjs`; Quint `PermissionWalkthrough` (contracts.mjs), `permission-choices`, `startup-permissions-coordinator`; Playwright `startup-permissions-walkthrough.spec.ts`.
