# test/browser/provider-key-reconnect.production.spec.ts
- Lines: 71 | Kind: Playwright, `production` project, real UI over `flag-off-android.ts` with a wrapped `nativePromise` for provider-key methods; 2 generated tests (edit, remove) | Verdict: **MERGE** into `journeys/connection-cloud.spec.ts` (production project, "Own keys" section)
- Covers: editing or removing the Own Voice key while `Agent.start` is held (status already published with the new revision) does not cancel the start, closes the key editor, leaves the AI connection sheet consistent ("Added"/"Not added"), never echoes the key, and leaves Talk enabled. Duplicates: none found; other key specs (`provider-keys*`, other chunks) do not hold the reconnect. Callers/importers: none; imports `fenceNetwork`, `flagOffAndroid`, `residentHome`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 14-16 | C3 / B2 | Pushes missing Agent methods and an `AlphaHostedResults` header into `PluginHeaders` "if absent". The shared bridge should declare the real Agent surface once. | Declare `prepareProviderConfiguration`, `cancelProviderConfiguration`, `editProviderKeys`, `removeProviderKey`, `cancelStart` in `harness/plugins/agent.ts`; keep only the revision/lease logic here as an override. | Low |
| 2 | 43, 56 | T6-lite | Hold/release through `window.keyReconnect`. Acceptable: it is the native boundary. | Keep. | none |
| 3 | 35 | – | Two cases, cheap, distinct. | Carry both. | none |

## Proposed end state
A `describe('Own keys reconnect')` block in `journeys/connection-cloud.spec.ts` (production) with the edit/remove loop, using the
shared Agent plugin fixture plus a 15-line provider-key override. Assertions unchanged.
