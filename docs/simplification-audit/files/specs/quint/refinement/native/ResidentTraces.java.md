# specs/quint/refinement/native/ResidentTraces.java
- Lines: 31 | Kind: Quint refinement harness of **upstream-only** code (`vendor/eliza/plugins/plugin-native-agent/.../NativeProviderAdmission.java` driven through the vendor's own test fixture `NativeProviderAdmissionTest.Store`) | Verdict: KEEP, gated on `upstream.lock.json` (upstream follow-up: move to `vendor/eliza`, D14)
- Covers: binding the Cloud provider succeeds only for an unexpired credential of the same identity and refuses on identity failure, compare/exchange conflict, credential replaced after admission, storage failure, expiry. Duplicates: vendor `plugin-native-agent/test/provider-admission/{NativeProviderAdmissionTest.java,provider-admission.node.mjs}` test the same function upstream; this file only adds the trace projection for model `ResidentRuntime`. Callers/importers: `index.mjs` `extraGroups` entry `['ResidentTraces.java', [NativeProviderAdmission.java, NativeProviderAdmissionTest.java], 'ai.eliza.plugins.agent.runtime.ResidentTraces']` (native aggregate only; no per-model test).
- Model live: `ResidentRuntime` (also refined by `ResidentCoordinatorTraces` on the product plugin).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1, index `:81-84` | P6 / §2.9 | Sources are entirely `vendor/eliza`; the result can change only on a pin bump, yet it runs on every native refinement. | Run this group only when `upstream.lock.json` changes (CI path filter); list "move upstream" as a D14 follow-up. | low |
| 2 | 18 | — | `trace.macro("resident binding precondition", ..., start, started 0, beginBinding)` labels three model actions that the harness does not execute (precondition projection). | Keep; the label says so. | none |
| 3 | 25-26 | B1 | `catch (CloudBindingFailure expected) { }` records failure as `success=false`. This is the specified observation, not a swallowed error. | Keep; add `// observed as bindingResult false`. | none |

## Proposed end state
Unchanged file; scheduled only on upstream pin changes. Path filter: `upstream.lock.json`, `specs/quint/native/ResidentRuntime.qnt`, this file, `Trace.java`, `java.mjs`.
