# apps/app/src/runtime/hosted-background.ts
- Lines: 42 | Role: native background scheduling for hosted digest results (begin/configure/cancel reservation) and the native result inbox. | Verdict: SIMPLIFY (and absorb digest-inbox.ts)
- Importers: 3 product (`runtime/connection-ui.tsx` – `pauseHostedBackground`, `runtime/hosted-digest-ui.tsx`, `runtime/mock-admission.ts`). Text/path pins: `specs/quint/application/manifest.json`, `specs/quint/refinement/application/hosted-background-admission.mjs`, `hosted-digest-refresh.mjs`, `scripts/test-connection-history.ts`, `test/connection-presentation-state.test.mjs`, `test/connection-step-contracts.test.mjs`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-13 | C2 | `NativeInbox` interface typed locally for `AlphaHostedResults`; the same plugin is typed again in `runtime/hosted-result-notices.ts:19`, `runtime/hosted-digest-ui.tsx:71`, `prototype/workflow-adapter.ts:266`, and implemented for web in `browser/register-hosted-results.ts`. | One typed `hosted-results-plugin.ts` exporting the full interface and the registered instance; all four files import it. | Low |
| 2 | 35 | B1 | `catch(error){await cancel();signal.throwIfAborted();return false;}`: any native failure becomes `false`; if `cancel()` itself rejects, the original error is lost. | Keep `false` (specified "not configured") but `await cancel().catch(()=>{})` and comment the contract. | Low |
| 3 | 21-24 | D9 | Re-assigns the `signal` parameter to an internal controller's signal. | Use a named `local` signal; clearer. | None |
| 4 | — | C5 | `digest-inbox.ts` (10 lines) declares `ResultInbox`, which `NativeResultInbox` implements here. | Move `ResultInbox` and `createDigestInbox` here. | Low |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `NativeInbox` | interface | 5-12 | `HostedResultNative` (`hosted-result-notices.ts`), `ApprovalNoticeNative` (`workflow-adapter.ts:266`), inline type in `hosted-digest-ui.tsx:71` | `hosted-results-plugin.ts` |
| `configuring` | const (Map) | 14 | no | stay |

## Proposed end state
Background reservation functions, `NativeResultInbox`, `ResultInbox`, `createDigestInbox`; plugin type imported from one module. ~50 lines.

## Verification
Quint `hosted-background-admission.mjs`, `hosted-digest-refresh.mjs`; `scripts/test-connection-history.ts`; `test/connection-step-contracts.test.mjs`; Android hosted results instrumentation if present.
