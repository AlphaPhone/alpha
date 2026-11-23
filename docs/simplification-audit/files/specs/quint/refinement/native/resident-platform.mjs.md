# specs/quint/refinement/native/resident-platform.mjs
- Lines: 413 | Kind: Android/Capacitor/product stub set for compiling the whole `AlphaLocalAgentPlugin` (38 stub files; no product text read) | Verdict: KEEP content; MERGE generic classes into a shared stub library; replace text-rewrite hooks with port classes
- Covers: External ports for the resident plugin: Context/SharedPreferences/Intent, KeyguardManager, Process, Log, Capacitor Plugin/PluginCall/JSObject, secure-store slots, and throwing stand-ins for `ElizaAgentService`, `AlphaConnectionPlugin`, `AlphaVoiceCloudPlugin`, `MainActivity`, notifications, `RuntimeUpdatePause`, `LiveSegmentPipe`, `ResidentResultSession`. Duplicates: generic Android/Capacitor stubs in the other `*-platform.mjs`. Callers/importers: `resident-coordinator.mjs`, `credential-coordinator.mjs`, `credential-coordinator-platform.mjs`, `resident-scheduling-service-admission.mjs`, `resident-start-cancel.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | T10 (stub coupling) | `resident-scheduling-service-admission.mjs:29-39` and `resident-start-cancel.mjs:12-23` rewrite this file's stub text by exact strings and regexes (`'    return null;\n  }'`, `'return true;'`, `'    ResidentTestPorts.start();'`, `hasWindowFocus`, `reserveCredentialShutdown`…). Whitespace here is load-bearing for two other harnesses. | Have each stub delegate to a static hook in `ResidentTestPorts` (or a `Ports` interface) that harnesses set at runtime; delete every text rewrite. | Medium |
| 2 | 308-316 | A3/D5 | `AlphaConnectionPlugin.readCloudIdentity` and other cloud/pairing stand-ins exist because the plugin still references them; delete with the hosted/paired product code (C4). | Follow the product deletion (the compile shows which stubs are dead). | Low |
| 3 | whole | C5 | Generic Android/Capacitor classes duplicated across platforms. | Shared stub library. | Medium |
| 4 | 404-412 | C5 | Temp-dir boilerplate. | Shared helper. | None |

## Proposed end state
Resident-specific stand-ins (~200 lines) on the shared stub set, each port routed through `ResidentTestPorts` so no harness edits stub text.
