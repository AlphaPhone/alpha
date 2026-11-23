# android/app/src/main/java/ai/alphacompute/alphaphone/LocalAgentProviderAdmission.java
- Lines: 6 | Role: empty subclass of upstream `NativeProviderAdmission` that carries the installed slot name `PROVIDER_SLOT` and gives product code a local name for the upstream static rules | Verdict: KEEP (as the provider-slot constant owner)
- Importers: 8 main files (~70 references: `AlphaCredentialStore` ~40, `AlphaLocalAgentPlugin` ~20, `CalendarSyncBridge`, `AlphaVoiceCloudPlugin`, `AlphaConnectionPlugin`, `GmailBackground`, `KeyboardDictationCloud`, `LegacyCloudRecovery`). Text/path pins: 16 tests (`test/local-agent-provider-admission.test.mjs`, `test/product-character-host.test.mjs`, `legacy-cloud-recovery` fixtures …), 13 spec files incl. `specs/quint/native/manifest.json`, `specs/quint/services/manifest.json`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4 | D4 / P17 | "an empty subclass carrying one constant": all static calls (`LocalAgentProviderAdmission.admit/currentGeneration/sameCloudCredential…`) resolve to upstream `NativeProviderAdmission` through inheritance. | Optional: call `NativeProviderAdmission.*` directly and keep only the slot constant (in a `Slots` class). Low value vs ~70-site churn; do it only together with the P6 `Slots` constants class. | Low. |
| 2 | 5 | C6 | `PROVIDER_SLOT` exists but the same literal `"local-agent-provider:v1"` is still written 11× elsewhere (`AlphaLocalAgentPlugin` 4, `AlphaVoiceCloudPlugin` 4, `KeyboardDictationCloud` 2, `LegacyCloudRecovery` 1) plus generated `CloudDeployment.java:26` (emitted by `scripts/cloud-deployment.ts:79`). | Replace the 11 product literals with this constant. | None (same value). |
| 3 | 3 | D11 | Name says "Admission" but the class is a constant holder. | Rename only if the `Slots` class is introduced; otherwise leave. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `PROVIDER_SLOT` | const | 5 | 11 literal copies (finding 2); `CloudDeployment.java:26` | here or `Slots` |

## Proposed end state
Unchanged (6 lines); literal duplicates elsewhere replaced by `PROVIDER_SLOT`.

## Verification
`test/local-agent-provider-admission.test.mjs`, `test/agent-always-local.test.mjs`, Quint credential traces.
