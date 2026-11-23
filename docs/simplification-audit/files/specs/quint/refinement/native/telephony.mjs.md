# specs/quint/refinement/native/telephony.mjs
- Lines: 343 | Kind: Quint refinement harness importing **real TypeScript modules** (esbuild bundle) | Verdict: KEEP (SIMPLIFY)
- Covers: five live models — `MessageThreads` (`runtime/message-draft.ts`), `Voicemail` (`runtime/voicemail-state.ts`), `TelephonyAttention` (`prototype/telephony-presenters.ts`), `PhoneCalls` and `ContactsBook` (`runtime/telephony-executor.ts`) — by driving the actual exported functions with controlled ports and comparing observed fields per step. Duplicates: none for the model claims; `test/contacts-adapter.test.mjs` (REWRITE per its report) covers the Contacts view side. No per-model test: run only by `index.mjs` → `test/quint-native-refinement.test.mjs`. Callers/importers: `index.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 12-22 | – | Imports real modules; no text slicing. This is the shape the T10 ports should copy. | Keep. | – |
| 2 | 16-19 | – (efficiency)/B5 | `build()` runs twice per check: once to discover inputs for hashing, once to compile. `telephony-executor.ts` is bundled four times across `checkTelephonyPhoneCalls` and `checkTelephonyContactsBook`; ten esbuild runs per aggregate. | Build once, hash `metafile.inputs` from the same result; memoise per entry. | L |
| 3 | 12-22 | C3/C5 | `capture()` is a second "bundle a product module and import it" loader; `refinement/application/notes-files-media-itf.mjs:70 loadProductModule` is the other (with stubs/rewrite). | One loader in `refinement/support/load-product-module.mjs` used by telephony, video, speech-cleanup and update-staging. | L |
| 4 | 13 | bug | `resolve('.')` uses the process cwd as repository root. | Use the repository root from `java.mjs`/`assistant-model-traces.mjs`. | L |
| 5 | 191,334 | A8 | Assumption strings say row text is "covered by unit tests" and point at `test/contacts-adapter.test.mjs`, which the test review rewrites into a journey. | Point at the journey spec once it exists, or drop the cross-reference. | L |
| 6 | 338-343 | A7 | CLI entry; nothing invokes it. | Delete. | L |
| 7 | – | D11 | Renderer models live in the native family (`specs/quint/native/*.qnt`). | Leave; note in README. | – |

## Proposed end state
Same five checks; shared loader, one build per module, root-relative paths, no CLI (~320 lines). Lane:
`apps/app/src/runtime/{message-draft,voicemail-state,telephony-executor}.ts`, `prototype/telephony-presenters.ts` and
their bundle inputs, the five `.qnt` files.
