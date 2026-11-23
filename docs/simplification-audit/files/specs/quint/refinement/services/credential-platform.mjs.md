# specs/quint/refinement/services/credential-platform.mjs
- Lines: 60 | Kind: Quint refinement support (writes hand-written Java port stubs to a temp dir for javac) | Verdict: KEEP (fold into `credentials.mjs` when touched)
- Covers: supplies fake `Context`, `AtomicFile`, upstream `JsonCredentialSlots` and product `AlphaLocalAgentPlugin` / `AlphaConnectionPlugin` classes so the real `AlphaCredentialStore` compiles and runs on a host JVM. Duplicates: the same temp-dir-of-Java-stubs pattern in `native/*-platform.mjs` files. Importers: `services/credentials.mjs` only (grep of specs/test/scripts).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 28-42 | T10 (signature pin) | The `AlphaLocalAgentPlugin` stub re-declares 12 static members of the product class by name and signature (`mutateCredentials`, `withCredentialAuthority`, `reserveCredentialIntent`, ...). Any rename or signature change in the product class breaks compilation of the harness, not of the product. That is the intended coupling (javac checks it) but it is a hand-maintained shadow of product API. | Keep; when `AlphaLocalAgentPlugin` is split (D1 god module), move the credential-authority statics into one small class the harness can compile for real instead of stubbing. | Medium |
| 2 | 46-48 | C4 | Temp-dir creation + `mkdirSync`/`writeFileSync` loop + `close()` is the same boilerplate as other `*-platform.mjs` stub writers. | Share one `writeJavaStubs(files)` helper in `refinement/native/java.mjs`. | Low |
| 3 | 1-60 | — | 60-line file with one importer. | Inline into `credentials.mjs` if the shared helper lands (it becomes a constant map). | Low |

## Proposed end state
A `const stubs = {...}` map inside `credentials.mjs`, written by a shared `java.mjs` helper. The product-class stub shrinks once credential authority leaves `AlphaLocalAgentPlugin`.
