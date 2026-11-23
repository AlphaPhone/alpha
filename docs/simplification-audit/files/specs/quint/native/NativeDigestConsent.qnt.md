# specs/quint/native/NativeDigestConsent.qnt
- Lines: 205 | Kind: Quint model (live, `native` manifest; JVM refinement harness with a product slice) | Verdict: KEEP; PORT the `HostedDelivery` slice
- Covers: durable per-owner digest consent (scope, expiry ≤ 1 week, revoke), exact Calendar source identity, projected Calendar/Reminder reads that return no payload on refusal and re-check consent after held reads. Duplicates: none (renderer digest models are in `application`). Callers/importers: `native/manifest.json` (8 tests, 5 invariants), harness `refinement/native/native-digest.mjs` + `native-digest-platform.mjs`; `test/quint-native-digest-consent.test.mjs`; native aggregate; README `:849`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness | T10 | `native-digest-platform.mjs:15-18,87` slices `HostedDelivery.java` from `' interface NativeSourceWork'` to `' private JSONObject active()'` (asserts it contains `t.verify();`). Digest source work lives inside the hosted-delivery class, which Q-HOST-1/android-14 plan to shrink to resident-only. | PORT: move `NativeSourceWork` (and its helper) into `NativeDigestHost`/`NativeDigestSources` or its own file; compile that whole. Do it with the `HostedDelivery` resident-only change. | H: the planned `HostedDelivery` edit breaks the anchors |
| 2 | manifest | - | `NativeDigestSources.java`, `NativeDigestHost.java`, `HostedDelivery.java`, `HostedResultNotices.java` are live. B42/B45 (test-only overloads, unreachable re-check) touch these files but not the modelled behaviour. | None. | - |
| 3 | test wrapper | T4, B5 | Run twice; pins `traces 18`, `observedFields 24`. | One runner; `> 0`. | L |

## Proposed end state
Unchanged model; harness compiles a digest-owned class instead of a slice of `HostedDelivery.java`.
