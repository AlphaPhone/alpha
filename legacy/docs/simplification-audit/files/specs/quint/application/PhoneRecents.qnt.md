# specs/quint/application/PhoneRecents.qnt
- Lines: 149 | Kind: Quint model (live; import-based trace replay in test/) | Verdict: KEEP
- Covers: Phone on the Alpha image: call-log rows only while Phone is foreground, prompt only from the Allow control, dial is one handoff per showing, stale results dropped. Duplicates: test/browser/aosp-telephony-views.spec.ts (journey). Callers/importers: manifest row (phone-adapter.ts, aosp-telephony.ts, aosp-image.ts; 13 symbol pins incl. `async function refresh`); test/quint-phone-recents.test.mjs bundles phone-adapter.ts with esbuild + stubs and replays simulator traces (shell-model-traces.mjs)

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | test | - | Exemplary binding: imports the real adapter, stubs only platform modules, replays model traces. | Keep; it is the template for PORTs. | L |
| 2 | manifest symbols | T10 | Symbols `available`, `clear`, `sync`, `epoch`, `session` are closure locals; `async function refresh` includes the keyword. | Drop symbol pins. | L |
| 3 | phone-adapter | A7 | B211 (unbound `phoneRows`, `nativeRows`…) and B180 (`view.reply = () => null`) are in the modeled file; not modeled, so deleting them does not affect this model. | - | L |

## Proposed end state
Unchanged; file pins only.
