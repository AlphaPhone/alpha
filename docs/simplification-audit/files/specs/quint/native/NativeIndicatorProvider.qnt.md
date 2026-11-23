# specs/quint/native/NativeIndicatorProvider.qnt
- Lines: 98 | Kind: Quint model (live, `native` manifest; upstream-only sources) | Verdict: KEEP (D7 always-on listening; upstream lane)
- Covers: the Sense `IndicatorLeaseProvider.call` boundary: lease generation owns the Binder death link, replacement/revoke/expiry/other-boot end the lease, caller identity restored after every call. Duplicates: `AlwaysOnListenerIndicatorReadback` (audit twin of `AlwaysOnListener`, research §2.11) covers the renderer readback, not this provider. Callers/importers: `native/manifest.json` (6 tests, 4 invariants, no `bounds`), harness `refinement/native/indicator-provider.mjs` + `indicator-provider-platform.mjs` (`IndicatorProviderProbe.java`, `ProviderPorts.java`); `test/quint-indicator-provider.test.mjs` (41 lines, 360 s timeout); native aggregate; README `:351`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | manifest | P6 | Sources are upstream `vendor/eliza/packages/app/platforms/android/sense/...` plus `android/sense/build.gradle`. | Upstream-pin lane (+ `android/sense/**`). | L |
| 2 | 6, 17, 82, 92 | - | `identities` is never changed by any action, so `CallerIdentityRestored` is trivially true in the model; it only constrains the harness observation (the probe counts unrestored `clearCallingIdentity` calls). | Add a one-line comment that the field is an observed projection, or drop it from the model and assert it in the harness. | L |
| 3 | test wrapper | T4 | Run twice. | One runner. | L |

## Proposed end state
Unchanged model (optionally the comment), executed only when the upstream pin, `android/sense/**` or its harness changes.
