# android/app/src/androidTest/java/ai/alphacompute/alphaphone/ConnectionInstrumentedTest.java
- Lines: 287 | Role: `AlphaConnection` bridge integration: flag-off route refusal, native-only slot isolation, compare-exchange drafts across recreation, encrypted credentials + loopback HTTP (capability header, redirect refusal, cancellation), view-profile HTTP with identity/conditional revision. | Verdict: SIMPLIFY
- Importers: none. Text/path pins: `scripts/ci/pending-recovery-ui.py:24` names three methods (`encryptedCredentialsAndHttpSurviveRecreationWithCancellationAndRedirectRejection`, `enabledViewProfileHttpPreservesAuthenticationAndConditionalRevision`, `reservedNativeSlotsRejectEveryPublicStorageOperation` with gate `nativeSlotIsolation`), asserted by `scripts/ci/test-pending-recovery-phases.py:95,100`; comment pin in `test/native-secure-slots.test.mjs:218`. No `CLASS_REGISTRY` entry: `productionTransportRejects…` and `localDraftCompareExchange…` run only under `--all` (no named runner).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 50-64 | T4 | `productionTransportRejectsRemoteCloudAndUnapprovedRoutesBeforeConnecting` duplicates `ConnectionRoutesInstrumentedTest.flagOffTransportRefusesEveryNonCloudRouteBeforeConnecting` (same flag-off gate, same refusal at VALIDATE with `-1` status; ConnectionRoutes also checks slot files and is the registered runner class) | Delete this method; add its two distinct URLs (`api.eliza.app/api/v1/eliza/unreviewed-service`, `/eliza/google/disconnect`) to ConnectionRoutes' refused list | Low |
| 2 | 25-29 | C3 | `slotHash` SHA-256 hex (also ConnectionRoutes:51, Combined*:26, DeviceAction:43, ~32 androidTest files use `MessageDigest`) | Use `AlphaCredentialStore.slotHash` (already public-ish: used by HostedBackgroundWorker:38 `storage.slotHash(...)`) | Low |
| 3 | 30-48 | C3 / T7 | Private `until`/`begin`/`result`/`invoke`/`ready` bridge-capture helpers | `WebViewTestDriver.call` | Low |
| 4 | 131-162, 221-258 | C3 / C5 | Two different hand-written loopback HTTP servers in one file (threaded handler; strict single-thread parser) | One `LoopbackHttp` server helper shared with CloudVoice, Hosted* | Low |
| 5 | 98, 168, 207 | C6 | `"connection-credentials/"+hash` file path rebuilt 3× | `AlphaCredentialStore.slotFile(slotHash(slot))` (used in HostedBackgroundWorker) | None |
| 6 | 156, 159 | B1 | `catch (Exception ignored) { /* Cancellation intentionally closes the client socket. */ }` / `catch (Exception ignored) { if (server.isClosed()) return; }` | Keep (documented test-server shutdown) — goes away with #4 | — |
| 7 | 183, 190 | D8 | 13 and 18 capability strings on one line each | One per line / static arrays | None |
| 8 | 94-121 | T3 | `localDraftCompareExchange…` tests store semantics through the bridge; has no named runner | Keep but register it (or the class) in `CLASS_REGISTRY` so it actually runs | Low |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `slotHash` | helper | 25-29 | ConnectionRoutes:51, CombinedAgent:26, DeviceAction:43 | `AlphaCredentialStore.slotHash` |
| `until`/`begin`/`result`/`invoke`/`ready` | helper | 30-48 | ClockAgentReview, CloudDelegationCallback, CloudVoice, DailyApps | `WebViewTestDriver.call` |
| inline HTTP peers | helper | 131-162, 221-258 | CloudVoice.Fixture, Hosted*.Fixture | `LoopbackHttp` |

## Proposed end state
Four tests kept (the three pinned phases + local drafts), the duplicate flag-off route test removed, helpers and the
loopback server shared, slot paths from the store. Estimated 287 -> ~200 lines.

## Verification
`python3 scripts/ci/test-pending-recovery-phases.py`; the three recovery-ui phases; `--classes ConnectionRoutes` after
moving the two URLs; `node --test test/native-secure-slots.test.mjs`.
