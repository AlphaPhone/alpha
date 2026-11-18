# apps/app/src/startup-permission-flow.ts
- Lines: 109 | Role: Alpha binding of the shared permission walkthrough (`packages/ui/.../permission-walkthrough.ts`): ordered keys, installed storage names, small access readers, the "setup is active" decision (Lemma-verified) and the late Ready-card notice rule (Lemma-verified). | Verdict: SIMPLIFY
- Importers: `main.tsx:54` (`reopenStartupPermissions`, `startupPermissionsActive`), `startup-permissions.tsx:6,10`, `startup-browser-permissions.ts:1` (types), `startup-permission-progress.ts:2`, `prototype/voice-adapter.ts`. Tests: `browser-startup-permissions.test.mjs`, `startup-access-flow.test.mjs`, `startup-permission-completion.test.mjs`, `post-sign-in-setup.test.mjs`, `quint-conformance.test.mjs`, `files-legacy-storage.test.mjs` (`startupFilesAccess`), Playwright `startup-access.spec.ts`. Specs: `quint/refinement/application/contracts.mjs:113`, `portable.mjs:10`.
- Text/path pins: `LemmaScript-files.txt`; `specs/lemma/apps/app/src/startup-permission-flow.dfy(.gen)` from the `//@` blocks of `startupPermissionsActiveCore` (74-79) and `lateReadyNotice` (102-107) incl. `StartupConnectionFacts`, `LateReadyInput`; `specs/lemma/README.md`; `specs/quint/application/manifest.json`; `test/support/feature-parity.mjs:632`. Persisted/installed names: `alpha.startup-permissions.v1`, event `alpha:startup-permissions-reopen` (also in `product/alpha-product-registration.ts:335-336`, `specs/quint/refinement/application/permission-choices.mjs:16`, `startup-permissions-coordinator.mjs:16`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 41-45 + `startup-permissions.tsx:77` | D4 / NEW (strip then re-add) | `startupLocationAccess` destructures upstream `locationAccess()` and drops `requestable`; the only caller then re-adds `requestable: raw.location !== 'denied'` — exactly what upstream returned (`permission-walkthrough.ts` `requestable: row.location !== "denied"`). | Delete `startupLocationAccess`; the caller uses `locationAccess(raw)` directly. | Low. |
| 2 | 25-29 | D4 | `startupPhotoAccess` re-wraps `photoLibraryAccess` minus `scope`. | Delete; caller uses `photoLibraryAccess`. | Low. |
| 3 | 52 | C3 | `defaultStore = () => { try { return globalThis.localStorage ?? null } catch { return null } }` — verbatim twin of upstream `defaultStore` in permission-walkthrough.ts, which `walkthroughMemory(key, event)` already uses when the `store` argument is omitted. | Drop the local helper; call `walkthroughMemory(KEY, EVENT, store ? () => store : undefined)`. | Low. |
| 4 | 55-61 | D7 | `readStartupPermissionMemory`, `writeStartupPermissionMemory` — no product importer (grep: `test/startup-access-flow.test.mjs`, `test/quint-conformance.test.mjs`, `specs/quint/refinement/application/portable.mjs`, `specs/quint/application/README.md`). | Delete; tests call `walkthroughMemory(STARTUP_PERMISSIONS_KEY, STARTUP_PERMISSIONS_REOPEN)` (export the bound `memory` if useful). | Low; update portable.mjs replay. |
| 5 | 50 | A7 | `StartupPermissionMemory` type alias: 0 importers. | Delete. | None. |
| 6 | 22-23 | D4 | `StartupPermissionBridge = PermissionStepBridge`, `StartupPermissionState = PermissionStepState` rename aliases. | Keep only if importers stay; otherwise import upstream names. | None. |
| 7 | 105, 108 | D10 / A1 | `lateReadyNotice` keys behaviour on connection message text: `message?.includes('did not confirm revoking') \|\| message?.includes('check devices')`. No code in apps/ produces "did not confirm revoking" any more (grep: only this file); connection-ui writes "Signed in · check devices" (`connection-ui.tsx:782,795,2155`) and sets `previousSignInUnconfirmed: true` at 782/795 but **not** at 2155. The Lemma `ensures` at 105 proves a property of the dead string. | Set `previousSignInUnconfirmed` at connection-ui.tsx:2155 too, pass that flag in `LateReadyInput` instead of `message`, delete both substring tests; rewrite the Lemma ensures accordingly and regenerate the .dfy. | Medium: Lemma regeneration + connection-ui edit; copy-driven behaviour must be replaced by the flag first. |
| 8 | 64-70 | NEW (adapter for proof) | `startupPermissionsActive` is a field-mapping adapter whose only reason is to feed the Lemma-verified core with plain booleans. | Keep (verification boundary); note in the comment. | — |
| 9 | 34-39 | KEEP | `startupFilesAccess` (`unsupported` → granted on API 29) is product logic with a test. | Keep. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `defaultStore` | helper | 52 | upstream `permission-walkthrough.ts` `defaultStore` | delete (use upstream default) |
| `startupPhotoAccess` / `startupLocationAccess` | helper | 26-45 | upstream `photoLibraryAccess` / `locationAccess` | delete |
| `Store` | type alias | 51 | upstream `WalkthroughStore` | use upstream |
| `StartupConnectionFacts`, `LateReadyInput` | type | 71, 100 | Lemma .dfy | stays (pinned) |
| `STARTUP_PERMISSIONS_KEY`, `STARTUP_PERMISSIONS_REOPEN` | const | 48-49 | `product/alpha-product-registration.ts:335-336`, `startup-permission-progress.ts:11` neighbour, Quint drivers | registration as the single source (research P17), imported here |

## Proposed end state
~65 lines: keys and key types, installed names (imported from the product registration), `startupFilesAccess`, `startupPermissionsActive` + Lemma core, `reopenStartupPermissions`, `createStartupPermissionFlow`, `lateReadyNotice` (flag-based). Deleted: two re-wrapping readers, local `defaultStore`, test-only memory read/write, unused alias.

## Verification
`node --test test/startup-access-flow.test.mjs test/startup-permission-completion.test.mjs test/browser-startup-permissions.test.mjs test/post-sign-in-setup.test.mjs test/quint-conformance.test.mjs test/files-legacy-storage.test.mjs`; Lemma/Dafny for `startup-permission-flow.dfy`; Quint application `PermissionWalkthrough` (contracts.mjs), portable replay; Playwright `startup-access.spec.ts`, `startup-permissions-walkthrough.spec.ts`.
