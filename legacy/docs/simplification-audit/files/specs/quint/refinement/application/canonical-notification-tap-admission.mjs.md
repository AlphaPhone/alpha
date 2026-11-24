# specs/quint/refinement/application/canonical-notification-tap-admission.mjs
- Lines: 268 | Kind: Quint refinement harness, source transplant (slices product text, strips types, runs in `vm` with fake globals) | Verdict: PORT
- Covers: Android canonical notification tap admission in `installCanonicalNotificationTaps` (`apps/app/src/prototype/notifications-adapter.ts:20-89`): one native read at a time, owner/agent match, protected-editor and busy refusal, origin-change refusal, exact-history restore, commit-then-acknowledge with compare-and-clear token, mount lifetime fencing. Duplicates: `test/canonical-notification-security.test.mjs` (host test on the same tap path; check before keeping both). Callers: `test/quint-canonical-notification-tap-admission.test.mjs`, `index.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 212-221 | T10 / T2 | Reads `notifications-adapter.ts` as text, slices from `export function installCanonicalNotificationTaps` to `/** Active rows only.`, strips `export `, asserts one occurrence of `  const tapCurrent=async()=>{` and injects `this.inspectCanonical=()=>owner;` before it, then `stripTypeScriptTypes` + `vm.Script`. Breaks on reformat, on a comment change at l.90, or on any rename. | PORT: export a factory from the product, e.g. `createCanonicalTapOwner(shell, deps)` returning `{tap, wake, stop, inspect}` where `deps = {native, connectionController, alphaClient, isNative, isMvpView, document, window}`; `installCanonicalNotificationTaps(Component)` calls it with the real modules. The harness then imports the module (esbuild bundle) and passes its controlled ports. Needed exports: the factory (and the `views` route map if tested). | M |
| 2 | 52-74 | T2 | `vm.createContext` supplies `native`, `Capacitor`, `isMvpView`, `alphaClient`, `connectionController`, `document`, `window` by global name, i.e. it depends on the module's private variable names. | Disappears with the factory (explicit deps). | M |
| 3 | 76-88 | — | Fake `Shell` class with `S`, `openView`, `setState` is a reasonable port. | Keep. | — |
| 4 | 208-211 | T10 (weak) | Source list hashes `main.tsx`, `connection-ui.tsx` and two Android Java files that the harness does not execute. | Drop from inputs (they pin nothing executed). | L |
| 5 | 264-267 | — | Assumptions list "installed tap expiry, foreground delivery and the real resident read effect remain separate". | None. | — |

## Proposed end state
Product exports a tap-owner factory with injected ports; harness bundles and calls it, no slicing, no vm.
Same eight schedules; inputs are the bundled module graph plus the model.
