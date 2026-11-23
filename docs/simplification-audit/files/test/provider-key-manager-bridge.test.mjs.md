# test/provider-key-manager-bridge.test.mjs
- Lines: 61 | Kind: transplant (slices `parseProviderStatus` … `managedProviderStatus` … from `local-agent.ts` by comment markers, esbuild-transforms and evals with `new Function` and a fake `Capacitor`) | Verdict: REWRITE as `test/integration/connection-cloud.test.ts` cases on the real `local-agent.ts` exports
- Covers: the saved-key manager (edit/remove/reveal/select) sends only the keys the owner touched, refuses stale revisions before reserving a native lease, refuses raw key values from native reveal, and refuses legacy/malformed status. Duplicates: `test/browser/provider-key-reconnect.production.spec.ts` (Own Voice edit/remove through a real reconnect); `provider-configuration-cancellation.test.mjs` (lease cancel). Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-12 | T2 | Two slices cut at `'/** The native bridge verifies'` and `'/** Retires the stored binding;'`, `export async function` rewritten, `record()` re-implemented inline. | Import `selectLocalProvider`, `editLocalProviderKeys`, `removeLocalProviderKey`, `revealLocalProviderKey`, `parseProviderStatus` and inject the native plugin through the typed `native/` module (C2). | Medium |
| 2 | 21-26 | A1 | "legacy status stays readable" case: a status without `keys` from an older native build. The APK and renderer ship together; no older native can answer. | Delete with the legacy branch in `parseProviderStatus` (product chunk). | Low |
| 3 | 27-54 | keep | Text-only edit, empty fields refused, remove keeps the other key, stale revision refused before lease, native reveal never returns the raw value. | Keep as integration cases. | Low |
| 4 | 55-61 | T4 | Cancel before lease duplicates `provider-configuration-cancellation.test.mjs:34-38`. | Keep once. | Low |

## Proposed end state
Five cases in `test/integration/connection-cloud.test.ts` calling the real exports with a fake native provider port:
text-only edit; empty field refused; remove keeps the other key; stale revision refused before lease; reveal returns
only the acknowledgement. File deleted.
