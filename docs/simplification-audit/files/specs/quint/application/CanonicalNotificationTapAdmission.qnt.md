# specs/quint/application/CanonicalNotificationTapAdmission.qnt
- Lines: 141 | Kind: Quint model (live: listed in specs/quint/application/manifest.json, loaded by scripts/quint-lib.ts / check-quint.ts) | Verdict: KEEP model; PORT harness
- Covers: Canonical notification taps: native custody until a mounted, non-busy renderer commits; retired mounts and replaced tokens cannot consume a tap. Duplicates: Aggregate re-run (T4). Notification journeys in Playwright cover the tap path end to end, not the interleavings. Callers/importers: `specs/quint/refinement/application/canonical-notification-tap-admission.mjs`, `test/quint-canonical-notification-tap-admission.test.mjs`, `test/quint-application-refinement.test.mjs` (via `refinement/application/index.mjs`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness 213-220 | T2/T10 | Slices `notifications-adapter.ts` from `export function installCanonicalNotificationTaps` to `/** Active rows only.`, injects `this.inspectCanonical=()=>owner;` before marker `  const tapCurrent=async()=>{` (asserted unique), strips types and runs it in `vm.Script`. | Move tap admission into its own module (e.g. `runtime/notification-tap-admission.ts`) taking ports; import it via `bundledSource`. | Behaviour-preserving extraction in the notifications adapter. |
| 2 | manifest sources | P1 | Sources include `main.tsx`, `connection-ui.tsx` and two Java plugins the harness never loads, so most renderer/Android changes select this model. | Limit sources to the files the harness bundles. | Low. |
| 3 | manifest | T4 | Aggregate duplicate. | Drop from aggregate. | None. |

## Proposed end state
Model unchanged. Admission logic exported from a small module; harness imports it; manifest sources match what is loaded.
